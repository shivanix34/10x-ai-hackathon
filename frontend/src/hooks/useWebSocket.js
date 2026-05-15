import { useState, useEffect, useCallback, useRef } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/ws`

export function useWebSocket(sellerID = null, channels = []) {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    let url = WS_URL
    const params = []
    if (sellerID) params.push(`seller_id=${sellerID}`)
    if (channels.length) params.push(`channels=${channels.join(',')}`)
    if (params.length) url += '?' + params.join('&')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        setLastMessage(msg)
        setMessages(prev => [msg, ...prev].slice(0, 100))
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [sellerID, channels.join(',')])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { messages, lastMessage, connected, send }
}
