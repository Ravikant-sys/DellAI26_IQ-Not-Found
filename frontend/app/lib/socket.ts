type SocketCallback = (data: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Record<string, SocketCallback[]> = {};
  private url: string = "ws://localhost:8000/ws";

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === "undefined") return;
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event_type || "log";
          
          // Trigger callbacks for this event type
          if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(cb => cb(payload));
          }
          // Also trigger general wildcard callbacks
          if (this.listeners["*"]) {
            this.listeners["*"].forEach(cb => cb(payload));
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      this.ws.onclose = () => {
        // Automatically reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };
    } catch (err) {
      console.error("WebSocket connection error:", err);
    }
  }

  on(event: string, callback: SocketCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: SocketCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }
}

export const socket = new SocketClient();
