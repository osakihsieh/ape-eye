import { validateUrl, ValidationError } from "../../../src/services/validation.service";

describe("validateUrl", () => {
  describe("valid URLs", () => {
    it("accepts http URL", () => {
      const result = validateUrl("http://example.com");
      expect(result).toBe("http://example.com");
    });

    it("accepts https URL", () => {
      const result = validateUrl("https://example.com");
      expect(result).toBe("https://example.com");
    });

    it("accepts URL with path", () => {
      const result = validateUrl("https://example.com/path/to/page");
      expect(result).toBe("https://example.com/path/to/page");
    });

    it("accepts URL with query string", () => {
      const result = validateUrl("https://example.com?foo=bar&baz=qux");
      expect(result).toBe("https://example.com?foo=bar&baz=qux");
    });

    it("accepts URL with subdomain", () => {
      const result = validateUrl("https://www.google.com");
      expect(result).toBe("https://www.google.com");
    });
  });

  describe("invalid URLs", () => {
    it("throws ValidationError for empty string", () => {
      expect(() => validateUrl("")).toThrow(ValidationError);
      expect(() => validateUrl("")).toThrow("URL is required");
    });

    it("throws ValidationError for URL without scheme", () => {
      expect(() => validateUrl("example.com")).toThrow(ValidationError);
      expect(() => validateUrl("example.com")).toThrow("Invalid URL");
    });

    it("throws ValidationError for ftp:// scheme", () => {
      expect(() => validateUrl("ftp://example.com")).toThrow(ValidationError);
      expect(() => validateUrl("ftp://example.com")).toThrow("Only http and https URLs are allowed");
    });

    it("throws ValidationError for file:// scheme", () => {
      expect(() => validateUrl("file:///etc/passwd")).toThrow(ValidationError);
      expect(() => validateUrl("file:///etc/passwd")).toThrow("Only http and https URLs are allowed");
    });

    it("throws ValidationError for javascript: scheme", () => {
      expect(() => validateUrl("javascript:alert(1)")).toThrow(ValidationError);
    });

    it("throws ValidationError for URL exceeding max length", () => {
      const longUrl = "https://example.com/" + "a".repeat(2048);
      expect(() => validateUrl(longUrl)).toThrow(ValidationError);
      expect(() => validateUrl(longUrl)).toThrow("URL is too long");
    });

    it("throws ValidationError for non-string input", () => {
      expect(() => validateUrl(null as unknown as string)).toThrow(ValidationError);
      expect(() => validateUrl(undefined as unknown as string)).toThrow(ValidationError);
      expect(() => validateUrl(123 as unknown as string)).toThrow(ValidationError);
    });
  });
});
