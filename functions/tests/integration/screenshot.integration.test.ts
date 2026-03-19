/**
 * Integration tests for the screenshot handler pipeline.
 * Tests the full flow with mocked external dependencies (Puppeteer + Firebase Storage).
 */

import { screenshotHandler } from "../../src/handlers/screenshot.handler";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

jest.mock("puppeteer-core", () => ({
  launch: jest.fn(),
}));

jest.mock("../../src/config/browser.config", () => ({
  getChromiumExecutablePath: jest.fn().mockResolvedValue("/usr/bin/chromium"),
  buildLaunchOptions: jest.fn().mockReturnValue({
    args: [],
    defaultViewport: { width: 1280, height: 800 },
    headless: true,
  }),
}));

jest.mock("firebase-admin", () => ({
  storage: jest.fn(),
  apps: [],
  initializeApp: jest.fn(),
}));

import puppeteer from "puppeteer-core";
import admin from "firebase-admin";

const mockPuppeteerLaunch = puppeteer.launch as jest.Mock;
const mockAdminStorage = admin.storage as unknown as jest.Mock;

function createRequest(body: unknown): Partial<Request> {
  return { body } as Partial<Request>;
}

function createResponse(): { res: Partial<Response>; getStatus: () => number; getBody: () => unknown } {
  let status = 200;
  let body: unknown = null;

  const jsonMock = jest.fn().mockImplementation((data) => {
    body = data;
  });
  const statusMock = jest.fn().mockImplementation((code: number) => {
    status = code;
    return { json: jsonMock };
  });

  const res: Partial<Response> = {
    status: statusMock as unknown as Response["status"],
    json: jsonMock,
  };

  return {
    res,
    getStatus: () => status,
    getBody: () => body,
  };
}

describe("Screenshot handler integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockPage = {
      setViewport: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(Buffer.from("fake-screenshot")),
      close: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn()
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(800)
        .mockResolvedValue(undefined),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteerLaunch.mockResolvedValue(mockBrowser);

    const mockGetSignedUrl = jest.fn().mockResolvedValue(["https://storage.googleapis.com/url"]);
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockFile = jest.fn().mockReturnValue({ save: mockSave, getSignedUrl: mockGetSignedUrl });
    const mockBucketFn = jest.fn().mockReturnValue({ file: mockFile });
    mockAdminStorage.mockReturnValue({ bucket: mockBucketFn });
  });

  it("full success flow: returns 200 with storage URL", async () => {
    const { res, getBody } = createResponse();
    await screenshotHandler(createRequest({ url: "https://example.com" }) as Request, res as Response);

    const body = getBody() as { success: boolean; url: string };
    expect(body.success).toBe(true);
    expect(body.url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
  });

  it("returns 400 for invalid URL", async () => {
    const { res, getStatus, getBody } = createResponse();
    await screenshotHandler(createRequest({ url: "ftp://example.com" }) as Request, res as Response);

    expect(getStatus()).toBe(400);
    const body = getBody() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it("returns 400 for missing url field", async () => {
    const { res, getStatus } = createResponse();
    await screenshotHandler(createRequest({}) as Request, res as Response);

    expect(getStatus()).toBe(400);
  });

  it("returns 422 when page navigation fails", async () => {
    mockPuppeteerLaunch.mockImplementation(async () => ({
      newPage: jest.fn().mockResolvedValue({
        setViewport: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockRejectedValue(new Error("net::ERR_NAME_NOT_RESOLVED")),
        screenshot: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }));

    const { res, getStatus, getBody } = createResponse();
    await screenshotHandler(
      createRequest({ url: "https://example.com" }) as Request,
      res as Response
    );

    expect(getStatus()).toBe(422);
    const body = getBody() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).not.toContain("ERR_NAME_NOT_RESOLVED");
  });
});
