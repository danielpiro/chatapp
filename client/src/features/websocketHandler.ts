import { Message } from "./messageThreading";
import { User } from "./userPresence";

export interface WebSocketMessage {
  type: "message" | "userStatus" | "typing";
  message?: Message;
  users?: User[];
  sender?: string;
  status?: boolean;
}

export interface WebSocketHandler {
  sendMessage: (message: Message) => void;
  sendTypingStatus: (isTyping: boolean) => void;
  close: () => void;
}

export const setupWebSocket = (
  url: string,
  onMessage: (message: Message) => void,
  onUserStatusUpdate: (users: User[]) => void,
  onTypingStatusReceived: (sender: string, isTyping: boolean) => void
) => {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isConnecting = false;

  const connect = () => {
    if (isConnecting) {
      console.log("Connection attempt already in progress");
      return;
    }

    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log("WebSocket is already connected or connecting");
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    isConnecting = true;
    console.log(`Attempting to connect to ${url}`);
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connection established");
      reconnectAttempts = 0;
      isConnecting = false;
    };

    ws.onmessage = (event) => {
      console.log("Received raw message:", event.data);
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log("Parsed message:", data);
        switch (data.type) {
          case "message":
            if (data.message) {
              console.log("Processing message:", data.message);
              onMessage({
                ...data.message,
                timestamp: new Date(data.message.timestamp),
              });
            } else {
              console.warn("Received message event with no message data");
            }
            break;
          case "userStatus":
            if (data.users) {
              console.log("Processing user status update:", data.users);
              onUserStatusUpdate(data.users);
            } else {
              console.warn("Received userStatus event with no users data");
            }
            break;
          case "typing":
            if (data.sender !== undefined && data.status !== undefined) {
              console.log(
                "Processing typing status:",
                data.sender,
                data.status
              );
              onTypingStatusReceived(data.sender, data.status);
            } else {
              console.warn("Received typing event with incomplete data");
            }
            break;
          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      if (event.code === 1000) {
        console.log("WebSocket connection closed gracefully");
      } else {
        console.log("WebSocket connection closed unexpectedly");
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const timeout = Math.pow(2, reconnectAttempts) * 1000;
          console.log(
            `Reconnecting in ${
              timeout / 1000
            } seconds (attempt ${reconnectAttempts} of ${maxReconnectAttempts})`
          );
          reconnectTimeout = setTimeout(connect, timeout);
        } else {
          console.log(
            `Exceeded maximum number of reconnection attempts (${maxReconnectAttempts}). Giving up.`
          );
          isConnecting = false;
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      isConnecting = false;
    };
  };

  connect();

  return {
    sendMessage: (message: Message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const data = JSON.stringify({
          type: "message",
          message: {
            ...message,
            timestamp: message.timestamp.toISOString(),
          },
        });
        console.log("Sending message:", data);
        ws.send(data);
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    },
    sendTypingStatus: (isTyping: boolean) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const data = JSON.stringify({ type: "typing", status: isTyping });
        console.log("Sending typing status:", data);
        ws.send(data);
      } else {
        console.error("WebSocket is not open. Cannot send typing status.");
      }
    },
    close: () => {
      console.log("Closing WebSocket connection");
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    },
  };
};
