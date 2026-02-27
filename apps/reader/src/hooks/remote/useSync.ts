import { useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { Annotation } from '@flow/reader/annotation'
import { BookRecord } from '@flow/reader/db'
import { BookTab } from '@flow/reader/models'
import { updateBook } from '../../firebase-books'
import { useAuth } from '../useAuth'

export function useSync(tab: BookTab) {
  const { user } = useAuth()
  const { location, book } = useSnapshot(tab)
  const id = tab.book.id

  const sync = useCallback(
    (changes: Partial<BookRecord>) => {
      if (!user) return
      updateBook(user.uid, id, changes).catch(console.error)
    },
    [user, id],
  )

  useEffect(() => {
    sync({
      cfi: location?.start.cfi,
      percentage: book.percentage,
    })
  }, [sync, book.percentage, location?.start.cfi])

  useEffect(() => {
    sync({
      definitions: book.definitions as string[],
    })
  }, [book.definitions, sync])

  useEffect(() => {
    sync({
      annotations: book.annotations as Annotation[],
    })
  }, [book.annotations, sync])

  useEffect(() => {
    sync({
      configuration: book.configuration,
    })
  }, [book.configuration, sync])
}
