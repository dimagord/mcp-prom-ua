# prom-ua-mcp-server

MCP (Model Context Protocol) server for the **[Prom.ua](https://prom.ua)** marketplace API. Lets AI assistants (Claude, etc.) manage your Prom.ua store — orders, products, and buyer messages.

---

## Features

| Domain | Tools |
|--------|-------|
| **Orders** | List, get detail, set status, add TTN tracking |
| **Products** | List, get detail, edit price/stock/availability by ID or external ID |
| **Messages** | List chats, read thread, send reply to buyer |

---

## Setup

### 1. Get your API token

1. Log in to [my.prom.ua](https://my.prom.ua)
2. Go to **Settings → API Tokens**
3. Create a new token with the required permissions
4. Copy the token

### 2. Install

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "prom-ua": {
      "command": "node",
      "args": ["/path/to/prom-ua-mcp-server/dist/index.js"],
      "env": {
        "PROM_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 4. Run via HTTP (optional)

```bash
PROM_API_TOKEN=your_token TRANSPORT=http PORT=3000 node dist/index.js
```

Then use `http://localhost:3000/mcp` as your MCP endpoint.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROM_API_TOKEN` | ✅ Yes | — | Your Prom.ua API Bearer token |
| `TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `3000` | HTTP server port (when TRANSPORT=http) |

---

## Available Tools

### Orders

#### `prom_list_orders`
List orders with optional filters.
- `limit` — max 100 (default 20)
- `date_from` / `date_to` — ISO date strings
- `status` — `pending | received | delivered | canceled | draft | paid`

#### `prom_get_order`
Get full order details by ID.
- `order_id` — numeric order ID

#### `prom_set_order_status`
Change status of one or more orders.
- `ids` — array of order IDs
- `status` — new status
- `cancellation_reason` — required when canceling: `out_of_stock | wrong_price | duplicate_order | buyer_canceled | other`
- `cancellation_text` — optional explanation

#### `prom_set_order_delivery`
Add TTN / tracking number to an order.
- `order_id`
- `declaration_number` — Nova Poshta or other carrier TTN
- `delivery_type` — optional carrier name

### Products

#### `prom_list_products`
Paginated product listing.
- `page`, `per_page` (max 100)
- `group_id` — filter by category group
- `status` — `on_display | draft | archival | deleted`

#### `prom_get_product`
Get full product details by ID.

#### `prom_edit_product`
Edit a product by its Prom.ua ID.
- `id` (required), then any of: `price`, `is_active`, `in_stock`, `quantity_in_stock`, `discount`, `name`, `description`, `keywords`, `external_id`

#### `prom_edit_product_by_external_id`
Edit a product by your own external ID (great for ERP/CRM sync).
- `external_id` (required), then any of: `price`, `is_active`, `in_stock`, `quantity_in_stock`, `discount`

### Messages

#### `prom_list_messages`
List recent buyer messages.
- `limit`, `from_id` (pagination cursor)

#### `prom_get_chat`
Get full conversation thread by chat ID.

#### `prom_send_message`
Send a reply in a chat.
- `chat_id`, `text` (max 2000 chars)

---

## Example prompts

```
Show me all pending orders from today
```
```
Set order #123456 status to received
```
```
Add TTN 59000012345678 to order #123456
```
```
Show product #987654 details
```
```
Update price to 299.99 UAH and mark in stock for product #987654
```
```
List unread messages from buyers
```
```
Reply to chat #456 saying: "Your order has been shipped!"
```

---

## API Reference

Official Prom.ua API docs: [public-api.docs.prom.ua](https://public-api.docs.prom.ua/)
