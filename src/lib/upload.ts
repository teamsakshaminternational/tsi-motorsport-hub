import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media";

/** Compress an image in the browser and convert it to WebP. */
export async function compressToWebp(file: Blob, maxSize = 1800, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("Could not compress this image");
  return blob;
}

/** Compress to WebP, upload to the public media bucket, and return its permanent URL. */
export async function uploadImage(file: File, folder = "uploads"): Promise<string> {
  const webp = await compressToWebp(file);
  const path = `${folder}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, webp, { contentType: "image/webp", upsert: false });
  if (error) throw error;

  await uploadThumbnail(file, path);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Small copy stored next to the original as "<name>-sm.webp" (used for grids and avatars). */
export async function uploadThumbnail(file: Blob, path: string, maxSize = 720) {
  try {
    const small = await compressToWebp(file, maxSize, 0.8);
    await supabase.storage
      .from(BUCKET)
      .upload(path.replace(/\.webp$/, "-sm.webp"), small, { contentType: "image/webp", upsert: true });
  } catch {
    // The site falls back to the full image if the small copy is missing.
  }
}
