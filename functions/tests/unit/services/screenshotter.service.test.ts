import { takeScreenshot, ScreenshotError } from "../../../src/services/screenshotter.service";

// Mock puppeteer-core
jest.mock("puppeteer-core", () => ({
  launch: jest.fn(),
}));

// Mock browser config
jest.mock("../../../src/config/browser.config", () => ({
  getChromiumExecutablePath: jest.fn().mockResolvedValue("/usr/bin/chromium"),
  BROWSER_LAUNCH_OPTIONS: {
    args: [],
    defaultViewport: { width: 1280, height: 800 },
    headless: true,
  },
}));

import puppeteer from "puppeteer-core";

const mockPuppeteerLaunch = puppeteer.launch as jest.Mock;

function createMockPage(overrides: Record<string, unknown> = {}) {
  return {
    setViewport: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from("fake-screenshot")),
    close: jest.fn().mockResolvedValue(undefined),
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
    const mockPage = createMockPage();
    const mockBrowser = createMockBrowser(mockPage);
    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    const result = await takeScreenshot("https://example.com");

    expect(result).toBeInstanceOf(Buffer);
    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ waitUntil: "networkidle0" })
    );
    expect(mockPage.screenshot).toHaveBeenCalledWith(
      expect.objectContaining({ type: "png" })
    );
  });

  it("closes the page even on success", async () => {
    const mockPage = createMockPage();
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
