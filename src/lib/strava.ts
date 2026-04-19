const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET as string

export function stravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number }
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...body }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Strava token error ${res.status}: ${detail}`)
  }
  return res.json() as Promise<TokenResponse>
}

export const exchangeCode = (code: string) =>
  postToken({ code, grant_type: 'authorization_code' })

export const refreshAccessToken = (refresh_token: string) =>
  postToken({ refresh_token, grant_type: 'refresh_token' })

// ─── Activity types ──────────────────────────────────────────────────────────

export interface StravaRun {
  id: number
  name: string
  sport_type: string
  start_date: string          // ISO 8601
  distance: number            // meters
  moving_time: number         // seconds
  total_elevation_gain: number // meters
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  suffer_score?: number
}

export async function fetchActivities(
  accessToken: string,
  opts: { after?: number; page?: number; perPage?: number } = {},
): Promise<StravaRun[]> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 50),
    ...(opts.after != null ? { after: String(opts.after) } : {}),
  })
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json() as Promise<StravaRun[]>
}
