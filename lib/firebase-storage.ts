import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadImageDataUrl(path: string, value: string) {
  if (/^https:\/\//.test(value)) return value;
  if (!storage || !/^data:image\/(jpeg|png|webp);base64,/.test(value))
    throw new Error("Firebase Storage is not ready for this image.");
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
  const object = ref(storage, path);
  await uploadString(object, value, "data_url", {
    contentType: match?.[1] || "image/jpeg",
    cacheControl: "public,max-age=3600",
  });
  return getDownloadURL(object);
}
