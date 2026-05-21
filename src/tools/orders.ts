import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PromApiClient } from '../services/PromApiClient.js';
import { ORDER_STATUSES, CANCELLATION_REASONS } from '../constants.js';
import type { PromOrder } from '../types.js';

function formatOrder(order: PromOrder): string {
  const clientName = [
    order.client_first_name,
    order.client_second_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const items = order.products
    .map((p) => `  - ${p.name} x${p.quantity} @ ${p.price} UAH = ${p.total_price} UAH`)
    .join('\n');

  return [
    `Order #${order.id}`,
    `Status: ${order.status}`,
    `Date: ${order.date_created}`,
    `Client: ${clientName || order.client?.name || 'Unknown'}`,
    order.client?.email ? `Email: ${order.client.email}` : null,
    order.client?.phone ? `Phone: ${order.client.phone}` : null,
    order.client_notes ? `Notes: ${order.client_notes}` : null,
    `Payment: ${order.payment_method || 'N/A'}`,
    `Total: ${order.full_price} UAH`,
    order.delivery_option?.delivery_method
      ? `Delivery: ${order.delivery_option.delivery_method}`
      : null,
    order.delivery_option?.declaration_number
      ? `TTN: ${order.delivery_option.declaration_number}`
      : null,
    order.address?.full_address ? `Address: ${order.address.full_address}` : null,
    `Items:\n${items}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function registerOrderTools(server: McpServer, getClient: () => PromApiClient): void {
  // ─── List Orders ────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_list_orders',
    {
      title: 'List Prom.ua Orders',
      description: `Retrieve a list of orders from your Prom.ua store.

Returns orders with client info, items, total price, status, and delivery details.

Args:
  - limit (number): Max orders to return, 1–100 (default: 20)
  - date_from (string): Filter orders from date in ISO format (e.g., "2024-01-01")
  - date_to (string): Filter orders to date in ISO format
  - status (string): Filter by order status: ${ORDER_STATUSES.join(', ')}

Returns: List of orders with id, status, client, products, totals, delivery info.

Examples:
  - "Show recent orders" → no filters
  - "Show pending orders" → status="pending"
  - "Orders from January" → date_from="2024-01-01", date_to="2024-01-31"`,
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(20).describe('Max orders to return'),
          date_from: z
            .string()
            .optional()
            .describe('Start date filter in ISO format (e.g., 2024-01-15)'),
          date_to: z
            .string()
            .optional()
            .describe('End date filter in ISO format (e.g., 2024-01-31)'),
          status: z
            .enum(ORDER_STATUSES)
            .optional()
            .describe(`Filter by status: ${ORDER_STATUSES.join(', ')}`),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ limit, date_from, date_to, status }) => {
      const client = getClient();
      const data = await client.listOrders({ limit, date_from, date_to, status });
      const orders = data.orders || [];

      if (orders.length === 0) {
        return { content: [{ type: 'text', text: 'No orders found matching the filters.' }] };
      }

      const text = orders.map(formatOrder).join('\n\n---\n\n');
      return {
        content: [{ type: 'text', text: `Found ${orders.length} order(s):\n\n${text}` }],
      };
    }
  );

  // ─── Get Order ───────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_get_order',
    {
      title: 'Get Prom.ua Order',
      description: `Get full details of a specific order by its ID.

Args:
  - order_id (number): The numeric order ID from Prom.ua

Returns: Complete order details including client info, all items, delivery, payment.`,
      inputSchema: z
        .object({
          order_id: z.number().int().positive().describe('Prom.ua order ID'),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ order_id }) => {
      const client = getClient();
      const order = await client.getOrder(order_id);
      return {
        content: [{ type: 'text', text: formatOrder(order) }],
      };
    }
  );

  // ─── Set Order Status ────────────────────────────────────────────────────────
  server.registerTool(
    'prom_set_order_status',
    {
      title: 'Set Prom.ua Order Status',
      description: `Change the status of one or more orders on Prom.ua.

Args:
  - ids (number[]): List of order IDs to update
  - status (string): New status: ${ORDER_STATUSES.join(', ')}
  - cancellation_reason (string): Required only when status="canceled"
  - cancellation_text (string): Optional explanation for cancellation

Returns: Lists of processed and not-processed order IDs.

Examples:
  - Mark as received: ids=[123,124], status="received"
  - Cancel with reason: ids=[125], status="canceled", cancellation_reason="out_of_stock"`,
      inputSchema: z
        .object({
          ids: z
            .array(z.number().int().positive())
            .min(1)
            .describe('Order IDs to update (at least one required)'),
          status: z.enum(ORDER_STATUSES).describe('New order status'),
          cancellation_reason: z
            .enum(CANCELLATION_REASONS)
            .optional()
            .describe(
              `Required when status=canceled. Options: ${CANCELLATION_REASONS.join(', ')}`
            ),
          cancellation_text: z
            .string()
            .max(500)
            .optional()
            .describe('Optional additional cancellation explanation'),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ ids, status, cancellation_reason, cancellation_text }) => {
      const client = getClient();
      const result = await client.setOrderStatus({
        ids,
        status,
        ...(cancellation_reason ? { cancellation_reason } : {}),
        ...(cancellation_text ? { cancellation_text } : {}),
      });

      const lines: string[] = [`Status changed to "${status}"`];
      if (result.processed_ids?.length) {
        lines.push(`✓ Updated orders: ${result.processed_ids.join(', ')}`);
      }
      if (result.not_processed_ids?.length) {
        lines.push(`✗ Failed to update: ${result.not_processed_ids.join(', ')}`);
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // ─── Set Delivery Declaration ────────────────────────────────────────────────
  server.registerTool(
    'prom_set_order_delivery',
    {
      title: 'Set Prom.ua Order Delivery / TTN',
      description: `Add a Nova Poshta (or other carrier) tracking number (TTN / declaration number) to an order.

Args:
  - order_id (number): The order ID to update
  - declaration_number (string): The carrier tracking number (TTN)
  - delivery_type (string): Optional delivery service name

Returns: Confirmation message.`,
      inputSchema: z
        .object({
          order_id: z.number().int().positive().describe('Prom.ua order ID'),
          declaration_number: z
            .string()
            .min(1)
            .describe('Carrier tracking number (e.g. Nova Poshta TTN)'),
          delivery_type: z.string().optional().describe('Optional delivery service name'),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ order_id, declaration_number, delivery_type }) => {
      const client = getClient();
      const result = await client.setOrderDelivery(order_id, {
        declaration_number,
        ...(delivery_type ? { delivery_type } : {}),
      });
      return {
        content: [
          {
            type: 'text',
            text: result.message || `Delivery tracking #${declaration_number} set for order #${order_id}`,
          },
        ],
      };
    }
  );
}
