import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { validateUrl, ValidationError } from "../services/validation.service";
import { takeScreenshot, ScreenshotError } from "../services/screenshotter.service";
import { uploadScreenshot, StorageError } from "../services/storage.service";
import type { ScreenshotResponse } from "../types/screenshot.types";

export async function screenshotHandler(req: Request, res: Response): Promise<void> {
  try {
    const url = validateUrl(req.body?.url);
    const screenshotBuffer = await takeScreenshot(url);
    const storageUrl = await uploadScreenshot(screenshotBuffer);

    const response: ScreenshotResponse = { success: true, url: storageUrl };
    res.json(response);
  } catch (error) {
    if (error instanceof ValidationError) {
      const response: ScreenshotResponse = { success: false, error: error.message };
      res.status(400).json(response);
      return;
    }

    if (error instanceof ScreenshotError) {
      const response: ScreenshotResponse = { success: false, error: error.message };
      res.status(422).json(response);
      return;
    }

    if (error instanceof StorageError) {
      const response: ScreenshotResponse = { success: false, error: error.message };
      res.status(500).json(response);
      return;
    }

    const response: ScreenshotResponse = { success: false, error: "Internal server error" };
    res.status(500).json(response);
  }
}
