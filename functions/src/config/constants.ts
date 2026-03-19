export const SCREENSHOT_TIMEOUT_MS = 30_000;
export const NAVIGATION_TIMEOUT_MS = 20_000;
export const VIEWPORT_WIDTH = 1280;
export const VIEWPORT_HEIGHT = 800;
export const SIGNED_URL_EXPIRY_DAYS = 7;
export const SIGNED_URL_EXPIRY_MS = SIGNED_URL_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
export const STORAGE_FOLDER = process.env.STORAGE_FOLDER ?? "screenshots";
export const MAX_URL_LENGTH = 2048;
export const ALLOWED_URL_SCHEMES = ["http:", "https:"] as const;

export const MAX_SCROLL_HEIGHT_PX = 30_000; // 超過此高度停止滾動（約 37 個視窗高）
export const SCROLL_STEP_PX = 800;          // 每次滾動像素
export const SCROLL_WAIT_MS = 300;          // 每次滾動後等待 ms（等待懶載入）
export const SCROLL_STABLE_COUNT = 3;       // 高度連續穩定 N 次才判斷到底
