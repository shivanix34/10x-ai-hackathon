package cache

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

func InitRedis() error {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	RDB = redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     "",
		DB:           0,
		PoolSize:     20,
		MinIdleConns: 5,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	for i := 0; i < 30; i++ {
		err := RDB.Ping(ctx).Err()
		if err == nil {
			log.Println("[REDIS] Connected to Redis")
			return nil
		}
		log.Printf("[REDIS] Waiting for Redis... attempt %d/30", i+1)
		time.Sleep(2 * time.Second)
	}

	return RDB.Ping(ctx).Err()
}

// AcquireLock attempts to acquire a distributed lock using Redis SETNX
func AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return RDB.SetNX(ctx, "lock:"+key, "1", ttl).Result()
}

// ReleaseLock releases a distributed lock
func ReleaseLock(ctx context.Context, key string) error {
	return RDB.Del(ctx, "lock:"+key).Err()
}

// TrackWSSession tracks a WebSocket session in Redis
func TrackWSSession(ctx context.Context, sellerID string) error {
	return RDB.SAdd(ctx, "ws:sessions", sellerID).Err()
}

// RemoveWSSession removes a WebSocket session
func RemoveWSSession(ctx context.Context, sellerID string) error {
	return RDB.SRem(ctx, "ws:sessions", sellerID).Err()
}

// GetWSSessionCount returns active WebSocket session count
func GetWSSessionCount(ctx context.Context) (int64, error) {
	return RDB.SCard(ctx, "ws:sessions").Result()
}
