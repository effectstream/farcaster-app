import { runPreparedQuery } from "@effectstream/db";
import type { StartConfigApiRouter } from "@effectstream/runtime";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import {
  countCanvases,
  getCanvasById,
  getCanvasPaints,
  getReward,
  listCanvasesByOwner,
  listUnfilledCanvases,
} from "@farcaster-canvas/database";

const PAGE_LIMIT = 50;

export const apiRouter: StartConfigApiRouter = async (
  server: FastifyInstance,
  dbConn: Pool,
) => {
  server.get("/api/health", async (_req, reply) => {
    reply.send({ ok: true });
  });

  server.get("/api/canvases", async (req, reply) => {
    const q = (req.query ?? {}) as { limit?: string; owner?: string };
    const limit = Math.min(Number(q.limit ?? PAGE_LIMIT) || PAGE_LIMIT, 200);

    if (q.owner) {
      const rows = await runPreparedQuery(
        listCanvasesByOwner.run({ owner: q.owner, limit }, dbConn),
        "/api/canvases?owner",
      );
      reply.send({ canvases: rows });
      return;
    }

    const rows = await runPreparedQuery(
      listUnfilledCanvases.run({ limit }, dbConn),
      "/api/canvases",
    );
    const [{ total } = { total: 0 }] = await runPreparedQuery(
      countCanvases.run(undefined, dbConn),
      "/api/canvases/count",
    );
    reply.send({ canvases: rows, total });
  });

  server.get<{ Params: { id: string } }>("/api/canvas/:id", async (req, reply) => {
    const canvasId = Number(req.params.id);
    if (!Number.isFinite(canvasId) || canvasId <= 0) {
      reply.code(400).send({ error: "invalid canvas id" });
      return;
    }

    const [canvas] = await runPreparedQuery(
      getCanvasById.run({ canvasId }, dbConn),
      `/api/canvas/${canvasId}`,
    );
    if (!canvas) {
      reply.code(404).send({ error: "not found" });
      return;
    }

    const paints = await runPreparedQuery(
      getCanvasPaints.run({ canvasId }, dbConn),
      `/api/canvas/${canvasId}/paints`,
    );

    reply.send({ canvas, paints });
  });

  server.get<{ Params: { addr: string } }>("/api/rewards/:addr", async (req, reply) => {
    const [row] = await runPreparedQuery(
      getReward.run({ owner: req.params.addr }, dbConn),
      `/api/rewards/${req.params.addr}`,
    );
    reply.send({
      owner: req.params.addr,
      balanceWei: row?.balance_wei ?? "0",
    });
  });
};
