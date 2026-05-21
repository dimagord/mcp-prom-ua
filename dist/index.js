#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_streamableHttp = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
var import_express = __toESM(require("express"));

// src/services/PromApiClient.ts
var import_axios = __toESM(require("axios"));

// src/constants.ts
var API_BASE_URL = "https://my.prom.ua/api/v1";
var CHARACTER_LIMIT = 5e4;
var ORDER_STATUSES = [
  "pending",
  "received",
  "delivered",
  "canceled",
  "draft",
  "paid"
];
var CANCELLATION_REASONS = [
  "out_of_stock",
  "wrong_price",
  "duplicate_order",
  "buyer_canceled",
  "other"
];

// src/services/PromApiClient.ts
var PromApiClient = class {
  constructor(token) {
    this.client = import_axios.default.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 3e4
    });
  }
  handleError(error) {
    if (import_axios.default.isAxiosError(error)) {
      const axiosError = error;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const errorMsg = data?.error || data?.message || axiosError.message;
      if (status === 401) {
        throw new Error("Authentication failed: Invalid or expired token. Please check your PROM_API_TOKEN.");
      }
      if (status === 403) {
        throw new Error("Access forbidden: Your token does not have permission for this operation.");
      }
      if (status === 404) {
        throw new Error(`Resource not found: ${errorMsg}`);
      }
      if (status === 429) {
        throw new Error("Rate limit exceeded: Too many requests. Please wait before retrying.");
      }
      throw new Error(`Prom API error (${status}): ${errorMsg}`);
    }
    throw new Error(`Unexpected error: ${String(error)}`);
  }
  // ─── Orders ────────────────────────────────────────────────────────────────
  async listOrders(params) {
    try {
      const response = await this.client.get("/orders/list", { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async setOrderStatus(body) {
    try {
      const response = await this.client.post("/orders/set_status", body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async setOrderDelivery(orderId, body) {
    try {
      const response = await this.client.post(
        `/orders/${orderId}/set_delivery`,
        body
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  // ─── Products ──────────────────────────────────────────────────────────────
  async listProducts(params) {
    try {
      const response = await this.client.get("/products/list", { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async getProduct(productId) {
    try {
      const response = await this.client.get(
        `/products/${productId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async editProduct(body) {
    try {
      const response = await this.client.post("/products/edit", body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async editProductByExternalId(body) {
    try {
      const response = await this.client.post(
        "/products/edit_by_external_id",
        body
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  // ─── Messages ──────────────────────────────────────────────────────────────
  async listMessages(params) {
    try {
      const response = await this.client.get("/messages/list", { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async getChat(chatId) {
    try {
      const response = await this.client.get(
        `/messages/${chatId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
  async sendMessage(chatId, text) {
    try {
      const response = await this.client.post(`/messages/${chatId}`, { text });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
};

// src/tools/orders.ts
var import_zod = require("zod");
function formatOrder(order) {
  const clientName = [
    order.client_first_name,
    order.client_second_name,
    order.client_last_name
  ].filter(Boolean).join(" ");
  const items = order.products.map((p) => `  - ${p.name} x${p.quantity} @ ${p.price} UAH = ${p.total_price} UAH`).join("\n");
  return [
    `Order #${order.id}`,
    `Status: ${order.status}`,
    `Date: ${order.date_created}`,
    `Client: ${clientName || order.client?.name || "Unknown"}`,
    order.client?.email ? `Email: ${order.client.email}` : null,
    order.client?.phone ? `Phone: ${order.client.phone}` : null,
    order.client_notes ? `Notes: ${order.client_notes}` : null,
    `Payment: ${order.payment_method || "N/A"}`,
    `Total: ${order.full_price} UAH`,
    order.delivery_option?.delivery_method ? `Delivery: ${order.delivery_option.delivery_method}` : null,
    order.delivery_option?.declaration_number ? `TTN: ${order.delivery_option.declaration_number}` : null,
    order.address?.full_address ? `Address: ${order.address.full_address}` : null,
    `Items:
${items}`
  ].filter(Boolean).join("\n");
}
function registerOrderTools(server, getClient) {
  server.registerTool(
    "prom_list_orders",
    {
      title: "List Prom.ua Orders",
      description: `Retrieve a list of orders from your Prom.ua store.

Returns orders with client info, items, total price, status, and delivery details.

Args:
  - limit (number): Max orders to return, 1\u2013100 (default: 20)
  - date_from (string): Filter orders from date in ISO format (e.g., "2024-01-01")
  - date_to (string): Filter orders to date in ISO format
  - status (string): Filter by order status: ${ORDER_STATUSES.join(", ")}

Returns: List of orders with id, status, client, products, totals, delivery info.

Examples:
  - "Show recent orders" \u2192 no filters
  - "Show pending orders" \u2192 status="pending"
  - "Orders from January" \u2192 date_from="2024-01-01", date_to="2024-01-31"`,
      inputSchema: import_zod.z.object({
        limit: import_zod.z.number().int().min(1).max(100).default(20).describe("Max orders to return"),
        date_from: import_zod.z.string().optional().describe("Start date filter in ISO format (e.g., 2024-01-15)"),
        date_to: import_zod.z.string().optional().describe("End date filter in ISO format (e.g., 2024-01-31)"),
        status: import_zod.z.enum(ORDER_STATUSES).optional().describe(`Filter by status: ${ORDER_STATUSES.join(", ")}`)
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ limit, date_from, date_to, status }) => {
      const client = getClient();
      const data = await client.listOrders({ limit, date_from, date_to, status });
      const orders = data.orders || [];
      if (orders.length === 0) {
        return { content: [{ type: "text", text: "No orders found matching the filters." }] };
      }
      const text = orders.map(formatOrder).join("\n\n---\n\n");
      return {
        content: [{ type: "text", text: `Found ${orders.length} order(s):

${text}` }]
      };
    }
  );
  server.registerTool(
    "prom_get_order",
    {
      title: "Get Prom.ua Order",
      description: `Get full details of a specific order by its ID.

Args:
  - order_id (number): The numeric order ID from Prom.ua

Returns: Complete order details including client info, all items, delivery, payment.`,
      inputSchema: import_zod.z.object({
        order_id: import_zod.z.number().int().positive().describe("Prom.ua order ID")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ order_id }) => {
      const client = getClient();
      const order = await client.getOrder(order_id);
      return {
        content: [{ type: "text", text: formatOrder(order) }]
      };
    }
  );
  server.registerTool(
    "prom_set_order_status",
    {
      title: "Set Prom.ua Order Status",
      description: `Change the status of one or more orders on Prom.ua.

Args:
  - ids (number[]): List of order IDs to update
  - status (string): New status: ${ORDER_STATUSES.join(", ")}
  - cancellation_reason (string): Required only when status="canceled"
  - cancellation_text (string): Optional explanation for cancellation

Returns: Lists of processed and not-processed order IDs.

Examples:
  - Mark as received: ids=[123,124], status="received"
  - Cancel with reason: ids=[125], status="canceled", cancellation_reason="out_of_stock"`,
      inputSchema: import_zod.z.object({
        ids: import_zod.z.array(import_zod.z.number().int().positive()).min(1).describe("Order IDs to update (at least one required)"),
        status: import_zod.z.enum(ORDER_STATUSES).describe("New order status"),
        cancellation_reason: import_zod.z.enum(CANCELLATION_REASONS).optional().describe(
          `Required when status=canceled. Options: ${CANCELLATION_REASONS.join(", ")}`
        ),
        cancellation_text: import_zod.z.string().max(500).optional().describe("Optional additional cancellation explanation")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ ids, status, cancellation_reason, cancellation_text }) => {
      const client = getClient();
      const result = await client.setOrderStatus({
        ids,
        status,
        ...cancellation_reason ? { cancellation_reason } : {},
        ...cancellation_text ? { cancellation_text } : {}
      });
      const lines = [`Status changed to "${status}"`];
      if (result.processed_ids?.length) {
        lines.push(`\u2713 Updated orders: ${result.processed_ids.join(", ")}`);
      }
      if (result.not_processed_ids?.length) {
        lines.push(`\u2717 Failed to update: ${result.not_processed_ids.join(", ")}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
  server.registerTool(
    "prom_set_order_delivery",
    {
      title: "Set Prom.ua Order Delivery / TTN",
      description: `Add a Nova Poshta (or other carrier) tracking number (TTN / declaration number) to an order.

Args:
  - order_id (number): The order ID to update
  - declaration_number (string): The carrier tracking number (TTN)
  - delivery_type (string): Optional delivery service name

Returns: Confirmation message.`,
      inputSchema: import_zod.z.object({
        order_id: import_zod.z.number().int().positive().describe("Prom.ua order ID"),
        declaration_number: import_zod.z.string().min(1).describe("Carrier tracking number (e.g. Nova Poshta TTN)"),
        delivery_type: import_zod.z.string().optional().describe("Optional delivery service name")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ order_id, declaration_number, delivery_type }) => {
      const client = getClient();
      const result = await client.setOrderDelivery(order_id, {
        declaration_number,
        ...delivery_type ? { delivery_type } : {}
      });
      return {
        content: [
          {
            type: "text",
            text: result.message || `Delivery tracking #${declaration_number} set for order #${order_id}`
          }
        ]
      };
    }
  );
}

// src/tools/products.ts
var import_zod2 = require("zod");
function formatProduct(p) {
  return [
    `Product #${p.id}${p.external_id ? ` (ext: ${p.external_id})` : ""}`,
    `Name: ${p.name}`,
    p.sku ? `SKU: ${p.sku}` : null,
    `Price: ${p.price} ${p.currency || "UAH"}`,
    p.discount ? `Discount: ${p.discount}%` : null,
    `Active: ${p.is_active ? "Yes" : "No"}`,
    `In stock: ${p.in_stock ? "Yes" : "No"}`,
    p.quantity_in_stock != null ? `Quantity: ${p.quantity_in_stock}` : null,
    p.category ? `Category: ${p.category.caption}` : null,
    p.group ? `Group: ${p.group.name}` : null,
    p.status ? `Status: ${p.status}` : null,
    p.keywords ? `Keywords: ${p.keywords}` : null
  ].filter(Boolean).join("\n");
}
function registerProductTools(server, getClient) {
  server.registerTool(
    "prom_list_products",
    {
      title: "List Prom.ua Products",
      description: `Retrieve a paginated list of products from your Prom.ua store.

Args:
  - page (number): Page number starting from 1 (default: 1)
  - per_page (number): Items per page, 1\u2013100 (default: 20)
  - group_id (number): Optional filter by product group/category ID
  - status (string): Filter by product status (e.g., "on_display", "draft", "archival")

Returns: Products with id, name, price, stock, sku, status, category.

Examples:
  - List first page of products \u2192 page=1, per_page=20
  - Products in group \u2192 group_id=12345`,
      inputSchema: import_zod2.z.object({
        page: import_zod2.z.number().int().min(1).default(1).describe("Page number (starts at 1)"),
        per_page: import_zod2.z.number().int().min(1).max(100).default(20).describe("Products per page (max 100)"),
        group_id: import_zod2.z.number().int().positive().optional().describe("Filter by group/category ID"),
        status: import_zod2.z.string().optional().describe("Filter by status: on_display, draft, archival, deleted")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ page, per_page, group_id, status }) => {
      const client = getClient();
      const data = await client.listProducts({ page, per_page, group_id, status });
      const products = data.products || [];
      if (products.length === 0) {
        return { content: [{ type: "text", text: "No products found." }] };
      }
      let text = `Found ${products.length} product(s) (page ${page}):

` + products.map(formatProduct).join("\n\n---\n\n");
      if (text.length > CHARACTER_LIMIT) {
        text = text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated \u2014 use per_page/page to narrow results]";
      }
      return { content: [{ type: "text", text }] };
    }
  );
  server.registerTool(
    "prom_get_product",
    {
      title: "Get Prom.ua Product",
      description: `Get full details of a specific product by its ID.

Args:
  - product_id (number): The numeric Prom.ua product ID

Returns: All product details including price, stock, description, images, category.`,
      inputSchema: import_zod2.z.object({
        product_id: import_zod2.z.number().int().positive().describe("Prom.ua product ID")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ product_id }) => {
      const client = getClient();
      const data = await client.getProduct(product_id);
      const product = data.product;
      return {
        content: [{ type: "text", text: formatProduct(product) }]
      };
    }
  );
  server.registerTool(
    "prom_edit_product",
    {
      title: "Edit Prom.ua Product",
      description: `Update a product on Prom.ua by its numeric ID. Only provided fields are updated.

Args:
  - id (number): Prom.ua product ID (required)
  - price (number): New price in UAH
  - is_active (boolean): Whether product is visible
  - in_stock (boolean): Whether product is in stock
  - quantity_in_stock (number): Exact quantity in stock
  - discount (number): Discount percentage 0\u201399
  - name (string): Product display name
  - description (string): Product description (HTML allowed)
  - keywords (string): Search keywords
  - external_id (string): Your own external identifier

Returns: Updated product ID and status.

Examples:
  - Update price: id=12345, price=299.99
  - Mark out of stock: id=12345, in_stock=false
  - Deactivate: id=12345, is_active=false`,
      inputSchema: import_zod2.z.object({
        id: import_zod2.z.number().int().positive().describe("Prom.ua product ID to update"),
        price: import_zod2.z.number().positive().optional().describe("New price in UAH"),
        is_active: import_zod2.z.boolean().optional().describe("Set product visibility"),
        in_stock: import_zod2.z.boolean().optional().describe("Set in-stock status"),
        quantity_in_stock: import_zod2.z.number().int().min(0).optional().describe("Set exact quantity in stock"),
        discount: import_zod2.z.number().int().min(0).max(99).optional().describe("Discount percent (0\u201399)"),
        name: import_zod2.z.string().min(1).max(500).optional().describe("Product name"),
        description: import_zod2.z.string().max(1e4).optional().describe("Product description (HTML ok)"),
        keywords: import_zod2.z.string().max(1e3).optional().describe("Comma-separated search keywords"),
        external_id: import_zod2.z.string().max(255).optional().describe("Your external system ID for this product")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const client = getClient();
      const result = await client.editProduct(params);
      return {
        content: [
          {
            type: "text",
            text: result.message || `Product #${result.id} updated successfully (status: ${result.status})`
          }
        ]
      };
    }
  );
  server.registerTool(
    "prom_edit_product_by_external_id",
    {
      title: "Edit Prom.ua Product by External ID",
      description: `Update a product on Prom.ua by your own external identifier (e.g., your internal SKU or CRM ID).

Useful when you manage products in an external system and sync to Prom.ua.

Args:
  - external_id (string): Your external product identifier (must be set on the product first)
  - price (number): New price in UAH
  - is_active (boolean): Product visibility
  - in_stock (boolean): In-stock status
  - quantity_in_stock (number): Exact quantity
  - discount (number): Discount percent 0\u201399

Returns: Updated product ID and status.`,
      inputSchema: import_zod2.z.object({
        external_id: import_zod2.z.string().min(1).max(255).describe("Your external product identifier"),
        price: import_zod2.z.number().positive().optional().describe("New price in UAH"),
        is_active: import_zod2.z.boolean().optional().describe("Set product visibility"),
        in_stock: import_zod2.z.boolean().optional().describe("Set in-stock status"),
        quantity_in_stock: import_zod2.z.number().int().min(0).optional().describe("Set exact quantity in stock"),
        discount: import_zod2.z.number().int().min(0).max(99).optional().describe("Discount percent (0\u201399)")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const client = getClient();
      const result = await client.editProductByExternalId(params);
      return {
        content: [
          {
            type: "text",
            text: result.message || `Product (ext: ${params.external_id}) updated successfully (status: ${result.status})`
          }
        ]
      };
    }
  );
}

// src/tools/messages.ts
var import_zod3 = require("zod");
function formatMessage(m) {
  return [
    `Message #${m.id}`,
    `Chat: ${m.chat?.title || m.chat?.id || "N/A"}`,
    `From: ${m.author?.name || "Unknown"}${m.author?.is_company ? " (seller)" : " (buyer)"}`,
    `Date: ${m.date_created}`,
    `Read: ${m.is_read ? "Yes" : "No"}`,
    m.text ? `Text: ${m.text}` : null
  ].filter(Boolean).join("\n");
}
function registerMessageTools(server, getClient) {
  server.registerTool(
    "prom_list_messages",
    {
      title: "List Prom.ua Messages",
      description: `Retrieve recent messages/chats from your Prom.ua store.

Args:
  - limit (number): Max messages to return, 1\u201350 (default: 20)
  - from_id (number): Pagination cursor \u2014 return messages with ID less than this value

Returns: List of messages with sender, chat title, date, read status, text.`,
      inputSchema: import_zod3.z.object({
        limit: import_zod3.z.number().int().min(1).max(50).default(20).describe("Max messages to return (1\u201350)"),
        from_id: import_zod3.z.number().int().positive().optional().describe("Pagination: return messages with ID < from_id")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ limit, from_id }) => {
      const client = getClient();
      const data = await client.listMessages({ limit, from_id });
      const messages = data.messages || [];
      if (messages.length === 0) {
        return { content: [{ type: "text", text: "No messages found." }] };
      }
      const text = `Found ${messages.length} message(s):

` + messages.map(formatMessage).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );
  server.registerTool(
    "prom_get_chat",
    {
      title: "Get Prom.ua Chat",
      description: `Get all messages in a specific chat/conversation thread.

Args:
  - chat_id (number): The chat ID (from prom_list_messages)

Returns: All messages in the chat thread.`,
      inputSchema: import_zod3.z.object({
        chat_id: import_zod3.z.number().int().positive().describe("Prom.ua chat thread ID")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ chat_id }) => {
      const client = getClient();
      const data = await client.getChat(chat_id);
      const messages = data.messages || [];
      if (messages.length === 0) {
        return { content: [{ type: "text", text: `Chat #${chat_id} is empty.` }] };
      }
      const text = `Chat #${chat_id} \u2014 ${messages.length} message(s):

` + messages.map(formatMessage).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );
  server.registerTool(
    "prom_send_message",
    {
      title: "Send Prom.ua Message",
      description: `Send a message in a Prom.ua chat conversation (e.g., reply to a buyer).

Args:
  - chat_id (number): The chat ID to reply to (from prom_list_messages)
  - text (string): Message text to send (max 2000 characters)

Returns: ID of the sent message.

Examples:
  - Reply to buyer: chat_id=67890, text="Your order has been shipped!"`,
      inputSchema: import_zod3.z.object({
        chat_id: import_zod3.z.number().int().positive().describe("Chat ID to send the message in"),
        text: import_zod3.z.string().min(1).max(2e3).describe("Message text content")
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ chat_id, text }) => {
      const client = getClient();
      const result = await client.sendMessage(chat_id, text);
      return {
        content: [{ type: "text", text: `Message sent successfully (ID: ${result.id})` }]
      };
    }
  );
}

// src/index.ts
function createServer() {
  const token = process.env.PROM_API_TOKEN;
  if (!token) {
    process.stderr.write(
      "Error: PROM_API_TOKEN environment variable is required.\nGet your token from: my.prom.ua \u2192 Settings \u2192 API Tokens\n"
    );
    process.exit(1);
  }
  const apiClient = new PromApiClient(token);
  const getClient = () => apiClient;
  const server = new import_mcp.McpServer({
    name: "prom-ua-mcp-server",
    version: "1.0.0"
  });
  registerOrderTools(server, getClient);
  registerProductTools(server, getClient);
  registerMessageTools(server, getClient);
  return { server, getClient };
}
async function runStdio() {
  const { server } = createServer();
  const transport2 = new import_stdio.StdioServerTransport();
  await server.connect(transport2);
  process.stderr.write("Prom.ua MCP server running via stdio\n");
}
async function runHTTP() {
  const { server } = createServer();
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "prom-ua-mcp-server", version: "1.0.0" });
  });
  app.post("/mcp", async (req, res) => {
    const transport2 = new import_streamableHttp.StreamableHTTPServerTransport({
      sessionIdGenerator: void 0,
      enableJsonResponse: true
    });
    res.on("close", () => transport2.close());
    await server.connect(transport2);
    await transport2.handleRequest(req, res, req.body);
  });
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    process.stderr.write(`Prom.ua MCP server running on http://localhost:${port}/mcp
`);
  });
}
var transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch((error) => {
    process.stderr.write(`Server error: ${error}
`);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    process.stderr.write(`Server error: ${error}
`);
    process.exit(1);
  });
}
