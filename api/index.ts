import carrots from "../lib/index.js";

const listener = await carrots({
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  token: process.env.TOKEN,
});

export default listener;
