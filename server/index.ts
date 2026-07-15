/**
 * Standalone Socket.io server for ChatPulse real-time messaging.
 *
 * Scaffold only — event handlers (join channel, message, typing, presence)
 * are implemented in a later issue. Run alongside Next.js with
 * `pnpm dev:socket`.
 */
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] ChatPulse realtime server listening on :${PORT}`);
});
