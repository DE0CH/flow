import { saveAs } from 'file-saver'
import JSZip from 'jszip'

import { BookRecord } from './db'
import { getUid } from './firebase'
import {
  getBooks,
  getFile,
  setBook,
  updateBook,
  uploadCover,
  uploadFile,
} from './firebase-books'

export const DATA_FILENAME = 'data.json'

interface SerializedBooks {
  version: number
  books: BookRecord[]
}

const VERSION = 1

function serializeData(books: BookRecord[]) {
  return JSON.stringify({
    version: VERSION,
    books,
  })
}

function deserializeData(text: string): BookRecord[] {
  const { version, books } = JSON.parse(text) as SerializedBooks
  if (version < VERSION) {
    // migrate if needed
  }
  return books
}

export async function pack(uid: string) {
  const books = await getBooks(uid)
  const zip = new JSZip()
  zip.file(DATA_FILENAME, serializeData(books))

  const filesFolder = zip.folder('files')
  const coversFolder = zip.folder('covers')

  await Promise.all(
    books.map(async (book) => {
      const blob = await getFile(uid, book.id)
      if (blob && filesFolder) {
        filesFolder.file(book.name, blob)
      }
      const coverUrl = book.coverUrl
      if (coverUrl && coversFolder) {
        try {
          const res = await fetch(coverUrl)
          const coverBlob = await res.blob()
          coversFolder.file(book.id, coverBlob)
        } catch {
          // ignore failed cover fetch
        }
      }
    }),
  )

  const date = new Intl.DateTimeFormat('fr-CA').format().replaceAll('-', '')
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `flow_backup_${date}.zip`)
}

export async function unpack(file: File) {
  const uid = getUid()
  if (!uid) throw new Error('Sign in to restore backup')

  const zip = new JSZip()
  await zip.loadAsync(file)

  const booksJSON = zip.file(DATA_FILENAME)
  if (!booksJSON) return

  const books = deserializeData(await booksJSON.async('text'))

  for (const book of books) {
    await setBook(uid, book, { merge: true })
  }

  const filesFolder = zip.folder('files')
  if (filesFolder) {
    const entries: { path: string }[] = []
    filesFolder.forEach((path, entry) => {
      if (!entry.dir) entries.push({ path })
    })
    await Promise.all(
      entries.map(async ({ path }) => {
        const name = path.startsWith('files/') ? path.slice(6) : path
        const book = books.find((b) => b.name === name)
        if (!book) return
        const entry = filesFolder.file(path) ?? filesFolder.file(name)
        if (!entry) return
        const blob = await entry.async('blob')
        await uploadFile(uid, book.id, new File([blob], book.name))
      }),
    )
  }

  const coversFolder = zip.folder('covers')
  if (coversFolder) {
    const entries: { path: string }[] = []
    coversFolder.forEach((path, entry) => {
      if (!entry.dir) entries.push({ path })
    })
    await Promise.all(
      entries.map(async ({ path }) => {
        const id = path.startsWith('covers/') ? path.slice(7) : path
        const entry = coversFolder.file(path) ?? coversFolder.file(id)
        if (!entry) return
        const blob = await entry.async('blob')
        const url = await uploadCover(uid, id, blob)
        await updateBook(uid, id, { coverUrl: url })
      }),
    )
  }
}
