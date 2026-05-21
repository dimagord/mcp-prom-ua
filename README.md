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
2. Go to **Settings → API Tokens** (Налаштування → API токени)
3. Click **Create token** — give it a name (e.g. `claude-mcp`) and select these permissions:
   - **Orders** — Read + Write (for listing and updating order statuses)
   - **Products** — Read + Write (for listing and editing products)
   - **Messages** — Read + Write (for reading chats and sending replies)
4. Click **Save** and then **Copy** the generated token immediately — it is shown only once

> ⚠️ Store the token securely (e.g. in a password manager). If you lose it, you'll need to generate a new one.

---

### 2. Install and build

**Prerequisites:** Node.js 18 or newer. Check with `node --version`.

```bash
# Clone the repository
git clone https://github.com/dimagord/mcp-prom-ua.git
cd mcp-prom-ua

# Install dependencies
npm install

# Build the server (compiles TypeScript → dist/index.js)
npm run build
```

After a successful build you'll see `dist/index.js` created. Note the full path to this file — you'll need it in the next step.

```bash
# Example: get the full path
pwd
# e.g. /Users/yourname/projects/mcp-prom-ua
# → full path to server: /Users/yourname/projects/mcp-prom-ua/dist/index.js
```

---

### 3. Configure Claude Desktop

Claude Desktop reads its MCP server list from a JSON config file. Open it in a text editor:

| OS | Config file location |
|----|---------------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/claude/claude_desktop_config.json` |

**If the file doesn't exist yet**, create it. If it already exists and has other MCP servers configured, add the `prom-ua` block inside the existing `mcpServers` object.

Add the following configuration, replacing the placeholder values:

```json
{
  "mcpServers": {
    "prom-ua": {
      "command": "node",
      "args": ["/full/path/to/mcp-prom-ua/dist/index.js"],
      "env": {
        "PROM_API_TOKEN": "your_prom_api_token_here"
      }
    }
  }
}
```

**Real example (macOS):**
```json
{
  "mcpServers": {
    "prom-ua": {
      "command": "node",
      "args": ["/Users/username/projects/mcp-prom-ua/dist/index.js"],
      "env": {
        "PROM_API_TOKEN": "a1b2c3d4e5f6..."
      }
    }
  }
}
```

**After saving the file:**
1. Fully quit Claude Desktop (not just close the window — use the system tray / menu bar icon → Quit)
2. Reopen Claude Desktop
3. Start a new conversation — you should see a 🔌 plug icon or a tools indicator showing `prom-ua` is connected
4. Test it by typing: `Show me my last 5 orders on Prom.ua`

> **Troubleshooting:** If the server doesn't appear, open Claude Desktop → Settings → Developer → MCP Servers to see error logs. Most common issues: wrong file path, token typo, or Node.js not found (`command: "node"` requires Node.js to be in PATH).

---

### 4. Run via HTTP (optional, for advanced use)

If you want to expose the server over HTTP (e.g. for use with other MCP clients or remote access):

```bash
PROM_API_TOKEN=your_token TRANSPORT=http PORT=3000 node dist/index.js
```

The server will start at `http://localhost:3000/mcp`. Health check: `http://localhost:3000/health`.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROM_API_TOKEN` | ✅ Yes | — | Your Prom.ua API Bearer token |
| `TRANSPORT` | No | `stdio` | `stdio` (for Claude Desktop) or `http` |
| `PORT` | No | `3000` | HTTP server port (only when `TRANSPORT=http`) |

---

## Available Tools

### Orders

#### `prom_list_orders`
List orders with optional filters.
- `limit` — max 100 (default 20)
- `date_from` / `date_to` — ISO date strings, e.g. `"2024-01-15"`
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
