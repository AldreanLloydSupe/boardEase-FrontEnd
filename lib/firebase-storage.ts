import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

type ClosableBlob = Blob & { close?: () => void };

function loadImageBlob(imageUri: string): Promise<ClosableBlob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const blob = xhr.response as ClosableBlob | null;
      if (!blob || typeof blob.size !== "number" || blob.size === 0) {
        reject(new Error("The selected photo could not be read. Please choose it again."));
        return;
      }
      resolve(blob);
    };
    xhr.onerror = () => reject(new TypeError("Network request failed while reading the selected photo."));
    xhr.ontimeout = () => reject(new TypeError("The photo took too long to load. Please try again."));
    xhr.responseType = "blob";
    xhr.open("GET", imageUri, true);
    xhr.send(null);
  });
}

export async function uploadImageDataUrl(path: string, value: string) {
  if (/^https:\/\//.test(value)) return value;
  if (!storage)
    throw new Error("Firebase Storage is not ready. Check your connection and try again.");

  const dataUrlMatch = value.match(/^data:(image\/(?:jpeg|png|webp));base64,[\s\S]+$/);
  const isLocalUri = /^(?:file|content):\/\//.test(value);
  if (!dataUrlMatch && !isLocalUri)
    throw new Error("The selected photo format is not supported. Choose a JPEG, PNG, or WebP image.");

  let blob: ClosableBlob | undefined;
  try {
    blob = await loadImageBlob(value);
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, blob, {
      contentType: dataUrlMatch?.[1] || blob.type || "image/jpeg",
      cacheControl: "public,max-age=3600",
    });
    return await getDownloadURL(imageRef);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Please check your connection and try again.";
    throw new Error(`Unable to upload the photo. ${message}`);
  } finally {
    // React Native's Blob polyfill exposes close(); browsers release the blob normally.
    blob?.close?.();
  }
}
