import { z } from "zod";
import { MAX_URL_LENGTH, ALLOWED_URL_SCHEMES } from "../config/constants";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const urlSchema = z
  .string({
    required_error: "URL is required",
    invalid_type_error: "URL must be a string",
  })
  .min(1, "URL is required")
  .max(MAX_URL_LENGTH, "URL is too long")
  .refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid URL" }
  )
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return (ALLOWED_URL_SCHEMES as readonly string[]).includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: "Only http and https URLs are allowed" }
  );

export function validateUrl(input: unknown): string {
  const result = urlSchema.safeParse(input);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new ValidationError(firstError.message);
  }

  return result.data;
}
