import "dotenv/config";
import http from "http";
import { carrots } from "./lib/index.js";

// Never let a stray rejection kill the long-running process.
process.on("unhandledRejection", (e) => console.error(e));

if (!process.env.ACCOUNT) throw new Error("Missing ACCOUNT");
if (!process.env.REPOSITORY) throw new Error("Missing REPOSITORY");

const port = process.env.PORT || 3000;

const listener = await carrots({
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  token: process.env.TOKEN,
  hideVersions: !!process.env.HIDE_VERSIONS,
});

http.createServer(listener).listen(port, () => {
  console.log(`Carrots running on http://localhost:${port}`);
});
