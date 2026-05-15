export class LiveStream {
  constructor() {
    this.handlers = new Map();
    this.ws = null;
    this.reconnectAttempt = 0;
    this.connect();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  emit(event, data) {
    for (const h of (this.handlers.get(event) || [])) h(data);
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit('open', {});
    };

    this.ws.onmessage = (msg) => {
      try {
        const { event, data } = JSON.parse(msg.data);
        this.emit(event, data);
      } catch (e) { console.error('ws parse error:', e); }
    };

    this.ws.onclose = () => {
      this.emit('close', {});
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
      this.reconnectAttempt++;
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = (e) => console.error('ws error:', e);
  }
}
