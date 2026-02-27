import { useBoolean } from '@literal-ui/hooks'
import clsx from 'clsx'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import {
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdOutlineFileDownload,
  MdOutlineShare,
} from 'react-icons/md'
import { useSet } from 'react-use'

import { ReaderGridView, Button, TextField, DropZone } from '../components'
import { BookRecord } from '../db'
import { fetchBook, handleFiles } from '../file'
import { deleteBooks } from '../firebase-books'
import {
  useAuth,
  useDisablePinchZooming,
  useLibrary,
  useMobile,
  useTranslation,
} from '../hooks'
import { reader, useReaderSnapshot } from '../models'
import { lock } from '../styles'
import { signInWithGoogle } from '../firebase'
import { pack } from '../sync'
import { copy } from '../utils'

const placeholder = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="gray" fill-opacity="0" width="1" height="1"/></svg>`

const SOURCE = 'src'

export default function Index() {
  const { user } = useAuth()
  const { focusedTab } = useReaderSnapshot()
  const router = useRouter()
  const src = new URL(window.location.href).searchParams.get(SOURCE)
  const [loading, setLoading] = useState(!!src)

  useDisablePinchZooming()

  useEffect(() => {
    if (!user) {
      if (src) setLoading(false)
      return
    }
    let srcQuery = router.query[SOURCE]
    if (!srcQuery) return
    if (!Array.isArray(srcQuery)) srcQuery = [srcQuery]

    Promise.all(
      srcQuery.map((s) =>
        fetchBook(s).then((b) => {
          reader.addTab(b)
        }),
      ),
    ).finally(() => setLoading(false))
  }, [user, router.query])

  useEffect(() => {
    if ('launchQueue' in window && 'LaunchParams' in window) {
      window.launchQueue.setConsumer((params) => {
        console.log('launchQueue', params)
        if (params.files.length) {
          Promise.all(params.files.map((f) => f.getFile()))
            .then((files) => handleFiles(files))
            .then((books) => books.forEach((b) => reader.addTab(b)))
        }
      })
    }
  }, [])

  useEffect(() => {
    router.beforePopState(({ url }) => {
      if (url === '/') {
        reader.clear()
      }
      return true
    })
  }, [router])

  return (
    <>
      <Head>
        {/* https://github.com/microsoft/vscode/blob/36fdf6b697cba431beb6e391b5a8c5f3606975a1/src/vs/code/browser/workbench/workbench.html#L16 */}
        {/* Disable pinch zooming */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <title>{focusedTab?.title ?? 'Flow'}</title>
      </Head>
      <ReaderGridView />
      {loading || <Library />}
    </>
  )
}

const Library: React.FC = () => {
  const { user } = useAuth()
  const books = useLibrary()
  const t = useTranslation('home')

  const [select, toggleSelect] = useBoolean(false)
  const [selectedBookIds, { add, has, toggle, reset }] = useSet<string>()
  const [deleting, setDeleting] = useState(false)

  const { groups } = useReaderSnapshot()

  useEffect(() => {
    if (!select) reset()
  }, [reset, select])

  if (groups.length) return null
  if (books === undefined) return null

  if (!user) {
    return (
      <div className="scroll-parent flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="typescale-body-large text-on-surface-variant">
          Sign in to add books and sync your library and reading progress
          across devices.
        </p>
        <Button onClick={() => signInWithGoogle().catch(console.error)}>
          Sign in with Google
        </Button>
      </div>
    )
  }

  const selectedBooks = [...selectedBookIds].map(
    (id) => books.find((b) => b.id === id)!,
  )
  const allSelected = selectedBookIds.size === books.length

  return (
    <DropZone
      className="scroll-parent h-full p-4"
      onDrop={(e) => {
        const bookId = e.dataTransfer.getData('text/plain')
        const book = books.find((b) => b.id === bookId)
        if (book) reader.addTab(book)

        handleFiles(e.dataTransfer.files)
      }}
    >
      <div className="mb-4 space-y-2.5">
        <div>
          <TextField
            name={SOURCE}
            placeholder="https://link.to/remote.epub"
            type="url"
            hideLabel
            actions={[
              {
                title: t('share'),
                Icon: MdOutlineShare,
                onClick(el) {
                  if (el?.reportValidity()) {
                    copy(`${window.location.origin}/?${SOURCE}=${el.value}`)
                  }
                },
              },
              {
                title: t('download'),
                Icon: MdOutlineFileDownload,
                onClick(el) {
                  if (el?.reportValidity()) fetchBook(el.value)
                },
              },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-x-2">
            {books.length ? (
              <Button variant="secondary" onClick={toggleSelect}>
                {t(select ? 'cancel' : 'select')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!books}
                onClick={() => {
                  fetchBook(
                    'https://epubtest.org/books/Fundamental-Accessibility-Tests-Basic-Functionality-v1.0.0.epub',
                  )
                }}
              >
                {t('download_sample_book')}
              </Button>
            )}
            {select &&
              (allSelected ? (
                <Button variant="secondary" onClick={reset}>
                  {t('deselect_all')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => books.forEach((b) => add(b.id))}
                >
                  {t('select_all')}
                </Button>
              ))}
          </div>

          <div className="space-x-2">
            {select ? (
              <Button
                disabled={!user || deleting || selectedBookIds.size === 0}
                onClick={async () => {
                  if (!user) return
                  toggleSelect()
                  setDeleting(true)
                  const bookIds = [...selectedBookIds]
                  await deleteBooks(user.uid, bookIds)
                  setDeleting(false)
                }}
              >
                {t('delete')}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  disabled={!user || !books.length}
                  onClick={() => user && pack(user.uid)}
                >
                  {t('export')}
                </Button>
                <Button className="relative">
                  <input
                    type="file"
                    accept="application/epub+zip,application/epub,application/zip"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) handleFiles(files)
                    }}
                    multiple
                  />
                  {t('import')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="scroll h-full">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(calc(80px + 3vw), 1fr))`,
            columnGap: lock(16, 32),
            rowGap: lock(24, 40),
          }}
        >
          {books.map((book) => (
            <Book
              key={book.id}
              book={book}
              select={select}
              selected={has(book.id)}
              toggle={toggle}
            />
          ))}
        </ul>
      </div>
    </DropZone>
  )
}

