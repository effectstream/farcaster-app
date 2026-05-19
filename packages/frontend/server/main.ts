import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";

const PORT = Number(process.env.FRONTEND_PORT ?? "10599");
const HOST = process.env.FRONTEND_HOST ?? "0.0.0.0";

const server = Fastify({ logger: true });

await server.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "../client/dist"),
  prefix: "/",
});

// Serve farcaster.json from /.well-known/farcaster.json regardless of where the
// build placed it. In production, the Hosted Manifest Service is preferred but
// this acts as a fallback during preview / domain migration.
server.get("/.well-known/farcaster.json", async (_req, reply) => {
  return reply.sendFile(".well-known/farcaster.json");
});

// SPA fallback: return index.html for any unknown route so React Router can take over.
server.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/.well-known")) {
    return reply.code(404).send({ error: "not found" });
  }
  return reply.sendFile("index.html");
});

await server.listen({ port: PORT, host: HOST });
console.log(`Frontend listening on http://${HOST}:${PORT}`);
