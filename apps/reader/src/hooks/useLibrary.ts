import { useEffect, useState } from 'react'

import { subscribeBooks } from '../firebase-books'
import { useAuth } from './useAuth'

export function useLibrary() {
  const { user } = useAuth()
  const [books, setBooks] = useState<import('../db').BookRecord[] | undefined>(
    undefined,
  )

  useEffect(() => {
    if (!user) {
      setBooks([])
      return
    }
    const unsub = subscribeBooks(user.uid, setBooks)
    if (!unsub) {
      setBooks([])
      return
    }
    return () => unsub()
  }, [user?.uid])

  return books
}
