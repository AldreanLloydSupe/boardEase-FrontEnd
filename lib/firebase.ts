import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(Boolean);
const app = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

function createFirebaseAuth(firebaseApp: FirebaseApp) {
  // Browser Auth restores local persistence across reloads; native uses AsyncStorage.
  if (Platform.OS === "web") return getAuth(firebaseApp);
  try {
    const storage = ReactNativeAsyncStorage;
    // Firebase exposes this helper through its React Native build condition.
    // The web-oriented TypeScript entrypoint does not list it in its typings.
    const getReactNativePersistence = (
      firebaseAuth as typeof firebaseAuth & {
        getReactNativePersistence: (storage: unknown) => unknown;
      }
    ).getReactNativePersistence;
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(storage) as never,
    });
  } catch {
    // Fast refresh may have initialized Auth already.
    return getAuth(firebaseApp);
  }
}

export const auth = app ? createFirebaseAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
