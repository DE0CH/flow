import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth'
import { collection, getFirestore } from 'firebase/firestore'
import { getStorage, ref } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (getApps().length === 0) {
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId ||
      !firebaseConfig.storageBucket
    ) {
      return null
    }
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

const app = getFirebaseApp()

export const auth = app ? getAuth(app) : null
export const firestore = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

let currentUid: string | null = null

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUid = user?.uid ?? null
  })
}

export function getUid(): string | null {
  return currentUid
}

export function booksRef(uid: string) {
  if (!firestore) return null
  return collection(firestore, 'users', uid, 'books')
}

export function fileRef(uid: string, bookId: string) {
  if (!storage) return null
  return ref(storage, `users/${uid}/files/${bookId}`)
}

export function coverRef(uid: string, bookId: string) {
  if (!storage) return null
  return ref(storage, `users/${uid}/covers/${bookId}`)
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase not configured')
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function signOut() {
  if (!auth) return
  return firebaseSignOut(auth)
}

export type { User }
