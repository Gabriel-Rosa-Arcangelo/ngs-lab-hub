export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
const TOKEN_STORAGE_KEY = "leh_access_token"

export type ExportStatus = "PENDING" | "RUNNING" | "READY" | "FAILED" | "EXPIRED" | "CANCELED"
export type ExportKind = "RAW_TABLE" | "TAT_SUMMARY" | "NGS_TRIMMING_REPORT" | "NGS_PIPELINE_REPORT"
export type ExportFormat = "csv" | "xlsx" | "zip"
export type NgsPipelineStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"

export interface ExportJob {
  id: string
  status: ExportStatus
  kind: ExportKind
  file_format: ExportFormat
  params: Record<string, unknown>
  row_count: number
  file_size_bytes: number
  duration_ms: number
  progress_current: number
  progress_total: number
  progress_percent?: number
  s3_bucket: string
  s3_key: string
  expires_at: string | null
  error_message: string
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface AuthTokenPayload {
  username: string
  password: string
}

export interface NgsSequence {
  id: number
  sample_id: string
  sequence: string
  platform: string
  raw_reads: number
  trimmed_reads: number
  aligned_reads: number
  read_length: number
  q30_rate_percent: number
  mean_depth: number
  variant_count: number
  pipeline_status: NgsPipelineStatus
  trim_rate_percent: number
  alignment_rate_percent: number
  created_at: string
  updated_at: string
}

export interface CreateNgsSequencePayload {
  sample_id: string
  sequence: string
  platform: string
  raw_reads: number
  trimmed_reads: number
  aligned_reads: number
  read_length: number
  q30_rate_percent: number
  mean_depth: number
  variant_count: number
  pipeline_status: NgsPipelineStatus
}

export interface UpdateNgsSequencePayload extends Partial<CreateNgsSequencePayload> {}

export interface ExportEvent {
  id: number
  level: "INFO" | "WARNING" | "ERROR"
  message: string
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CreateExportPayload {
  kind: ExportKind
  format: ExportFormat
  params: {
    days: number
  }
}

export interface PresignResponse {
  url: string
  expires_in: number
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function getStoredToken() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? ""
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") return
  const trimmed = token.trim()
  if (!trimmed) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
}

function clearStoredToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getStoredTokenPreview() {
  const token = getStoredToken()
  if (!token) return ""
  if (token.length <= 18) return token
  return `${token.slice(0, 10)}...${token.slice(-6)}`
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl
  }
  return `${API_BASE_URL}${pathOrUrl}`
}

export async function apiRequest<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(toAbsoluteUrl(pathOrUrl), {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let parsedData: { detail?: unknown; message?: unknown; code?: unknown } | null = null
    try {
      const data = await response.json()
      parsedData = data
      if (typeof data?.detail === "string") {
        message = data.detail
      } else if (typeof data?.message === "string") {
        message = data.message
      }
    } catch {
      // ignore parsing errors for non-JSON responses
    }
    const isInvalidJwt =
      response.status === 401 &&
      (
        parsedData?.code === "token_not_valid" ||
        (typeof parsedData?.detail === "string" && parsedData.detail.toLowerCase().includes("token not valid"))
      )

    if (isInvalidJwt) {
      clearStoredToken()
      message = "Session expired. Authenticate again in the Token button (demo/demo1234)."
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function obtainToken(payload: AuthTokenPayload) {
  return apiRequest<TokenPair>("/api/auth/token/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getExportsPage(pathOrUrl = "/api/exports/") {
  return apiRequest<PaginatedResponse<ExportJob>>(pathOrUrl)
}

export async function getAllExports() {
  const records: ExportJob[] = []
  let next: string | null = "/api/exports/"

  while (next) {
    const page = await getExportsPage(next)
    records.push(...page.results)
    next = page.next
  }

  return records
}

export async function getNgsSequencesPage(pathOrUrl = "/api/ngs/sequences/") {
  return apiRequest<PaginatedResponse<NgsSequence>>(pathOrUrl)
}

export async function getAllNgsSequences() {
  const records: NgsSequence[] = []
  let next: string | null = "/api/ngs/sequences/"

  while (next) {
    const page = await getNgsSequencesPage(next)
    records.push(...page.results)
    next = page.next
  }

  return records
}

export function getExportById(id: string) {
  return apiRequest<ExportJob>(`/api/exports/${id}/`)
}

export function getExportEvents(id: string) {
  return apiRequest<ExportEvent[]>(`/api/exports/${id}/events/`)
}

export function createExport(payload: CreateExportPayload) {
  return apiRequest<ExportJob>("/api/exports/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getPresignedLink(id: string) {
  return apiRequest<PresignResponse>(`/api/exports/${id}/presign/`, {
    method: "POST",
  })
}

export function createNgsSequence(payload: CreateNgsSequencePayload) {
  return apiRequest<NgsSequence>("/api/ngs/sequences/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateNgsSequence(id: number, payload: UpdateNgsSequencePayload) {
  return apiRequest<NgsSequence>(`/api/ngs/sequences/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteNgsSequence(id: number) {
  return apiRequest<void>(`/api/ngs/sequences/${id}/`, {
    method: "DELETE",
  })
}
