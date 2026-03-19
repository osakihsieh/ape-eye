export const MOCK_SCREENSHOT_BUFFER = Buffer.from("fake-screenshot-data");
export const MOCK_STORAGE_URL = "https://storage.googleapis.com/test-bucket/screenshots/123-abc.png?token=xyz";
export const VALID_URL = "https://example.com";
export const INVALID_URL_FTP = "ftp://example.com";
export const INVALID_URL_NO_SCHEME = "example.com";
export const INVALID_URL_EMPTY = "";

export function createMockBuffer(content = "fake-data"): Buffer {
  return Buffer.from(content);
}
