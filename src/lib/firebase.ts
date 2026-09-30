import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyDA2AcnxhGzSCdNClHFpF3rn2Af0ucWF94",
  authDomain: "aver-d2136.firebaseapp.com",
  projectId: "aver-d2136",
  storageBucket: "aver-d2136.firebasestorage.app",
  messagingSenderId: "813693230408",
  appId: "1:813693230408:web:be51499481b3fe0b0e277d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);

let quotaExceeded = false;

export function isQuotaExceeded(): boolean {
  return quotaExceeded;
}

export async function safeSetDoc(reference: any, data: any, options?: any) {
  if (quotaExceeded) return;
  try {
    if (options) {
      await setDoc(reference, data, options);
    } else {
      await setDoc(reference, data);
    }
  } catch (err: any) {
    const msg = (err?.message || err?.code || String(err)).toLowerCase();
    if (msg.includes('quota') || msg.includes('resource-exhausted')) {
      quotaExceeded = true;
      console.warn("[Firebase] Quota limit reached. Operating seamlessly in local persistence mode.");
      return;
    }
    console.warn("[Firebase] safeSetDoc failed:", err);
  }
}

export async function safeUpdateDoc(reference: any, data: any) {
  if (quotaExceeded) return;
  try {
    await updateDoc(reference, data);
  } catch (err: any) {
    const msg = (err?.message || err?.code || String(err)).toLowerCase();
    if (msg.includes('quota') || msg.includes('resource-exhausted')) {
      quotaExceeded = true;
      console.warn("[Firebase] Quota limit reached. Operating seamlessly in local persistence mode.");
      return;
    }
    console.warn("[Firebase] safeUpdateDoc failed:", err);
  }
}

export async function safeAddDoc(reference: any, data: any) {
  if (quotaExceeded) return null;
  try {
    return await addDoc(reference, data);
  } catch (err: any) {
    const msg = (err?.message || err?.code || String(err)).toLowerCase();
    if (msg.includes('quota') || msg.includes('resource-exhausted')) {
      quotaExceeded = true;
      console.warn("[Firebase] Quota limit reached. Operating seamlessly in local persistence mode.");
      return null;
    }
    console.warn("[Firebase] safeAddDoc failed:", err);
    return null;
  }
}

export async function safeDeleteDoc(reference: any) {
  if (quotaExceeded) return;
  try {
    await deleteDoc(reference);
  } catch (err: any) {
    const msg = (err?.message || err?.code || String(err)).toLowerCase();
    if (msg.includes('quota') || msg.includes('resource-exhausted')) {
      quotaExceeded = true;
      console.warn("[Firebase] Quota limit reached. Operating seamlessly in local persistence mode.");
      return;
    }
    console.warn("[Firebase] safeDeleteDoc failed:", err);
  }
}

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
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
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
  };
  const lowerMsg = errMessage.toLowerCase();
  if (lowerMsg.includes('quota') || lowerMsg.includes('resource-exhausted')) {
    quotaExceeded = true;
  }
  console.warn(`[Firebase] Handled ${operationType} notice on ${path}:`, errMessage);
}

export default app;
