import { useEffect, useState } from 'react'
import {
  collection, doc, onSnapshot, query, orderBy,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useDoc<T = DocumentData>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, path)
    return onSnapshot(ref, snap => {
      setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null)
      setLoading(false)
    })
  }, [path])

  return { data, loading }
}

export function useCollection<T = DocumentData>(
  path: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = query(collection(db, path), ...constraints)
    return onSnapshot(ref, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as T))
      setLoading(false)
    })
  }, [path])

  return { data, loading }
}

export function useSubCollection<T = DocumentData>(
  parentPath: string,
  subCollection: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!parentPath) return
    const ref = query(collection(db, parentPath, subCollection), ...constraints)
    return onSnapshot(ref, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as T))
      setLoading(false)
    })
  }, [parentPath, subCollection])

  return { data, loading }
}

export { orderBy }
