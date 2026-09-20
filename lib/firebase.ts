import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(Boolean);
const app = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

function createFirebaseAuth(firebaseApp: FirebaseApp) {
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
