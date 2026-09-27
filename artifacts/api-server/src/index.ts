import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import app from "./app";
import { logger } from "./lib/logger";
import { WebSocketServer } from "ws";
import {
  addParticipant,
  broadcast,
  getPresenceSnapshot,
  getRoom,
  removeParticipant,
} from "./lib/rooms";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const webSocketServer = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== "/api/ws") {
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (client) => {
    webSocketServer.emit("connection", client, request);
  });
});

webSocketServer.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
  const roomCode = (url.searchParams.get("room") ?? "").toUpperCase();
  const participantId = url.searchParams.get("nodeId") ?? randomUUID();
  const name = (url.searchParams.get("name") ?? "Guest").trim().slice(0, 24) || "Guest";
  const room = getRoom(roomCode);

  if (!room || !/^[A-Z0-9]{5}$/.test(roomCode)) {
    socket.close(1008, "Room not found");
    return;
  }

  const participant = addParticipant(room, {
    id: participantId,
    name,
    status: "online",
    clockOffsetMs: 0,
    socket,
  });

  socket.send(JSON.stringify({ type: "room:state", room: getPresenceSnapshot(room) }));
  broadcast(room, { type: "presence:update", room: getPresenceSnapshot(room) });

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { type?: string; clientTime?: number };
      if (message.type === "clock:ping" && typeof message.clientTime === "number") {
        socket.send(
          JSON.stringify({
            type: "clock:pong",
            clientTime: message.clientTime,
            serverTime: Date.now(),
          }),
        );
      }
    } catch {
      // Ignore malformed client messages; the connection remains usable.
    }
  });

  socket.on("close", () => {
    removeParticipant(room, participant.id);
    if (getRoom(room.code)) {
      broadcast(room, { type: "presence:update", room: getPresenceSnapshot(room) });
    }
  });
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
