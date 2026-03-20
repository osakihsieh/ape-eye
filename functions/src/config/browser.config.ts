import { existsSync } from "fs";
import chromium from "@sparticuz/chromium";
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from "./constants";
import type { PuppeteerLaunchOptions } from "puppeteer-core";

const SYSTEM_CHROME_PATHS = [
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
] as const;

const CLOUD_CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-setuid-sandbox",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
  "--disable-extensions",
];

const SYSTEM_CHROME_ARGS = CLOUD_CHROMIUM_ARGS.filter(
  (arg) => arg !== "--single-process"
);

function findSystemChromePath(): string | null {
  for (const path of SYSTEM_CHROME_PATHS) {
    if (existsSync(path)) return path;
  }
  return null;
}

export async function getChromiumExecutablePath(): Promise<string> {
  const systemPath = findSystemChromePath();
  if (systemPath) return systemPath;
  return chromium.executablePath();
}

// @sparticuz/chromium returns "chrome-headless-shell" but puppeteer-core expects "shell"
function normalizeHeadless(
  headless: boolean | "chrome-headless-shell"
): boolean | "shell" {
  if (headless === "chrome-headless-shell") return "shell";
  return headless;
}

export function buildLaunchOptions(executablePath: string): PuppeteerLaunchOptions {
  const isSystemChrome = SYSTEM_CHROME_PATHS.includes(
    executablePath as (typeof SYSTEM_CHROME_PATHS)[number]
  );
  return {
    args: isSystemChrome
      ? SYSTEM_CHROME_ARGS
      : [...chromium.args, ...CLOUD_CHROMIUM_ARGS],
    defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    headless: normalizeHeadless(chromium.headless),
  };
}
