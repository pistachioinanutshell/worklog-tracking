import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "b4a05020-4f4d-446b-96db-a3d43efb12aa");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Add Google Sheets and Drive scopes
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.addScope("https://www.googleapis.com/auth/drive.readonly");

// In-memory cache for Google OAuth access token
let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => cachedAccessToken;
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sign in with Google.
 * Tries signInWithPopup first. If the popup is blocked by the browser,
 * falls back to signInWithRedirect (which will reload the page and complete
 * via getGoogleRedirectResult on the next load).
 *
 * Returns the user if popup succeeded, or null if a redirect was initiated.
 * Throws on any other error.
 */
export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }

    // On first login, create user doc
    const userDocRef = doc(db, "users", result.user.uid);
    try {
      const uDoc = await getDoc(userDocRef);
      if (!uDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (e) {
      console.warn("Could not write user record (rules might be strict, that is fine):", e);
    }
    return result.user;
  } catch (error: any) {
    const code: string = error?.code || "";

    // Popup was blocked or closed — fall back to redirect
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      console.warn(`Popup flow failed (${code}). Falling back to redirect flow...`);
      try {
        await signInWithRedirect(auth, googleProvider);
        // Page will reload; result handled in getGoogleRedirectResult()
        return null;
      } catch (redirectErr: any) {
        console.error("Redirect sign-in also failed:", redirectErr);
        throw new Error(
          `Sign-in failed: ${redirectErr?.message || String(redirectErr)}`
        );
      }
    }

    console.error("Error signing in with Google:", error);
    // Rethrow with a human-readable message
    throw new Error(
      getAuthErrorMessage(code) || error?.message || "Google sign-in failed."
    );
  }
};

/**
 * Call this once on app mount to complete any pending redirect sign-in.
 * Returns the user + access token if a redirect was just completed, or null.
 */
export const getGoogleRedirectResult = async (): Promise<{
  user: FirebaseUser;
  accessToken: string | null;
} | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken ?? null;
    if (accessToken) {
      cachedAccessToken = accessToken;
    }

    // Ensure user doc exists
    const userDocRef = doc(db, "users", result.user.uid);
    try {
      const uDoc = await getDoc(userDocRef);
      if (!uDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (e) {
      console.warn("Could not write user record on redirect:", e);
    }

    return { user: result.user, accessToken };
  } catch (error: any) {
    const code: string = error?.code || "";
    console.error("getRedirectResult error:", error);
    // Only throw meaningful errors, not "no pending redirect" which is normal
    if (code && code !== "auth/no-auth-event") {
      throw new Error(
        getAuthErrorMessage(code) || error?.message || "Google sign-in redirect failed."
      );
    }
    return null;
  }
};

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups for this site, or the app will try a redirect instead.";
    case "auth/popup-closed-by-user":
      return "Sign-in window was closed before completing. Please try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in was already in progress. Please try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in. Please add it to your Firebase Console under Authentication → Settings → Authorized Domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled. Please enable it in your Firebase Console under Authentication → Sign-in method.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Please check your internet connection and try again.";
    case "auth/internal-error":
      return "An internal Firebase error occurred. Please try again.";
    default:
      return "";
  }
}

// Sign-out function
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
