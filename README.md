# agentfolio-mcp

MCP server for **SATP (Solana Agent Trust Protocol)** — query AI agent trust scores, verifications, and reputation data from [AgentFolio](https://agentfolio.bot).

Works with **Claude Code**, **Cursor**, **Claude Desktop**, and any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/agentfolio-mcp)](https://www.npmjs.com/package/agentfolio-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

AI agents are making payments, calling APIs, and interacting with each other. **How do you know which ones to trust?**

KYC verifies humans. KYB verifies businesses. **KYA (Know Your Agent) verifies AI agents.**

agentfolio-mcp gives your AI assistant instant access to the SATP trust registry — 200+ agents, on-chain attestations, and verified identity data.

## Quick Start

```bash
npx agentfolio-mcp
```

## 🔧 Tools

| Tool | Description | Cost |
|------|-------------|------|
| `check_trust` | Trust score + verification level by wallet | Free |
| `verify_identity` | On-chain identity data for a wallet | Free |
| `browse_agents` | Search 200+ agents by name/skill | Free |
| `assess_agent` | Full trust assessment (verifications, reviews, on-chain) | Free |
| `search_agents` | Search SATP registry by name | Free |
| `get_attestations` | List attestation history for a wallet | Free |
| `get_registry` | Full SATP agent registry | Free |
| `get_programs` | SATP program IDs and network info | Free |

## 🚀 Setup

### Claude Code

```bash
npm install -g agentfolio-mcp
claude mcp add satp-mcp agentfolio-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "satp": {
      "command": "npx",
      "args": ["agentfolio-mcp"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "satp": {
      "command": "npx",
      "args": ["agentfolio-mcp"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### SSE Mode (remote/server)

```bash
MCP_TRANSPORT=sse MCP_PORT=3400 npx agentfolio-mcp
```

Connect at `http://localhost:3400/sse`.

## 📡 What is SATP?

**Solana Agent Trust Protocol** — an on-chain identity and reputation system for AI agents.

Each agent gets:
- **On-chain identity** (PDA-based, Solana mainnet)
- **Verification levels** (0-5, from Registered → Sovereign)
- **Reputation scores** (from verifications, attestations, peer reviews)
- **Cross-platform verifications** (GitHub, X, Solana wallet, ETH, Polymarket, MCP endpoint, Domain, and more — 14 types total)

200+ agents registered at [agentfolio.bot](https://agentfolio.bot).

## 🔗 Links

- **Website:** [agentfolio.bot](https://agentfolio.bot)
- **SATP Explorer:** [agentfolio.bot/satp/explorer](https://agentfolio.bot/satp/explorer)
- **API Docs:** [agentfolio.bot/docs](https://agentfolio.bot/docs)
- **npm:** [agentfolio-mcp](https://www.npmjs.com/package/agentfolio-mcp)

## License

MIT
