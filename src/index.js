#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import http from "node:http";

const AGENTFOLIO_BASE = process.env.SATP_API_BASE || "https://agentfolio.bot/api/satp";
const MCP_PORT = parseInt(process.env.MCP_PORT || "3400", 10);
const TRANSPORT = process.env.MCP_TRANSPORT || "sse"; // "stdio" or "sse"

// ─── API helper ───────────────────────────────────────────────────────────────

async function satpFetch(path) {
  const url = `${AGENTFOLIO_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "satp-mcp/1.0" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SATP API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// ─── Build MCP Server ─────────────────────────────────────────────────────────

function createServer() {
  const server = new McpServer({
    name: "satp-mcp",
    version: "1.0.0",
  });

  // ── Tool: check_trust
  server.tool(
    "check_trust",
    "Check the trust score, verification level, and reputation of a Solana agent by wallet address",
    { wallet: z.string().describe("Solana wallet address (base58)") },
    async ({ wallet }) => {
      try {
        const [identity, scores] = await Promise.all([
          satpFetch(`/identity/${wallet}`),
          satpFetch(`/scores/${wallet}`),
        ]);
        const agent = identity?.data || {};
        const score = scores?.data || {};
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              wallet, name: agent.name || null, description: agent.description || null,
              verificationLevel: agent.verificationLevel ?? null,
              verificationLabel: agent.verificationLabel || null,
              reputationScore: score.reputationScore ?? agent.reputationScore ?? null,
              reputationRank: score.reputationRank ?? agent.reputationRank ?? null,
              onChain: agent.onChain ?? null, pda: agent.pda || null,
              programId: agent.programId || null,
              attestationCount: score.attestationCount ?? null,
              scores: score.scores || null,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error checking trust: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: verify_identity
  server.tool(
    "verify_identity",
    "Get on-chain identity data for a Solana agent wallet",
    { wallet: z.string().describe("Solana wallet address (base58)") },
    async ({ wallet }) => {
      try {
        const result = await satpFetch(`/identity/${wallet}`);
        const agent = result?.data || {};
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              wallet, name: agent.name || null, description: agent.description || null,
              metadataUri: agent.metadataUri || null, version: agent.version ?? null,
              verificationLevel: agent.verificationLevel ?? null,
              verificationLabel: agent.verificationLabel || null,
              reputationScore: agent.reputationScore ?? null,
              reputationRank: agent.reputationRank || null,
              onChain: agent.onChain ?? null, pda: agent.pda || null,
              programId: agent.programId || null, authority: agent.authority || wallet,
              createdAt: agent.createdAt || null, updatedAt: agent.updatedAt || null,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error verifying identity: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: search_agents
  server.tool(
    "search_agents",
    "Search registered SATP agents by name",
    { query: z.string().describe("Agent name or partial name to search for") },
    async ({ query }) => {
      try {
        const result = await satpFetch(`/search?name=${encodeURIComponent(query)}`);
        const agents = result?.data?.agents || result?.data || [];
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query, resultCount: Array.isArray(agents) ? agents.length : 0,
              agents: Array.isArray(agents) ? agents.map((a) => ({
                name: a.name || null, wallet: a.authority || null,
                description: a.description || null,
                verificationLabel: a.verificationLabel || null,
                reputationScore: a.reputationScore ?? null,
                reputationRank: a.reputationRank || null, pda: a.pda || null,
              })) : [],
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error searching agents: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: get_attestations
  server.tool(
    "get_attestations",
    "List all attestations (trust endorsements) for a Solana agent wallet",
    { wallet: z.string().describe("Solana wallet address (base58)") },
    async ({ wallet }) => {
      try {
        const result = await satpFetch(`/scores/${wallet}`);
        const data = result?.data || {};
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              wallet, attestationCount: data.attestationCount ?? 0,
              attestations: data.attestations || [],
              scores: data.scores || null,
              reputationScore: data.reputationScore ?? null,
              reputationRank: data.reputationRank || null,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error getting attestations: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: get_registry
  server.tool(
    "get_registry",
    "Get the full SATP agent registry — all registered agents on-chain",
    {},
    async () => {
      try {
        const result = await satpFetch("/registry");
        const agents = result?.data?.agents || [];
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              agentCount: agents.length,
              agents: agents.map((a) => ({
                name: a.name || "(unnamed)", wallet: a.authority || null,
                verificationLabel: a.verificationLabel || null,
                reputationScore: a.reputationScore ?? null,
                reputationRank: a.reputationRank || null,
                onChain: a.onChain ?? null, pda: a.pda || null,
              })),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error getting registry: ${err.message}` }], isError: true };
      }
    }
  );


  // ── Tool: browse_agents
  server.tool(
    "browse_agents",
    "Browse and search the AgentFolio directory of 200+ registered AI agents. Filter by name, skill, or category.",
    {
      query: z.string().optional().describe("Search query — agent name, skill, or keyword"),
      limit: z.number().optional().default(20).describe("Max results to return (default 20)"),
    },
    async ({ query, limit }) => {
      try {
        const baseUrl = AGENTFOLIO_BASE.replace("/api/satp", "/api");
        let url = `${baseUrl}/search?limit=${limit || 20}`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { "User-Agent": "satp-mcp/1.0" } });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        const agents = (data.results || data.profiles || data || []).slice(0, limit || 20);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query: query || "(all)",
              resultCount: agents.length,
              agents: agents.map(a => ({
                id: a.id, name: a.name, handle: a.handle || null,
                bio: (a.bio || "").slice(0, 120),
                trustScore: a.trustScore ?? a.verification?.score ?? 0,
                skills: (a.skills || []).slice(0, 5).map(s => typeof s === "string" ? s : s.name),
                verified: Object.entries(a.verificationData || {}).filter(([_, v]) => v?.verified).map(([k]) => k),
                profileUrl: `https://agentfolio.bot/profile/${a.id}`,
              })),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error browsing agents: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: assess_agent (detailed trust assessment)
  server.tool(
    "assess_agent",
    "Get a detailed trust assessment for an agent — includes on-chain verification data, attestation history, peer reviews, and full reputation breakdown. Use agent ID (e.g. agent_brainkid) or wallet address.",
    {
      agentId: z.string().optional().describe("Agent profile ID (e.g. agent_brainkid)"),
      wallet: z.string().optional().describe("Solana wallet address"),
    },
    async ({ agentId, wallet }) => {
      try {
        const baseUrl = AGENTFOLIO_BASE.replace("/api/satp", "/api");
        let profile, onchain;

        if (agentId) {
          // Fetch by profile ID
          const profRes = await fetch(`${baseUrl}/profile/${agentId}`, { headers: { "User-Agent": "satp-mcp/1.0" } });
          if (!profRes.ok) throw new Error(`Profile not found: ${agentId}`);
          profile = await profRes.json();
          wallet = wallet || profile.wallets?.solana;
        }

        if (wallet) {
          // Fetch on-chain data
          const [idRes, scoreRes] = await Promise.all([
            fetch(`${AGENTFOLIO_BASE}/identity/${wallet}`, { headers: { "User-Agent": "satp-mcp/1.0" } }),
            fetch(`${AGENTFOLIO_BASE}/scores/${wallet}`, { headers: { "User-Agent": "satp-mcp/1.0" } }),
          ]);
          if (idRes.ok) onchain = { identity: await idRes.json(), scores: scoreRes.ok ? await scoreRes.json() : null };
        }

        // Fetch reviews
        let reviews = [];
        if (agentId) {
          try {
            const revRes = await fetch(`${baseUrl}/reviews/recent?limit=5`, { headers: { "User-Agent": "satp-mcp/1.0" } });
            if (revRes.ok) {
              const revData = await revRes.json();
              reviews = (revData.reviews || []).filter(r => r.revieweeId === agentId);
            }
          } catch {}
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              agentId: agentId || null,
              wallet: wallet || null,
              name: profile?.name || onchain?.identity?.name || null,
              bio: profile?.bio || null,
              trustScore: profile?.trustScore ?? onchain?.scores?.trustScore ?? 0,
              verificationLevel: onchain?.identity?.verificationLevel ?? profile?.verification?.tier ?? "unknown",
              verifications: profile ? Object.entries(profile.verificationData || {})
                .filter(([_, v]) => v?.verified)
                .map(([platform, v]) => ({ platform, verifiedAt: v.verifiedAt || null, method: v.method || null }))
                : [],
              skills: (profile?.skills || []).map(s => typeof s === "string" ? s : s.name),
              onChain: {
                registered: onchain?.identity?.registered ?? false,
                identityPDA: onchain?.identity?.pda || onchain?.identity?.identityPDA || null,
                reputationScore: onchain?.scores?.reputationScore ?? onchain?.identity?.reputationScore ?? null,
                attestationCount: onchain?.scores?.attestationCount ?? 0,
              },
              peerReviews: reviews.map(r => ({
                reviewer: r.reviewerId, rating: r.rating, comment: r.comment || null, createdAt: r.createdAt,
              })),
              profileUrl: agentId ? `https://agentfolio.bot/profile/${agentId}` : null,
              explorerUrl: wallet ? `https://solscan.io/account/${wallet}` : null,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error assessing agent: ${err.message}` }], isError: true };
      }
    }
  );

  // ── Tool: get_programs
  server.tool(
    "get_programs",
    "Get SATP program IDs and network info (identity, reputation, attestation, validation, escrow programs)",
    {},
    async () => {
      try {
        const result = await satpFetch("/programs");
        return {
          content: [{ type: "text", text: JSON.stringify(result?.data || {}, null, 2) }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error getting programs: ${err.message}` }], isError: true };
      }
    }
  );

  return server;
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  if (TRANSPORT === "stdio") {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("SATP MCP server running on stdio");
  } else {
    // SSE mode — persistent HTTP server for PM2
    const sessions = new Map();

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${MCP_PORT}`);

      // Health check
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", transport: "sse", sessions: sessions.size }));
        return;
      }

      // SSE endpoint — client connects here
      if (url.pathname === "/sse") {
        const server = createServer();
        const transport = new SSEServerTransport("/messages", res);
        sessions.set(transport.sessionId, { server, transport });
        
        res.on("close", () => {
          sessions.delete(transport.sessionId);
        });

        await server.connect(transport);
        return;
      }

      // Message endpoint — client sends JSON-RPC here
      if (url.pathname === "/messages") {
        const sessionId = url.searchParams.get("sessionId");
        const session = sessions.get(sessionId);
        if (!session) {
          res.writeHead(404);
          res.end("Session not found");
          return;
        }
        
        let body = "";
        for await (const chunk of req) body += chunk;
        
        await session.transport.handlePostMessage(req, res, body);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(MCP_PORT, "0.0.0.0", () => {
      console.log(`SATP MCP server running on http://0.0.0.0:${MCP_PORT}`);
      console.log(`  SSE endpoint: http://localhost:${MCP_PORT}/sse`);
      console.log(`  Health check: http://localhost:${MCP_PORT}/health`);
      console.log(`  API base: ${AGENTFOLIO_BASE}`);
    });
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
