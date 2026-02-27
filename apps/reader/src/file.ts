import { v4 as uuidv4 } from 'uuid'

import ePub, { Book } from '@flow/epubjs'

import { BookRecord } from './db'
import {
  getBooks,
  getFile,
  setBook,
  updateBook,
  uploadCover,
  uploadFile,
} from './firebase-books'
import { getUid } from './firebase'
import { mapExtToMimes } from './mime'
import { unpack } from './sync'

export async function fileToEpub(file: File | Blob) {
  const data = await file.arrayBuffer()
  return ePub(data)
}

export async function handleFiles(files: Iterable<File>) {
  const uid = getUid()
  if (!uid) return []
  const books = await getBooks(uid)
  const newBooks: BookRecord[] = []

  for (const file of files) {
    if (mapExtToMimes['.zip'].includes(file.type)) {
      await unpack(file)
      continue
    }

    if (!mapExtToMimes['.epub'].includes(file.type)) {
      console.error(`Unsupported file type: ${file.type}`)
      continue
    }

    let book = books.find((b) => b.name === file.name)
    if (!book) {
      book = await addBook(file)
    }
    if (book) newBooks.push(book)
  }

  return newBooks
}

export async function addBook(file: File): Promise<BookRecord> {
  const uid = getUid()
  if (!uid) throw new Error('Sign in to add books')

  const epub = await fileToEpub(file)
  const metadata = await epub.loaded.metadata

  const book: BookRecord = {
    id: uuidv4(),
    name: file.name || `${metadata.title}.epub`,
    size: file.size,
    metadata,
    createdAt: Date.now(),
    definitions: [],
    annotations: [],
  }

  await setBook(uid, book)
  await uploadFile(uid, book.id, file)

  const coverUrl = await epub.coverUrl()
  if (coverUrl) {
    const res = await fetch(coverUrl)
    const coverBlob = await res.blob()
    const url = await uploadCover(uid, book.id, coverBlob)
    await updateBook(uid, book.id, { coverUrl: url })
    book.coverUrl = url
  }

  return book
}

/** Upload file and cover for an existing book (e.g. restore from backup). */
export async function addFile(
  uid: string,
  id: string,
  file: File,
  epub?: Book,
): Promise<void> {
  await uploadFile(uid, id, file)
  const book = epub ?? (await fileToEpub(file))
  const coverUrl = await book.coverUrl()
  if (coverUrl) {
    const res = await fetch(coverUrl)
    const coverBlob = await res.blob()
    const url = await uploadCover(uid, id, coverBlob)
    await updateBook(uid, id, { coverUrl: url })
  }
}

export function readBlob(fn: (reader: FileReader) => void) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(reader.result as string)
    })
    fn(reader)
  })
}

export async function getBookFile(bookId: string): Promise<Blob | null> {
  const uid = getUid()
  if (!uid) return null
  return getFile(uid, bookId)
}

export async function fetchBook(url: string): Promise<BookRecord> {
  const uid = getUid()
  const filename =
    decodeURIComponent(/\/([^/]*\.epub)$/i.exec(url)?.[1] ?? '') || 'book.epub'

  if (uid) {
    const books = await getBooks(uid)
    const existing = books.find((b) => b.name === filename)
    if (existing) return existing
  }

  const res = await fetch(url)
  const blob = await res.blob()
  return addBook(new File([blob], filename))
}
