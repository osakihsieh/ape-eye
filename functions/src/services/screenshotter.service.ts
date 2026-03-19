import puppeteer from "puppeteer-core";
import { NAVIGATION_TIMEOUT_MS } from "../config/constants";
import {
  getChromiumExecutablePath,
  BROWSER_LAUNCH_OPTIONS,
} from "../config/browser.config";

export class ScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotError";
  }
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const executablePath = await getChromiumExecutablePath();
  const browser = await puppeteer.launch({
    ...BROWSER_LAUNCH_OPTIONS,
    executablePath,
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    const screenshotResult = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshotResult as Buffer);
  } catch (error) {
    throw new ScreenshotError("Failed to take screenshot");
  } finally {
    await page.close();
  }
}
