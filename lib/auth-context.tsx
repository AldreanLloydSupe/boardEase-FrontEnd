import {
  createUserWithEmailAndPassword,
  deleteUser,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db, isFirebaseConfigured } from "./firebase";

type Role = "admin" | "user";
type AuthContextValue = {
  user: User | null;
  profilePhoto: string | null;
  role: Role | null;
  hasRoom: boolean;
  loading: boolean;
  firebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phone: string,
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfilePhoto: (uri: string) => Promise<void>;
  updateUserProfile: (profile: {
    name: string;
    phone: string;
    emergencyContact: string;
  }) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const firebaseSetupMessage =
  "Firebase is not configured. Add the values from frontend/.env and restart Expo.";

function firebaseErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function readableAuthError(error: unknown) {
  switch (firebaseErrorCode(error)) {
    case "auth/email-already-in-use":
      return new Error(
        "This email already has an account. Use Log In or reset your password.",
      );
    case "auth/invalid-email":
      return new Error("Enter a valid email address.");
    case "auth/weak-password":
      return new Error("Your password must be at least 6 characters.");
    case "permission-denied":
    case "firestore/permission-denied":
      return new Error(
        "Firebase denied the profile save. Make sure the deployed Firestore rules are up to date.",
      );
    case "failed-precondition":
      return new Error(
        "Firestore is not ready yet. Create the Firestore database in Firebase Console, then try again.",
      );
    case "auth/network-request-failed":
      return new Error("Check your internet connection and try again.");
    default:
      return error instanceof Error ? error : new Error("Please try again.");
  }
}

async function loadSession(nextUser: User) {
  const token = await getIdTokenResult(nextUser, true);
  if (token.claims.admin === true || token.claims.role === "landlord")
    return { role: "admin" as const, hasRoom: false };
  const profile = db ? await getDoc(doc(db, "users", nextUser.uid)) : null;
  const data = profile?.data();
  return {
    role: "user" as const,
    hasRoom: data?.hasRoom === true || Boolean(data?.roomId),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [hasRoom, setHasRoom] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  useEffect(() => {
    if (!auth) return;
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async (nextUser) => {
      stopProfile?.();
      stopProfile = undefined;
      if (!nextUser) {
        setUser(null);
        setProfilePhoto(null);
        setRole(null);
        setHasRoom(false);
        setLoading(false);
        return;
      }
      try {
        const session = await loadSession(nextUser);
        setUser(nextUser);
        setProfilePhoto(nextUser.photoURL);
        setRole(session.role);
        setHasRoom(session.hasRoom);
        if (session.role === "user" && db) {
          stopProfile = onSnapshot(
            doc(db, "users", nextUser.uid),
            (profile) => {
              const data = profile.data();
              setHasRoom(data?.hasRoom === true || Boolean(data?.roomId));
            },
          );
        }
      } catch {
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      stopProfile?.();
      stopAuth();
    };
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profilePhoto,
      role,
      hasRoom,
      loading,
      firebaseReady: isFirebaseConfigured,
      async signIn(email, password) {
        if (!auth) throw new Error(firebaseSetupMessage);
        if (!email.trim() || !password)
          throw new Error("Enter your email and password.");
        try {
          const credential = await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password,
          );
          const session = await loadSession(credential.user);
          setUser(credential.user);
          setProfilePhoto(credential.user.photoURL);
          setRole(session.role);
          setHasRoom(session.hasRoom);
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            (error as { code?: string }).code === "auth/invalid-credential"
          )
            throw new Error("Incorrect email or password.");
          throw error;
        }
      },
      async signUp(name, email, password, phone) {
        if (!auth || !db) throw new Error(firebaseSetupMessage);
        let createdUser: User | null = null;
        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password,
          );
          createdUser = credential.user;
          await updateProfile(createdUser, { displayName: name });
          await setDoc(doc(db, "users", createdUser.uid), {
            name,
            email: email.trim(),
            phone,
            role: "user",
            hasRoom: false,
            createdAt: new Date().toISOString(),
          });
          setUser(createdUser);
          setProfilePhoto(createdUser.photoURL);
          setRole("user");
          setHasRoom(false);
        } catch (error) {
          if (createdUser) {
            try {
              await deleteUser(createdUser);
            } catch {
              // Keep the original signup error; the user can recover via login/reset.
            }
          }
          throw readableAuthError(error);
        }
      },
      async resetPassword(email) {
        if (!auth) throw new Error(firebaseSetupMessage);
        if (!email.trim()) throw new Error("Enter your email address first.");
        await sendPasswordResetEmail(auth, email.trim());
      },
      async signOut() {
        if (auth) await firebaseSignOut(auth);
        setUser(null);
        setProfilePhoto(null);
        setRole(null);
        setHasRoom(false);
      },
      async updateProfilePhoto(uri) {
        if (!auth || !db || !auth.currentUser) {
          throw new Error(firebaseSetupMessage);
        }
        await updateProfile(auth.currentUser, { photoURL: uri });
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { photoURL: uri },
          { merge: true },
        );
        setProfilePhoto(uri);
        setUser(auth.currentUser);
      },
      async updateUserProfile(profile) {
        if (!auth || !db || !auth.currentUser) {
          throw new Error(firebaseSetupMessage);
        }
        await updateProfile(auth.currentUser, { displayName: profile.name });
        await setDoc(doc(db, "users", auth.currentUser.uid), profile, {
          merge: true,
        });
        setUser(auth.currentUser);
      },
    }),
    [hasRoom, loading, profilePhoto, role, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
