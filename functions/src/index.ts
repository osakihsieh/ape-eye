import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { screenshotHandler } from "./handlers/screenshot.handler";

initializeApp();

export const screenshot = onRequest(
  {
    memory: "2GiB",
    timeoutSeconds: 120,
    cors: false,
  },
  screenshotHandler
);
