import { useState } from 'react'
import { doc, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { refreshAccessToken, fetchActivities } from '@/lib/strava'
import { useDoc } from './useFirestore'

export interface StravaAuthDoc {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete_id: number
  connectedAt: string
  lastSyncAt?: string
}

export interface StoredActivity {
  id: string
  stravaId: string
  date: string          // YYYY-MM-DD
  name: string
  distanceKm: number
  elevationGainM: number
  movingTimeMin: number
  avgHR?: number
  maxHR?: number
  sufferScore?: number
  syncedAt: string
}

export function useStrava() {
  const { data: authDoc, loading: authLoading } = useDoc<StravaAuthDoc>('stravaAuth/main')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null)

  const isConnected = !!authDoc?.refresh_token

  const getAccessToken = async (): Promise<string> => {
    if (!authDoc) throw new Error('Strava未接続')
    const now = Math.floor(Date.now() / 1000)
    if (authDoc.expires_at > now + 60) return authDoc.access_token

    const tokens = await refreshAccessToken(authDoc.refresh_token)
    await setDoc(doc(db, 'stravaAuth', 'main'), {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    }, { merge: true })
    return tokens.access_token
  }

  const syncActivities = async (fullSync = false) => {
    setSyncing(true)
    setSyncError(null)
    setLastSyncCount(null)

    try {
      const token = await getAccessToken()

      // incremental: 前回同期より1日前から（時計ズレ対策）
      const after = (!fullSync && authDoc?.lastSyncAt)
        ? Math.floor(new Date(authDoc.lastSyncAt).getTime() / 1000) - 86_400
        : undefined

      const runs: InstanceType<typeof Array<import('@/lib/strava').StravaRun>>[number][] = []
      for (let page = 1; page <= 4; page++) {
        const batch = await fetchActivities(token, { page, perPage: 50, after })
        const running = batch.filter(a =>
          a.sport_type === 'Run' || a.sport_type === 'TrailRun'
        )
        runs.push(...running)
        if (batch.length < 50) break
      }

      if (runs.length > 0) {
        const batch = writeBatch(db)
        for (const run of runs) {
          const stored: StoredActivity = {
            id: String(run.id),
            stravaId: String(run.id),
            date: run.start_date.slice(0, 10),
            name: run.name,
            distanceKm: Math.round(run.distance / 10) / 100,
            elevationGainM: Math.round(run.total_elevation_gain),
            movingTimeMin: Math.round(run.moving_time / 60),
            ...(run.average_heartrate ? { avgHR: Math.round(run.average_heartrate) } : {}),
            ...(run.max_heartrate ? { maxHR: Math.round(run.max_heartrate) } : {}),
            ...(run.suffer_score ? { sufferScore: run.suffer_score } : {}),
            syncedAt: new Date().toISOString(),
          }
          batch.set(doc(db, 'activities', stored.id), stored)
        }
        await batch.commit()
      }

      await setDoc(doc(db, 'stravaAuth', 'main'), {
        lastSyncAt: new Date().toISOString(),
      }, { merge: true })

      setLastSyncCount(runs.length)
      return runs.length
    } catch (e) {
      const msg = e instanceof Error ? e.message : '同期失敗'
      setSyncError(msg)
      throw e
    } finally {
      setSyncing(false)
    }
  }

  return { isConnected, authDoc, authLoading, syncing, syncError, lastSyncCount, syncActivities }
}
