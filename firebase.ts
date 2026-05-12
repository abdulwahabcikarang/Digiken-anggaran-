import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { AppState } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export const sendMagicLink = async (email: string) => {
    const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
    };
    
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
};

export const checkMagicLink = async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Tolong masukkan email Anda untuk konfirmasi:');
        }
        
        if (email) {
            try {
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                
                // Clear the URL so we don't try to log in again on refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            } catch (error) {
                console.error("Error signing in with email link", error);
                throw error;
            }
        }
    }
    return false;
};

export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// Error Handler defined by the instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Function to fetch state
export const fetchUserState = async (userId: string): Promise<Partial<AppState> | null> => {
    const p = `userState/${userId}`;
    console.log("Fetching state from Firebase for", userId);
    try {
        const docRef = doc(db, 'userState', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("State fetched successfully from Firebase");
            return docSnap.data() as Partial<AppState>;
        }
        console.log("No state found in Firebase for", userId);
        return null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, p);
        return null; // Will not reach here because handle throws
    }
};

// Function to save state
export const saveUserState = async (userId: string, stateToSave: Partial<AppState>) => {
    const p = `userState/${userId}`;
    console.log("saveUserState called for", userId, "with data size:", JSON.stringify(stateToSave).length);
    try {
        const docRef = doc(db, 'userState', userId);
        
        // Ensure no undefined values are passed to Firestore
        const cleanState = JSON.parse(JSON.stringify(stateToSave));
        
        await setDoc(docRef, cleanState); 
        console.log("saveUserState successful");
    } catch (error) {
        console.error("saveUserState error", error);
        handleFirestoreError(error, OperationType.WRITE, p);
    }
};

// Test connection
import { getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

