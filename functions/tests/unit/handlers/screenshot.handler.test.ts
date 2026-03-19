import { screenshotHandler } from "../../../src/handlers/screenshot.handler";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

// Preserve error classes from real modules while mocking only the functions
jest.mock("../../../src/services/validation.service", () => ({
  ...jest.requireActual("../../../src/services/validation.service"),
  validateUrl: jest.fn(),
}));
jest.mock("../../../src/services/screenshotter.service", () => ({
  ...jest.requireActual("../../../src/services/screenshotter.service"),
  takeScreenshot: jest.fn(),
}));
jest.mock("../../../src/services/storage.service", () => ({
  ...jest.requireActual("../../../src/services/storage.service"),
  uploadScreenshot: jest.fn(),
}));

import { validateUrl, ValidationError } from "../../../src/services/validation.service";
import { takeScreenshot, ScreenshotError } from "../../../src/services/screenshotter.service";
import { uploadScreenshot, StorageError } from "../../../src/services/storage.service";

const mockValidateUrl = validateUrl as jest.Mock;
const mockTakeScreenshot = takeScreenshot as jest.Mock;
const mockUploadScreenshot = uploadScreenshot as jest.Mock;

function createMockRequest(body: unknown, query: Record<string, string> = {}, method = "POST"): Partial<Request> {
  return { body, query, method } as Partial<Request>;
}

function createMockResponse(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock; redirectMock: jest.Mock } {
  const jsonMock = jest.fn();
  const redirectMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res: Partial<Response> = {
    status: statusMock as unknown as Response["status"],
    json: jsonMock,
    redirect: redirectMock as unknown as Response["redirect"],
  };
  return { res, statusMock, jsonMock, redirectMock };
}

describe("screenshotHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("success flow", () => {
    it("returns 200 with URL on success", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockResolvedValue(Buffer.from("screenshot"));
      mockUploadScreenshot.mockResolvedValue("https://storage.googleapis.com/bucket/file.png");

      const req = createMockRequest({ url: "https://example.com" });
      const { res, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        url: "https://storage.googleapis.com/bucket/file.png",
      });
    });

    it("GET request redirects to image URL instead of returning JSON", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockResolvedValue(Buffer.from("screenshot"));
      mockUploadScreenshot.mockResolvedValue("https://storage.googleapis.com/bucket/file.png");

      const req = createMockRequest({}, { url: "https://example.com" }, "GET");
      const { res, jsonMock, redirectMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(mockValidateUrl).toHaveBeenCalledWith("https://example.com");
      expect(redirectMock).toHaveBeenCalledWith(302, "https://storage.googleapis.com/bucket/file.png");
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it("query string takes precedence over body when both are present", async () => {
      mockValidateUrl.mockReturnValue("https://query.example.com");
      mockTakeScreenshot.mockResolvedValue(Buffer.from("screenshot"));
      mockUploadScreenshot.mockResolvedValue("https://storage.googleapis.com/bucket/file.png");

      const req = createMockRequest({ url: "https://body.example.com" }, { url: "https://query.example.com" });
      const { res } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(mockValidateUrl).toHaveBeenCalledWith("https://query.example.com");
    });

    it("calls services in order: validate → screenshot → upload", async () => {
      const callOrder: string[] = [];
      mockValidateUrl.mockImplementation(() => {
        callOrder.push("validate");
        return "https://example.com";
      });
      mockTakeScreenshot.mockImplementation(async () => {
        callOrder.push("screenshot");
        return Buffer.from("data");
      });
      mockUploadScreenshot.mockImplementation(async () => {
        callOrder.push("upload");
        return "https://storage.googleapis.com/url";
      });

      const req = createMockRequest({ url: "https://example.com" });
      const { res } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(callOrder).toEqual(["validate", "screenshot", "upload"]);
    });
  });

  describe("validation errors", () => {
    it("returns 400 on ValidationError", async () => {
      mockValidateUrl.mockImplementation(() => {
        throw new ValidationError("Invalid URL");
      });

      const req = createMockRequest({ url: "ftp://example.com" });
      const { res, statusMock, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: "Invalid URL" });
    });

    it("returns 400 when url field is missing", async () => {
      mockValidateUrl.mockImplementation(() => {
        throw new ValidationError("URL is required");
      });

      const req = createMockRequest({});
      const { res, statusMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("screenshot errors", () => {
    it("returns 422 on ScreenshotError", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockRejectedValue(new ScreenshotError("Failed to take screenshot"));

      const req = createMockRequest({ url: "https://example.com" });
      const { res, statusMock, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: "Failed to take screenshot" });
    });
  });

  describe("storage errors", () => {
    it("returns 500 on StorageError", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockResolvedValue(Buffer.from("screenshot"));
      mockUploadScreenshot.mockRejectedValue(new StorageError("Failed to upload screenshot"));

      const req = createMockRequest({ url: "https://example.com" });
      const { res, statusMock, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: "Failed to upload screenshot" });
    });
  });

  describe("unexpected errors", () => {
    it("returns 500 with generic message on unexpected error", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockRejectedValue(new Error("Unexpected internal error with /secret/path"));

      const req = createMockRequest({ url: "https://example.com" });
      const { res, statusMock, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: "Internal server error" });
    });

    it("does not leak error details for unexpected errors", async () => {
      mockValidateUrl.mockReturnValue("https://example.com");
      mockTakeScreenshot.mockRejectedValue(new Error("Stack trace: /usr/local/lib/node_modules/..."));

      const req = createMockRequest({ url: "https://example.com" });
      const { res, jsonMock } = createMockResponse();

      await screenshotHandler(req as Request, res as Response);

      const responseBody = jsonMock.mock.calls[0][0];
      expect(responseBody.error).not.toContain("/usr/local");
    });
  });
});
