import { useState } from "react"
import { Copy, Download, ExternalLink, FileSearch2, Loader2 } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useExportDetailQuery, useExportEventsQuery, usePresignMutation } from "@/lib/hooks"
import { formatBytes, formatDateTime, formatNumber } from "@/lib/utils"

function ProgressBlock({
  status,
  progressCurrent,
  progressTotal,
}: {
  status: string
  progressCurrent: number
  progressTotal: number
}) {
  if (status === "RUNNING" && progressTotal <= 0) {
    return (
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded bg-primary" />
        </div>
        <p className="text-xs text-muted-foreground">Processing genomic dataset...</p>
      </div>
    )
  }

  const percent = progressTotal > 0 ? Math.min(100, Math.round((progressCurrent / progressTotal) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded bg-muted">
        <div className="h-full rounded bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatNumber(progressCurrent)} / {formatNumber(progressTotal)} rows ({percent}%)
      </p>
    </div>
  )
}

export function ExportDetail() {
  const { id } = useParams()
  const { toast } = useToast()
  const { data: job, isLoading, isError, error, refetch } = useExportDetailQuery(id)
  const { data: events = [], isLoading: eventsLoading } = useExportEventsQuery(id)
  const presignMutation = usePresignMutation()

  const [downloadUrl, setDownloadUrl] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [previewError, setPreviewError] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)

  const handleCopyId = async () => {
    if (!job) return
    await navigator.clipboard.writeText(job.id)
    toast({ title: "Copied", description: "Report ID copied to clipboard." })
  }

  const ensurePresignedUrl = async () => {
    if (!job) return ""
    const result = await presignMutation.mutateAsync(job.id)
    setDownloadUrl(result.url)
    return result.url
  }

  const handleDownload = async () => {
    if (!job) return

    try {
      const url = await ensurePresignedUrl()
      if (!url) return
      window.open(url, "_blank", "noopener,noreferrer")
      toast({ title: "Download started", description: `Secure link generated for ${job.file_format}.` })
    } catch (presignError) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: presignError instanceof Error ? presignError.message : "Could not fetch report link",
      })
    }
  }

  const handleCopyLink = async () => {
    if (!job) return

    try {
      const url = await ensurePresignedUrl()
      if (!url) return
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Presigned URL copied to clipboard." })
    } catch (presignError) {
      toast({
        variant: "destructive",
        title: "Copy link failed",
        description: presignError instanceof Error ? presignError.message : "Could not generate link",
      })
    }
  }

  const handleLoadPreview = async () => {
    if (!job || job.status !== "READY") return

    setPreviewLoading(true)
    setPreviewText("")
    setPreviewError("")

    try {
      if (job.file_format !== "csv") {
        setPreviewError("Inline preview is available for CSV reports. For ZIP reports, use download.")
        return
      }

      const url = downloadUrl || (await ensurePresignedUrl())
      if (!url) return

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Preview request failed (${response.status})`)
      }

      const content = await response.text()
      const lines = content.split("\n").slice(0, 25).join("\n")
      setPreviewText(lines)
    } catch (previewErr) {
      setPreviewError(previewErr instanceof Error ? previewErr.message : "Could not load preview content")
    } finally {
      setPreviewLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    )
  }

  if (isError || !job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load pipeline report</CardTitle>
          <CardDescription>{error instanceof Error ? error.message : "Report not found"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => refetch()}>Retry</Button>
            <Button asChild variant="outline">
              <Link to="/exports">Back to reports</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-1">
              <CardTitle className="font-mono text-sm">{job.id}</CardTitle>
              <CardDescription>NGS report job details and processing telemetry</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} />
              <Button variant="outline" size="sm" onClick={handleCopyId} className="gap-2">
                <Copy className="h-4 w-4" /> Copy ID
              </Button>
              {job.status === "READY" ? (
                <>
                  <Button size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Copy Link
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <ProgressBlock status={job.status} progressCurrent={job.progress_current} progressTotal={job.progress_total} />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Rows</p>
            <p className="text-sm font-medium">{formatNumber(job.row_count)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Size</p>
            <p className="text-sm font-medium">{formatBytes(job.file_size_bytes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium">{job.duration_ms ? `${Math.round(job.duration_ms / 1000)}s` : "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{formatDateTime(job.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="text-sm font-medium">{formatDateTime(job.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Finished</p>
            <p className="text-sm font-medium">{formatDateTime(job.finished_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="text-sm font-medium">{formatDateTime(job.expires_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bucket</p>
            <p className="text-sm font-medium">{job.s3_bucket || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Object Key</p>
            <p className="truncate text-sm font-medium" title={job.s3_key || ""}>{job.s3_key || "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch2 className="h-4 w-4" /> Generated Content
          </CardTitle>
          <CardDescription>Preview first lines of CSV output or use direct download for full artifact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleLoadPreview} disabled={job.status !== "READY" || previewLoading}>
              {previewLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading preview...</span>
              ) : (
                "Load Preview"
              )}
            </Button>
            {job.status === "READY" ? (
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" /> Download Report
              </Button>
            ) : null}
          </div>

          {previewError ? <p className="text-sm text-amber-300">{previewError}</p> : null}
          {previewText ? (
            <pre className="max-h-80 overflow-auto rounded-md border bg-background p-3 text-xs">{previewText}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">No preview loaded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Events</CardTitle>
          <CardDescription>Task-level logs emitted during report generation and storage upload.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <Skeleton className="h-28" />
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events available for this report yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{event.level}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">{event.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
