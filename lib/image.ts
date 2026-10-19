"use client";

/**
 * Shrinks a photo on the phone before upload: saves mobile data and keeps every image
 * under the free OCR.space 1 MB limit. Receipts stay sharp enough to read at 1600px.
 */
export async function compressImage(
  source: Blob,
  { maxBytes = 950_000, maxSide = 1600 }: { maxBytes?: number; maxSide?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  let side = maxSide;
  let quality = 0.85;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) break;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= maxBytes) {
      bitmap.close();
      return blob;
    }
    if (quality > 0.55) quality -= 0.1;
    else side = Math.round(side * 0.8);
  }
  bitmap.close();
  throw new Error("Couldn't shrink the photo enough. Try again closer to the receipt.");
}

/** Grabs the current frame of a <video> (the live camera) as a Blob. */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Couldn't take the photo.");
  return blob;
}
