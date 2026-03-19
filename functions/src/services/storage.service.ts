import admin from "firebase-admin";
import { STORAGE_FOLDER, SIGNED_URL_EXPIRY_MS } from "../config/constants";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

function generateFileName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${STORAGE_FOLDER}/${timestamp}-${random}.png`;
}

export async function uploadScreenshot(buffer: Buffer): Promise<string> {
  try {
    const bucket = admin.storage().bucket();
    const fileName = generateFileName();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, { metadata: { contentType: "image/png" } });

    const expiryDate = new Date(Date.now() + SIGNED_URL_EXPIRY_MS);
    const [signedUrl] = await fileRef.getSignedUrl({
      action: "read",
      expires: expiryDate,
    });

    return signedUrl;
  } catch {
    throw new StorageError("Failed to upload screenshot");
  }
}
