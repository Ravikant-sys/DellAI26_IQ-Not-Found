class Redis:
    def __init__(self, *args, **kwargs):
        pass
    def publish(self, channel, message):
        print(f"[Redis Publish] Channel: {channel}, Message: {message}")
        try:
            # Broadcast to web socket logs
            from app.agents.workflow import broadcaster
            broadcaster.broadcast(f"[Redis Publish] Channel: {channel} | Message: {message}", "redis_alert")
        except Exception:
            pass
        return 1

def from_url(url, **kwargs):
    return Redis()

class RedisError(Exception):
    pass
