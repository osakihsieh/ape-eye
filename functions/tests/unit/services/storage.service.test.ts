import { uploadScreenshot, StorageError } from "../../../src/services/storage.service";

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  storage: jest.fn(),
  apps: [],
  initializeApp: jest.fn(),
}));

import admin from "firebase-admin";

const mockGetSignedUrl = jest.fn();
const mockSave = jest.fn();
const mockFile = jest.fn();
const mockBucket = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  mockGetSignedUrl.mockResolvedValue(["https://storage.googleapis.com/bucket/screenshots/file.png?token=abc"]);
  mockSave.mockResolvedValue(undefined);

  const mockFileInstance = {
    save: mockSave,
    getSignedUrl: mockGetSignedUrl,
  };

  mockFile.mockReturnValue(mockFileInstance);
  mockBucket.mockReturnValue({ file: mockFile });
  (admin.storage as unknown as jest.Mock).mockReturnValue({ bucket: mockBucket });
});

describe("uploadScreenshot", () => {
  it("returns a signed URL on successful upload", async () => {
    const buffer = Buffer.from("fake-image-data");
    const url = await uploadScreenshot(buffer);

    expect(url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
    expect(mockSave).toHaveBeenCalledWith(buffer, { metadata: { contentType: "image/png" } });
  });

  it("saves file under screenshots/ folder", async () => {
    const buffer = Buffer.from("fake-image-data");
    await uploadScreenshot(buffer);

    const filePath: string = mockFile.mock.calls[0][0];
    expect(filePath).toMatch(/^screenshots\//);
    expect(filePath).toMatch(/\.png$/);
  });

  it("generates signed URL with 7-day expiry", async () => {
    const buffer = Buffer.from("fake-image-data");
    await uploadScreenshot(buffer);

    const signedUrlCall = mockGetSignedUrl.mock.calls[0][0];
    expect(signedUrlCall.action).toBe("read");
    expect(signedUrlCall.expires).toBeDefined();
  });

  it("throws StorageError when upload fails", async () => {
    mockSave.mockRejectedValue(new Error("Upload failed"));
    const buffer = Buffer.from("fake-image-data");

    await expect(uploadScreenshot(buffer)).rejects.toThrow(StorageError);
    await expect(uploadScreenshot(buffer)).rejects.toThrow("Failed to upload screenshot");
  });

  it("throws StorageError when getSignedUrl fails", async () => {
    mockGetSignedUrl.mockRejectedValue(new Error("Signing failed"));
    const buffer = Buffer.from("fake-image-data");

    await expect(uploadScreenshot(buffer)).rejects.toThrow(StorageError);
  });

  it("does not expose internal error details", async () => {
    mockSave.mockRejectedValue(new Error("/internal/service-account/key.json leaked"));
    const buffer = Buffer.from("fake-image-data");

    await expect(uploadScreenshot(buffer)).rejects.toThrow(StorageError);
    await expect(uploadScreenshot(buffer)).rejects.not.toThrow("service-account");
  });
});
