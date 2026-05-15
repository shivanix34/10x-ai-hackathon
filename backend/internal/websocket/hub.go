package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	sellerID int64
	channels map[string]bool
}

type Hub struct {
	clients    map[*Client]bool
	sellers    map[int64]map[*Client]bool
	channels   map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		sellers:    make(map[int64]map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.sellerID > 0 {
				if h.sellers[client.sellerID] == nil {
					h.sellers[client.sellerID] = make(map[*Client]bool)
				}
				h.sellers[client.sellerID][client] = true
			}
			for ch := range client.channels {
				if h.channels[ch] == nil {
					h.channels[ch] = make(map[*Client]bool)
				}
				h.channels[ch][client] = true
			}
			h.mu.Unlock()
			log.Printf("[WS] Client connected (seller=%d, channels=%v, total=%d)", client.sellerID, client.channels, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				if client.sellerID > 0 {
					delete(h.sellers[client.sellerID], client)
				}
				for ch := range client.channels {
					delete(h.channels[ch], client)
				}
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[WS] Client disconnected (seller=%d, total=%d)", client.sellerID, len(h.clients))
		}
	}
}

func (h *Hub) BroadcastToSeller(sellerID int64, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.sellers[sellerID]; ok {
		for client := range clients {
			select {
			case client.send <- data:
			default:
				close(client.send)
				delete(clients, client)
			}
		}
	}
}

func (h *Hub) BroadcastToChannel(channel string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.channels[channel]; ok {
		for client := range clients {
			select {
			case client.send <- data:
			default:
				close(client.send)
				delete(clients, client)
			}
		}
	}
}

func (h *Hub) BroadcastAll(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
}

func (h *Hub) GetConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// HandleWS upgrades HTTP to WebSocket
func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}

	// Parse query params for seller_id and channels
	sellerIDStr := r.URL.Query().Get("seller_id")
	sellerID, _ := strconv.ParseInt(sellerIDStr, 10, 64)
	channelParam := r.URL.Query().Get("channels")

	channels := make(map[string]bool)
	if channelParam != "" {
		for _, ch := range splitChannels(channelParam) {
			channels[ch] = true
		}
	}

	client := &Client{
		hub:      h,
		conn:     conn,
		send:     make(chan []byte, 256),
		sellerID: sellerID,
		channels: channels,
	}

	h.register <- client
	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		// Handle incoming messages (e.g., subscribe to channels)
		var msg map[string]interface{}
		if json.Unmarshal(message, &msg) == nil {
			if msgType, ok := msg["type"].(string); ok && msgType == "subscribe" {
				if ch, ok := msg["channel"].(string); ok {
					c.channels[ch] = true
					c.hub.mu.Lock()
					if c.hub.channels[ch] == nil {
						c.hub.channels[ch] = make(map[*Client]bool)
					}
					c.hub.channels[ch][c] = true
					c.hub.mu.Unlock()
				}
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func splitChannels(s string) []string {
	var result []string
	current := ""
	for _, c := range s {
		if c == ',' {
			if current != "" {
				result = append(result, current)
			}
			current = ""
		} else {
			current += fmt.Sprintf("%c", c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
