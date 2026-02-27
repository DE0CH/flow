import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getBlob, getDownloadURL, uploadBytes } from 'firebase/storage'

import type { BookRecord } from './db'
import {
  booksRef,
  coverRef,
  fileRef,
  firestore,
  storage,
} from './firebase'

function omitUndefined<T extends Record<string, unknown>>(o: T): T {
  const out = { ...o }
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k]
  }
  return out
}

function bookDocRef(uid: string, bookId: string) {
  if (!firestore) return null
  return doc(firestore, 'users', uid, 'books', bookId)
}

export async function getBooks(uid: string): Promise<BookRecord[]> {
  const col = booksRef(uid)
  if (!col) return []
  const snap = await getDocs(col)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BookRecord))
}

export async function getBook(
  uid: string,
  bookId: string,
): Promise<BookRecord | null> {
  const ref = bookDocRef(uid, bookId)
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as BookRecord
}

export async function setBook(
  uid: string,
  book: BookRecord,
  options?: { merge?: boolean },
): Promise<void> {
  const ref = bookDocRef(uid, book.id)
  if (!ref) throw new Error('Firestore not configured')
  const data = omitUndefined({
    ...book,
    id: undefined,
  } as Record<string, unknown>) as Record<string, unknown>
  await setDoc(ref, data, { merge: options?.merge ?? false })
}

export async function updateBook(
  uid: string,
  bookId: string,
  changes: Partial<BookRecord>,
): Promise<void> {
  const ref = bookDocRef(uid, bookId)
  if (!ref) throw new Error('Firestore not configured')
  const data = omitUndefined({
    ...changes,
    updatedAt: Date.now(),
    id: undefined,
  } as Record<string, unknown>)
  if (Object.keys(data).length === 0) return
  await updateDoc(ref, data)
}

export async function deleteBooks(
  uid: string,
  bookIds: string[],
): Promise<void> {
  if (!firestore) return
  await Promise.all(
    bookIds.map((id) => deleteDoc(doc(firestore, 'users', uid, 'books', id))),
  )
  if (!storage) return
  const { deleteObject } = await import('firebase/storage')
  await Promise.all(
    bookIds.flatMap((id) => {
      const f = fileRef(uid, id)
      const c = coverRef(uid, id)
      return [f, c]
        .filter(Boolean)
        .map((r) => (r ? deleteObject(r) : Promise.resolve()))
    }),
  )
}

export async function uploadFile(
  uid: string,
  bookId: string,
  blob: Blob,
): Promise<void> {
  const ref = fileRef(uid, bookId)
  if (!ref) throw new Error('Storage not configured')
  await uploadBytes(ref, blob)
}

export async function uploadCover(
  uid: string,
  bookId: string,
  blob: Blob,
): Promise<string> {
  const ref = coverRef(uid, bookId)
  if (!ref) throw new Error('Storage not configured')
  await uploadBytes(ref, blob)
  return getDownloadURL(ref)
}

export async function getFile(
  uid: string,
  bookId: string,
): Promise<Blob | null> {
  const ref = fileRef(uid, bookId)
  if (!ref) return null
  try {
    return await getBlob(ref)
  } catch {
    return null
  }
}

export async function getCoverUrl(
  uid: string,
  bookId: string,
): Promise<string | null> {
  const ref = coverRef(uid, bookId)
  if (!ref) return null
  try {
    return await getDownloadURL(ref)
  } catch {
    return null
  }
}

export function subscribeBooks(
  uid: string,
  onBooks: (books: BookRecord[]) => void,
): Unsubscribe | null {
  const col = booksRef(uid)
  if (!col) return null
  return onSnapshot(col, (snap) => {
    const books = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as BookRecord[]
    onBooks(books)
  })
}
