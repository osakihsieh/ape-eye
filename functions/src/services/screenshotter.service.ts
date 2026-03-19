import puppeteer, { type Page } from "puppeteer-core";
import {
  NAVIGATION_TIMEOUT_MS,
  MAX_SCROLL_HEIGHT_PX,
  SCROLL_STEP_PX,
  SCROLL_WAIT_MS,
  SCROLL_STABLE_COUNT,
} from "../config/constants";
import {
  getChromiumExecutablePath,
  buildLaunchOptions,
} from "../config/browser.config";

export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotError";
  }
}

export async function scrollToBottom(page: Page): Promise<void> {
  let lastHeight = await page.evaluate(() => document.body.scrollHeight);
  let stableCount = 0;
  let currentPosition = 0;

  while (true) {
    currentPosition += SCROLL_STEP_PX;
    await page.evaluate((y) => window.scrollTo(0, y), currentPosition);
    await new Promise((resolve) => setTimeout(resolve, SCROLL_WAIT_MS));

    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newHeight > MAX_SCROLL_HEIGHT_PX) {
      break;
    }

    if (newHeight === lastHeight) {
      stableCount++;
      if (stableCount >= SCROLL_STABLE_COUNT) {
        break;
      }
    } else {
      stableCount = 0;
      lastHeight = newHeight;
    }

    if (currentPosition >= newHeight) {
      stableCount++;
      if (stableCount >= SCROLL_STABLE_COUNT) {
        break;
      }
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const executablePath = await getChromiumExecutablePath();
  const browser = await puppeteer.launch({
    ...buildLaunchOptions(executablePath),
    executablePath,
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    await scrollToBottom(page);

    const screenshotResult = await page.screenshot({ type: "png", fullPage: true });
    return Buffer.from(screenshotResult as Buffer);
  } catch (error) {
    throw new ScreenshotError("Failed to take screenshot");
  } finally {
    await page.close();
  }
}
