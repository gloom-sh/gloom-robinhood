# gloom-robinhood

Read-only account and position sync for [Robinhood](https://robinhood.com) in [Gloomberb](https://github.com/gloom-sh/gloomberb), over the Robinhood Trading MCP endpoint.

```bash
gloomberb install gloom-sh/gloom-robinhood
```

## Setup

Run `BROKER` (or `Ctrl+P` → "Connect a broker") and pick **Robinhood**. The first sync opens Robinhood in your browser to sign in. There is no password or API key to paste, and the tokens Robinhood issues are stored in your local Gloomberb config.

## What it can do

Nothing but read. The plugin asks the MCP server for exactly two tools, `get_accounts` and `get_equity_positions`, and **refuses to run if either one is not marked read-only**. No order-placing tool is ever requested or called.

The OAuth callback listens on `127.0.0.1` with a random state parameter and stops after five minutes.

## Desktop and terminal

The OAuth flow needs a local HTTP server, so it runs in Gloomberb's Bun process on every platform. The desktop view loads `index.browser.ts`, which carries the broker's identity and fields and forwards the actual work to the backend. See the `browser` field in `package.json`.

## Development

```bash
bun install
bun test
bun run typecheck
```

## License

MIT
