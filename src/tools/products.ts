import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PromApiClient } from '../services/PromApiClient.js';
import type { PromProduct } from '../types.js';
import { CHARACTER_LIMIT } from '../constants.js';

function formatProduct(p: PromProduct): string {
  return [
    `Product #${p.id}${p.external_id ? ` (ext: ${p.external_id})` : ''}`,
    `Name: ${p.name}`,
    p.sku ? `SKU: ${p.sku}` : null,
    `Price: ${p.price} ${p.currency || 'UAH'}`,
    p.discount ? `Discount: ${p.discount}%` : null,
    `Active: ${p.is_active ? 'Yes' : 'No'}`,
    `In stock: ${p.in_stock ? 'Yes' : 'No'}`,
    p.quantity_in_stock != null ? `Quantity: ${p.quantity_in_stock}` : null,
    p.category ? `Category: ${p.category.caption}` : null,
    p.group ? `Group: ${p.group.name}` : null,
    p.status ? `Status: ${p.status}` : null,
    p.keywords ? `Keywords: ${p.keywords}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function registerProductTools(server: McpServer, getClient: () => PromApiClient): void {
  // ─── List Products ───────────────────────────────────────────────────────────
  server.registerTool(
    'prom_list_products',
    {
      title: 'List Prom.ua Products',
      description: `Retrieve a paginated list of products from your Prom.ua store.

Args:
  - page (number): Page number starting from 1 (default: 1)
  - per_page (number): Items per page, 1–100 (default: 20)
  - group_id (number): Optional filter by product group/category ID
  - status (string): Filter by product status (e.g., "on_display", "draft", "archival")

Returns: Products with id, name, price, stock, sku, status, category.

Examples:
  - List first page of products → page=1, per_page=20
  - Products in group → group_id=12345`,
      inputSchema: z
        .object({
          page: z.number().int().min(1).default(1).describe('Page number (starts at 1)'),
          per_page: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .describe('Products per page (max 100)'),
          group_id: z.number().int().positive().optional().describe('Filter by group/category ID'),
          status: z
            .string()
            .optional()
            .describe('Filter by status: on_display, draft, archival, deleted'),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ page, per_page, group_id, status }) => {
      const client = getClient();
      const data = await client.listProducts({ page, per_page, group_id, status });
      const products = data.products || [];

      if (products.length === 0) {
        return { content: [{ type: 'text', text: 'No products found.' }] };
      }

      let text = `Found ${products.length} product(s) (page ${page}):\n\n` +
        products.map(formatProduct).join('\n\n---\n\n');

      if (text.length > CHARACTER_LIMIT) {
        text = text.slice(0, CHARACTER_LIMIT) + '\n\n[Response truncated — use per_page/page to narrow results]';
      }

      return { content: [{ type: 'text', text }] };
    }
  );

  // ─── Get Product ─────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_get_product',
    {
      title: 'Get Prom.ua Product',
      description: `Get full details of a specific product by its ID.

Args:
  - product_id (number): The numeric Prom.ua product ID

Returns: All product details including price, stock, description, images, category.`,
      inputSchema: z
        .object({
          product_id: z.number().int().positive().describe('Prom.ua product ID'),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ product_id }) => {
      const client = getClient();
      const data = await client.getProduct(product_id);
      const product = data.product;
      return {
        content: [{ type: 'text', text: formatProduct(product) }],
      };
    }
  );

  // ─── Edit Product ────────────────────────────────────────────────────────────
  server.registerTool(
    'prom_edit_product',
    {
      title: 'Edit Prom.ua Product',
      description: `Update a product on Prom.ua by its numeric ID. Only provided fields are updated.

Args:
  - id (number): Prom.ua product ID (required)
  - price (number): New price in UAH
  - is_active (boolean): Whether product is visible
  - in_stock (boolean): Whether product is in stock
  - quantity_in_stock (number): Exact quantity in stock
  - discount (number): Discount percentage 0–99
  - name (string): Product display name
  - description (string): Product description (HTML allowed)
  - keywords (string): Search keywords
  - external_id (string): Your own external identifier

Returns: Updated product ID and status.

Examples:
  - Update price: id=12345, price=299.99
  - Mark out of stock: id=12345, in_stock=false
  - Deactivate: id=12345, is_active=false`,
      inputSchema: z
        .object({
          id: z.number().int().positive().describe('Prom.ua product ID to update'),
          price: z.number().positive().optional().describe('New price in UAH'),
          is_active: z.boolean().optional().describe('Set product visibility'),
          in_stock: z.boolean().optional().describe('Set in-stock status'),
          quantity_in_stock: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Set exact quantity in stock'),
          discount: z.number().int().min(0).max(99).optional().describe('Discount percent (0–99)'),
          name: z.string().min(1).max(500).optional().describe('Product name'),
          description: z.string().max(10000).optional().describe('Product description (HTML ok)'),
          keywords: z.string().max(1000).optional().describe('Comma-separated search keywords'),
          external_id: z
            .string()
            .max(255)
            .optional()
            .describe('Your external system ID for this product'),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const client = getClient();
      const result = await client.editProduct(params);
      return {
        content: [
          {
            type: 'text',
            text:
              result.message ||
              `Product #${result.id} updated successfully (status: ${result.status})`,
          },
        ],
      };
    }
  );

  // ─── Edit Product By External ID ─────────────────────────────────────────────
  server.registerTool(
    'prom_edit_product_by_external_id',
    {
      title: 'Edit Prom.ua Product by External ID',
      description: `Update a product on Prom.ua by your own external identifier (e.g., your internal SKU or CRM ID).

Useful when you manage products in an external system and sync to Prom.ua.

Args:
  - external_id (string): Your external product identifier (must be set on the product first)
  - price (number): New price in UAH
  - is_active (boolean): Product visibility
  - in_stock (boolean): In-stock status
  - quantity_in_stock (number): Exact quantity
  - discount (number): Discount percent 0–99

Returns: Updated product ID and status.`,
      inputSchema: z
        .object({
          external_id: z.string().min(1).max(255).describe('Your external product identifier'),
          price: z.number().positive().optional().describe('New price in UAH'),
          is_active: z.boolean().optional().describe('Set product visibility'),
          in_stock: z.boolean().optional().describe('Set in-stock status'),
          quantity_in_stock: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Set exact quantity in stock'),
          discount: z.number().int().min(0).max(99).optional().describe('Discount percent (0–99)'),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const client = getClient();
      const result = await client.editProductByExternalId(params);
      return {
        content: [
          {
            type: 'text',
            text:
              result.message ||
              `Product (ext: ${params.external_id}) updated successfully (status: ${result.status})`,
          },
        ],
      };
    }
  );
}
