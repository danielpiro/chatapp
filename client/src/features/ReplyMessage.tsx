import React from 'react';
import { Box, Typography } from '@mui/material';
import { Message } from '../features/messageThreading';

interface ReplyMessageProps {
  replyToMessage: Message | undefined;
}

const ReplyMessage: React.FC<ReplyMessageProps> = ({ replyToMessage }) => {
  if (!replyToMessage) return null;

  return (
    <Box sx={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', p: 1, borderRadius: 1, mb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Replying to {replyToMessage.sender}:
      </Typography>
      <Typography variant="body2" noWrap>
        {replyToMessage.content}
      </Typography>
    </Box>
  );
};

export default ReplyMessage;