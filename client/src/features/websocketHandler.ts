import { Message } from "./messageThreading";
import { User } from "./userPresence";

export interface WebSocketMessage {
  type: "message" | "userStatus" | "typing";
  message?: Message;
  users?: User[];
  sender?: string;
  status?: boolean;
}

export const setupWebSocket = (
  url: string,
  onMessage: (message: Message) => void,
  onUserStatusUpdate: (users: User[]) => void,
  onTypingStatusReceived: (sender: string, isTyping: boolean) => void
) => {
  let ws: WebSocket | null = null;

  const connect = () => {
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log("WebSocket is already connected or connecting");
      return;
    }

    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      switch (data.type) {
        case "message":
          if (data.message) {
            onMessage(data.message);
          }
          break;
        case "userStatus":
          if (data.users) {
            onUserStatusUpdate(data.users);
          }
          break;
        case "typing":
          if (data.sender !== undefined && data.status !== undefined) {
            onTypingStatusReceived(data.sender, data.status);
          }
          break;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  connect();

  return {
    sendMessage: (message: Message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "message", message }));
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    },
    sendTypingStatus: (sender: string, isTyping: boolean) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "typing", sender, status: isTyping }));
      } else {
        console.error("WebSocket is not open. Cannot send typing status.");
      }
    },
    close: () => {
      if (ws) {
        ws.close();
      }
    },
  };
};
