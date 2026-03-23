import { loadEnv } from "./env.js";
import { createApp } from "./app.js";

const env = loadEnv();
const app = createApp();

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};

console.log(`Server running at http://${env.HOST}:${env.PORT}`);
