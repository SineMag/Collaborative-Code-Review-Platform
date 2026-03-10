import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

type EventPayload = {
  type: string;
  payload: unknown;
  userId?: string;
};

let wss: WebSocketServer | null = null;

export function initWebsocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket: WebSocket) => {
    socket.send(JSON.stringify({ type: "connected" }));
  });
}

export function broadcastEvent(event: EventPayload) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(event);

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
