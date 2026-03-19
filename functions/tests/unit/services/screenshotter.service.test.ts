import { takeScreenshot, scrollToBottom, ScreenshotError } from "../../../src/services/screenshotter.service";

// Mock puppeteer-core
jest.mock("puppeteer-core", () => ({
  launch: jest.fn(),
}));

// Mock browser config
jest.mock("../../../src/config/browser.config", () => ({
  getChromiumExecutablePath: jest.fn().mockResolvedValue("/usr/bin/chromium"),
  buildLaunchOptions: jest.fn().mockReturnValue({
    args: [],
    defaultViewport: { width: 1280, height: 800 },
    headless: true,
  }),
}));

import puppeteer from "puppeteer-core";

const mockPuppeteerLaunch = puppeteer.launch as jest.Mock;

function createMockPage(overrides: Record<string, unknown> = {}) {
  return {
    setViewport: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from("fake-screenshot")),
    close: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn(),
    ...overrides,
  };
}

function createMockBrowser(page: ReturnType<typeof createMockPage>) {
  return {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe("takeScreenshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a Buffer on successful screenshot", async () => {
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)   // initial scrollHeight
        .mockResolvedValueOnce(800)   // stable #1
        .mockResolvedValueOnce(800)   // stable #2
        .mockResolvedValueOnce(800)   // stable #3 → break
        .mockResolvedValue(undefined), // scrollTo(0,0)
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    const result = await takeScreenshot("https://example.com");

    expect(result).toBeInstanceOf(Buffer);
    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ waitUntil: "networkidle0" })
    );
    expect(mockPage.screenshot).toHaveBeenCalledWith(
      expect.objectContaining({ type: "png", fullPage: true })
    );
  });

  it("closes the page even on success", async () => {
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValue(undefined),
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    await takeScreenshot("https://example.com");

    expect(mockPage.close).toHaveBeenCalled();
  });

  it("closes the page on navigation failure", async () => {
    const mockPage = createMockPage({
      goto: jest.fn().mockRejectedValue(new Error("net::ERR_NAME_NOT_RESOLVED")),
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    await expect(takeScreenshot("https://nonexistent.example.com")).rejects.toThrow(ScreenshotError);

    expect(mockPage.close).toHaveBeenCalled();
  });

  it("throws ScreenshotError on navigation timeout", async () => {
    const mockPage = createMockPage({
      goto: jest.fn().mockRejectedValue(new Error("Navigation timeout")),
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    await expect(takeScreenshot("https://example.com")).rejects.toThrow(ScreenshotError);
    await expect(takeScreenshot("https://example.com")).rejects.toThrow("Failed to take screenshot");
  });

  it("throws ScreenshotError when screenshot fails", async () => {
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValue(undefined),
      screenshot: jest.fn().mockRejectedValue(new Error("Screenshot failed")),
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    await expect(takeScreenshot("https://example.com")).rejects.toThrow(ScreenshotError);
  });

  it("does not expose internal error details", async () => {
    const mockPage = createMockPage({
      goto: jest.fn().mockRejectedValue(new Error("/internal/path/leaked")),
    });
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    await expect(takeScreenshot("https://example.com")).rejects.toThrow(ScreenshotError);
    await expect(takeScreenshot("https://example.com")).rejects.not.toThrow("/internal/path/leaked");
  });
});

describe("scrollToBottom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stops when scroll height stabilizes", async () => {
    // 高度 3 次穩定後停止
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)    // initial height
        .mockResolvedValueOnce(800)    // after scroll #1: stable #1
        .mockResolvedValueOnce(800)    // after scroll #2: stable #2
        .mockResolvedValueOnce(800)    // after scroll #3: stable #3 → break
        .mockResolvedValueOnce(undefined), // scrollTo(0,0)
    });

    await scrollToBottom(mockPage as never);

    // 最後一次 evaluate 應該是 scrollTo(0, 0)
    const calls = mockPage.evaluate.mock.calls;
    const lastCall = calls[calls.length - 1];
    // scrollTo(0,0) 呼叫時傳入 fn 和 undefined
    expect(lastCall[1]).toBeUndefined();
  });

  it("stops when page height exceeds MAX_SCROLL_HEIGHT_PX", async () => {
    // 模擬無限滾動：每次滾動後高度增加，超過 30000px 後停止
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)       // initial height
        .mockResolvedValueOnce(10000)     // grows
        .mockResolvedValueOnce(20000)     // grows
        .mockResolvedValueOnce(31000)     // exceeds MAX_SCROLL_HEIGHT_PX → break
        .mockResolvedValueOnce(undefined), // scrollTo(0,0)
    });

    await scrollToBottom(mockPage as never);

    // 確認 evaluate 被呼叫（驗證實際觸發了滾動邏輯）
    expect(mockPage.evaluate).toHaveBeenCalled();

    // 確認最後有重設回頂部
    const calls = mockPage.evaluate.mock.calls;
    const scrollToTopCall = calls.find(
      (call: unknown[]) => typeof call[0] === "function" && call[1] === undefined
    );
    expect(scrollToTopCall).toBeDefined();
  });

  it("resets scroll position to top after completion", async () => {
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(500)    // initial height
        .mockResolvedValueOnce(500)    // stable #1
        .mockResolvedValueOnce(500)    // stable #2
        .mockResolvedValueOnce(500)    // stable #3 → break
        .mockResolvedValueOnce(undefined), // scrollTo(0,0)
    });

    await scrollToBottom(mockPage as never);

    // 確認 scrollTo(0,0) 被呼叫：最後一個 evaluate 呼叫應為 scrollTo(0,0)
    const calls = mockPage.evaluate.mock.calls;
    const lastCall = calls[calls.length - 1];
    // scrollTo(0,0) 沒有第二個參數
    expect(lastCall.length).toBe(1);
    // 而滾動到指定位置的呼叫有第二個參數
    const scrollCalls = calls.filter((call: unknown[]) => call.length === 2);
    expect(scrollCalls.length).toBeGreaterThan(0);
  });

  it("continues scrolling when page height grows", async () => {
    const mockPage = createMockPage({
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)    // initial height
        .mockResolvedValueOnce(1600)   // grows → stableCount reset
        .mockResolvedValueOnce(1600)   // stable #1
        .mockResolvedValueOnce(1600)   // stable #2
        .mockResolvedValueOnce(1600)   // stable #3 → break
        .mockResolvedValueOnce(undefined), // scrollTo(0,0)
    });

    await scrollToBottom(mockPage as never);

    // 確認進行了多次滾動
    const scrollCalls = mockPage.evaluate.mock.calls.filter(
      (call: unknown[]) => call.length === 2
    );
    expect(scrollCalls.length).toBeGreaterThan(1);
  });
});
