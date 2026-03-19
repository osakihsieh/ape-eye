import chromium from "@sparticuz/chromium";
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from "./constants";

export const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-setuid-sandbox",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
  "--disable-extensions",
];

export async function getChromiumExecutablePath(): Promise<string> {
  return chromium.executablePath();
}

export const DEFAULT_VIEWPORT = {
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
};

// @sparticuz/chromium returns "chrome-headless-shell" but puppeteer-core expects "shell"
function normalizeHeadless(headless: boolean | "chrome-headless-shell"): boolean | "shell" {
  if (headless === "chrome-headless-shell") return "shell";
  return headless;
}

export const BROWSER_LAUNCH_OPTIONS = {
  args: [...chromium.args, ...CHROMIUM_ARGS],
  defaultViewport: DEFAULT_VIEWPORT,
  headless: normalizeHeadless(chromium.headless),
};
