import { carrots } from "../lib/index.js";

if (!process.env.ACCOUNT) throw new Error("Missing ACCOUNT");
if (!process.env.REPOSITORY) throw new Error("Missing REPOSITORY");

const listener = await carrots({
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  token: process.env.TOKEN,
  hideVersions: !!process.env.HIDE_VERSIONS,
});

export default listener;
