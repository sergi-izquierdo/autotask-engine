import { createBunWebSocket } from "hono/bun";
import { loadEnv } from "./env.js";
import { createApp } from "./app.js";

const env = loadEnv();
const { upgradeWebSocket, websocket } = createBunWebSocket();
const { app, connectionManager } = createApp({ upgradeWebSocket });

export { connectionManager };

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
  websocket,
};

console.log(`Server running at http://${env.HOST}:${env.PORT}`);
