import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db, isFirebaseConfigured } from "./firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phone: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  firebaseReady: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const firebaseSetupMessage =
  "Firebase is not configured. Add the values from frontend/.env.example to frontend/.env and restart Expo.";
const adminMessage =
  "This account is not an administrator. Ask the project owner to promote it in Firebase.";

async function assertAdmin(user: User) {
  const token = await getIdTokenResult(user, true);
  if (token.claims.admin !== true && token.claims.role !== "landlord") {
    await firebaseSignOut(auth!);
    throw new Error(adminMessage);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        await assertAdmin(nextUser);
        setUser(nextUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseReady: isFirebaseConfigured,
      async signIn(email, password) {
        if (!auth) throw new Error(firebaseSetupMessage);
        if (!email.trim() || !password)
          throw new Error("Enter your email and password.");
        let credential;
        try {
          credential = await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            (error as { code?: string }).code === "auth/invalid-credential"
          ) {
            throw new Error(
              "Incorrect email or password. Check that this account uses Email/Password sign-in.",
            );
          }
          throw error;
        }
        await assertAdmin(credential.user);
        setUser(credential.user);
      },
      async resetPassword(email) {
        if (!auth) throw new Error(firebaseSetupMessage);
        if (!email.trim()) throw new Error("Enter your email address first.");
        await sendPasswordResetEmail(auth, email.trim());
      },
      async signUp(name, email, password, phone) {
        if (!auth) throw new Error(firebaseSetupMessage);
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(credential.user, { displayName: name });
        if (db)
          await setDoc(doc(db, "users", credential.user.uid), {
            name,
            email,
            phone,
            role: "user",
          });
        await firebaseSignOut(auth);
        throw new Error(
          "Account created. An administrator must promote this account before it can access the landlord dashboard.",
        );
      },
      async signOut() {
        if (auth) await firebaseSignOut(auth);
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
