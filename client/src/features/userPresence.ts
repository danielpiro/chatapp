// src/features/userPresence.ts

export interface User {
  name: string;
  status: "online" | "offline" | "typing";
}

export const updateUserStatus = (
  users: User[],
  name: string,
  status: "online" | "offline" | "typing"
): User[] => {
  return users.map((user) => (user.name === name ? { ...user, status } : user));
};

export const handleTyping = (
  ws: WebSocket | null,
  isTyping: boolean,
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (ws) {
    ws.send(JSON.stringify({ type: "typing", status: isTyping }));
  }
  setIsTyping(isTyping);
};
