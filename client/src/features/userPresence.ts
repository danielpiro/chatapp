import { setupWebSocket } from "./websocketHandler";

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
  wsHandler: ReturnType<typeof setupWebSocket>,
  isTyping: boolean,
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
  wsHandler.sendTypingStatus(isTyping);
  setIsTyping(isTyping);
};
