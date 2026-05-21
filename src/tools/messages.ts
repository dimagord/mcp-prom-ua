import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PromApiClient } from '../services/PromApiClient.js';
import type { PromMessage } from '../types.js';

function formatMessage(m: PromMessage): string {
  return [
    `Message #${m.id}`,
    `Chat: ${m.chat?.title || m.chat?.id || 'N/A'}`,
    `From: ${m.author?.name || 'Unknown'}${m.author?.is_company ? ' (seller)' : ' (buyer)'}`,
    `Date: ${m.date_created}`,
    `Read: ${m.is_read ? 'Yes' : 'No'}`,
    m.text ? `Text: ${m.text}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function registerMessageTools(server: McpServer, getClient: () => PromApiClient): void {
  // ─── List Messages ───────────────────────────────────────────────────────────
  server.registerTool(
    'prom_list_messages',
    {
      title: 'List Prom.ua Messages',
      description: `Retrieve recent messages/chats from your Prom.ua store.

Args:
  - limit (number): Max messages to return, 1–50 (default: 20)
  - from_id (number): Pagination cursor — return messages with ID less than this value

Returns: List of messages with sender, chat title, date, read status, text.`,
      inputSchema: z
        .object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .default(20)
            .describe('Max messages to return (1–50)'),
          from_id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Pagination: return messages with ID < from_id'),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ limit, from_id }) => {
      const client = getClient();
      const data = await client.listMessages({ limit, from_id });
      const messages = data.messages || [];

      if (messages.length === 0) {
        return { content: [{ type: 'text', text: 'No messages found.' }] };
      }

      const text = `Found ${messages.length} message(s):\n\n` +
        messages.map(formatMessage).join('\n\n---\n\n');

      return { content: [{ type: 'text', text }] };
    }
  );

  // ─── Get Chat ────────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_get_chat',
    {
      title: 'Get Prom.ua Chat',
      description: `Get all messages in a specific chat/conversation thread.

Args:
  - chat_id (number): The chat ID (from prom_list_messages)

Returns: All messages in the chat thread.`,
      inputSchema: z
        .object({
          chat_id: z.number().int().positive().describe('Prom.ua chat thread ID'),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ chat_id }) => {
      const client = getClient();
      const data = await client.getChat(chat_id);
      const messages = data.messages || [];

      if (messages.length === 0) {
        return { content: [{ type: 'text', text: `Chat #${chat_id} is empty.` }] };
      }

      const text = `Chat #${chat_id} — ${messages.length} message(s):\n\n` +
        messages.map(formatMessage).join('\n\n---\n\n');

      return { content: [{ type: 'text', text }] };
    }
  );

  // ─── Send Message ────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_send_message',
    {
      title: 'Send Prom.ua Message',
      description: `Send a message in a Prom.ua chat conversation (e.g., reply to a buyer).

Args:
  - chat_id (number): The chat ID to reply to (from prom_list_messages)
  - text (string): Message text to send (max 2000 characters)

Returns: ID of the sent message.

Examples:
  - Reply to buyer: chat_id=67890, text="Your order has been shipped!"`,
      inputSchema: z
        .object({
          chat_id: z.number().int().positive().describe('Chat ID to send the message in'),
          text: z.string().min(1).max(2000).describe('Message text content'),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ chat_id, text }) => {
      const client = getClient();
      const result = await client.sendMessage(chat_id, text);
      return {
        content: [{ type: 'text', text: `Message sent successfully (ID: ${result.id})` }],
      };
    }
  );
}
