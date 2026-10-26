import "server-only";
import { db } from "@/server/db";

export type Bucket = "receipts" | "proofs" | "payqr";

const ALLOWED = new Set(["image/jpeg", "image/webp", "image/png"]);

export async function uploadImage(bucket: Bucket, path: string, file: File, maxBytes: number) {
  if (!ALLOWED.has(file.type)) throw new Error("Only JPEG, PNG or WebP images are allowed.");
  if (file.size > maxBytes)
    throw new Error(`Image is too large (max ${Math.round(maxBytes / 1024)} KB).`);
  const { error } = await db()
    .storage.from(bucket)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Short-lived link to a private image, only ever created after the access gate allowed it. */
export async function signedUrl(
  bucket: Bucket,
  path: string,
  seconds = 600,
  download?: string,
): Promise<string | null> {
  const { data } = await db().storage.from(bucket).createSignedUrl(path, seconds, { download });
  return data?.signedUrl ?? null;
}

export async function removeImages(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length) await db().storage.from(bucket).remove(paths);
}
