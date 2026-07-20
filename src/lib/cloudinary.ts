import { v2 as cloudinary } from "cloudinary"

/**
 * Upload an image from a remote URL to Cloudinary.
 * Returns the Cloudinary secure_url.
 *
 * If CLOUDINARY_CLOUD_NAME is not configured, returns the original remote URL
 * unchanged (hotlink fallback) — the caller can store it directly and the
 * browser will load it from the origin. This keeps the scraper working end-to-end
 * in dev/preview without a Cloudinary account.
 */
export async function uploadFromUrl(remoteUrl: string): Promise<string> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return remoteUrl // hotlink fallback
  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder: "earmark/org-logos",
    resource_type: "image",
  })
  return result.secure_url
}