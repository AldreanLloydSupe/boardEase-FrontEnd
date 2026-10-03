import type { ImagePickerAsset } from "expo-image-picker";

// Keep documents comfortably below Firestore's 1 MiB limit on the free plan.
export function sharedImage(asset: ImagePickerAsset) {
  if (!asset.base64)
    throw new Error("Image could not be read. Choose another photo.");
  if (asset.base64.length > 500_000)
    throw new Error(
      "Photo too large. Crop or choose a smaller image (under 375 KB).",
    );
  const mime = asset.mimeType || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  return `data:${mime};base64,${asset.base64}`;
}
