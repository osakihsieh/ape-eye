export interface ScreenshotRequest {
  url: string;
}

export interface ScreenshotResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
}
