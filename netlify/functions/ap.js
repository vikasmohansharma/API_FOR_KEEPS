// netlify/functions/api.ts
import express from "express";
import serverless from "serverless-http";

const api = express();
const router = express.Router();

router.get("/hello", (req, res) => res.send("Hello World!"));

api.use("/api/", router);

export const handler = serverless(api);