interface BookProps {
  book: BookRecord
  select?: boolean
  selected?: boolean
  toggle: (id: string) => void
}
const Book: React.FC<BookProps> = ({ book, select, selected, toggle }) => {
  const router = useRouter()
  const mobile = useMobile()
  const Icon = selected ? MdCheckBox : MdCheckBoxOutlineBlank

  return (
    <div className="relative flex flex-col">
      <div
        role="button"
        className="border-inverse-on-surface relative border"
        onClick={async () => {
          if (select) {
            toggle(book.id)
          } else {
            if (mobile) await router.push('/_')
            reader.addTab(book)
          }
        }}
      >
        {book.percentage !== undefined && (
          <div className="typescale-body-large absolute right-0 bg-gray-500/60 px-2 text-gray-100">
            {(book.percentage * 100).toFixed()}%
          </div>
        )}
        <img
          src={book.coverUrl ?? placeholder}
          alt="Cover"
          className="mx-auto aspect-[9/12] object-cover"
          draggable={false}
        />
        {select && (
          <div className="absolute bottom-1 right-1">
            <Icon
              size={24}
              className={clsx(
                '-m-1',
                selected ? 'text-tertiary' : 'text-outline',
              )}
            />
          </div>
        )}
      </div>

      <div
        className="line-clamp-2 text-on-surface-variant typescale-body-small lg:typescale-body-medium mt-2 w-full"
        title={book.name}
      >
        {book.name}
      </div>
    </div>
  )
}
