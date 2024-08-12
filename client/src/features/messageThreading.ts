// src/features/messageThreading.ts

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  replyTo?: string;
}

export const handleReply = (
  messageId: string,
  setReplyingTo: React.Dispatch<React.SetStateAction<string | null>>
) => {
  setReplyingTo(messageId);
};

export const createMessage = (
  sender: string,
  content: string,
  replyTo: string | null
): Message => {
  return {
    id: crypto.randomUUID(),
    sender,
    content,
    timestamp: new Date(),
    replyTo: replyTo || undefined,
  };
};
