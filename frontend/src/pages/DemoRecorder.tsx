import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, DatabaseZap, KeyRound, Link2, Loader2, PlayCircle, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  createExport,
  createNgsSequence,
  getExportById,
  getPresignedLink,
  obtainToken,
  setStoredToken,
  type ExportJob,
} from "@/lib/api"
import { queryKeys } from "@/lib/hooks"
import { formatDateTime } from "@/lib/utils"

type DemoJobState = {
  trimmingId?: string
  pipelineId?: string
  trimmingStatus?: string
  pipelineStatus?: string
  trimmingUrl?: string
  pipelineUrl?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function DemoRecorder() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [username, setUsername] = useState("demo")
  const [password, setPassword] = useState("demo1234")
  const [isRunning, setIsRunning] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isCreatingExports, setIsCreatingExports] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [createdSamples, setCreatedSamples] = useState<string[]>([])
  const [jobState, setJobState] = useState<DemoJobState>({})
  const [logLines, setLogLines] = useState<string[]>([])

  const isBusy = isRunning || isAuthenticating || isSeeding || isCreatingExports || isPolling

  const timeline = useMemo(() => {
    return [...logLines].reverse()
  }, [logLines])

  const pushLog = (line: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`])
  }

  const authenticate = async () => {
    setIsAuthenticating(true)
    try {
      const token = await obtainToken({ username, password })
      setStoredToken(token.access)
      pushLog(`Token saved for user '${username}'.`)
      toast({
        title: "Authenticated",
        description: "JWT access token stored in browser local storage.",
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed"
      pushLog(`Authentication failed: ${message}`)
      toast({
        variant: "destructive",
        title: "Auth failed",
        description: message,
      })
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }

  const seedNgsData = async () => {
    setIsSeeding(true)
    const suffix = Date.now()

    const payloads = [
      {
        sample_id: `DEMO-${suffix}-A`,
        sequence: "ACGTACGTACGTACGT",
        platform: "ILLUMINA",
        raw_reads: 1600000,
        trimmed_reads: 1420000,
        aligned_reads: 1310000,
        read_length: 150,
        q30_rate_percent: 92.1,
        mean_depth: 87.4,
        variant_count: 104,
        pipeline_status: "SUCCEEDED" as const,
      },
      {
        sample_id: `DEMO-${suffix}-B`,
        sequence: "TTGGCCAATTGGCCAA",
        platform: "ILLUMINA",
        raw_reads: 980000,
        trimmed_reads: 860000,
        aligned_reads: 760000,
        read_length: 150,
        q30_rate_percent: 89.9,
        mean_depth: 63.8,
        variant_count: 74,
        pipeline_status: "RUNNING" as const,
      },
      {
        sample_id: `DEMO-${suffix}-C`,
        sequence: "GATTACAGATTACA",
        platform: "ONT",
        raw_reads: 550000,
        trimmed_reads: 500000,
        aligned_reads: 430000,
        read_length: 250,
        q30_rate_percent: 87.2,
        mean_depth: 41.3,
        variant_count: 31,
        pipeline_status: "QUEUED" as const,
      },
    ]

    try {
      const responses = []
      for (const payload of payloads) {
        const sequence = await createNgsSequence(payload)
        responses.push(sequence.sample_id)
      }

      setCreatedSamples(responses)
      pushLog(`Created ${responses.length} NGS sequences: ${responses.join(", ")}.`)
      toast({
        title: "NGS samples created",
        description: `Created ${responses.length} records for demo flow.`,
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create NGS sequences"
      pushLog(`Seed failed: ${message}`)
      toast({
        variant: "destructive",
        title: "Seed failed",
        description: message,
      })
      return false
    } finally {
      setIsSeeding(false)
    }
  }

  const createDemoExports = async () => {
    setIsCreatingExports(true)
    try {
      const trimming = await createExport({
        kind: "NGS_TRIMMING_REPORT",
        format: "csv",
        params: { days: 30 },
      })
      const pipeline = await createExport({
        kind: "NGS_PIPELINE_REPORT",
        format: "zip",
        params: { days: 30 },
      })

      setJobState({
        trimmingId: trimming.id,
        pipelineId: pipeline.id,
        trimmingStatus: trimming.status,
        pipelineStatus: pipeline.status,
      })
      pushLog(`Created export jobs: trimming=${trimming.id.slice(0, 8)}..., pipeline=${pipeline.id.slice(0, 8)}...`)

      await queryClient.invalidateQueries({ queryKey: queryKeys.exports })
      toast({
        title: "Exports queued",
        description: "Trimming CSV and Pipeline ZIP jobs were created.",
      })
      return { trimming, pipeline }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create exports"
      pushLog(`Export creation failed: ${message}`)
      toast({
        variant: "destructive",
        title: "Create export failed",
        description: message,
      })
      return null
    } finally {
      setIsCreatingExports(false)
    }
  }

  const waitForJob = async (jobId: string, label: string): Promise<ExportJob> => {
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      const job = await getExportById(jobId)
      pushLog(`${label} poll ${attempt}: ${job.status}`)

      if (job.status === "READY" || job.status === "FAILED") {
        return job
      }

      await sleep(1000)
    }

    return getExportById(jobId)
  }

  const pollAndPresign = async (jobIds?: { trimmingId: string; pipelineId: string }) => {
    const trimmingId = jobIds?.trimmingId ?? jobState.trimmingId
    const pipelineId = jobIds?.pipelineId ?? jobState.pipelineId

    if (!trimmingId || !pipelineId) {
      toast({
        variant: "destructive",
        title: "No jobs yet",
        description: "Create export jobs first.",
      })
      return false
    }

    setIsPolling(true)
    try {
      const trimming = await waitForJob(trimmingId, "Trimming")
      const pipeline = await waitForJob(pipelineId, "Pipeline")

      let trimmingUrl = ""
      let pipelineUrl = ""

      if (trimming.status === "READY") {
        trimmingUrl = (await getPresignedLink(trimming.id)).url
      }
      if (pipeline.status === "READY") {
        pipelineUrl = (await getPresignedLink(pipeline.id)).url
      }

      setJobState((prev) => ({
        ...prev,
        trimmingId,
        pipelineId,
        trimmingStatus: trimming.status,
        pipelineStatus: pipeline.status,
        trimmingUrl,
        pipelineUrl,
      }))

      await queryClient.invalidateQueries({ queryKey: queryKeys.exports })
      await queryClient.invalidateQueries({ queryKey: queryKeys.exportDetail(trimmingId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.exportDetail(pipelineId) })

      pushLog(`Final statuses: trimming=${trimming.status}, pipeline=${pipeline.status}.`)
      if (trimmingUrl || pipelineUrl) {
        pushLog("Presigned links generated.")
      }

      toast({
        title: "Polling finished",
        description: `trimming=${trimming.status} | pipeline=${pipeline.status}`,
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Polling failed"
      pushLog(`Polling failed: ${message}`)
      toast({
        variant: "destructive",
        title: "Polling failed",
        description: message,
      })
      return false
    } finally {
      setIsPolling(false)
    }
  }

  const runAll = async () => {
    setIsRunning(true)
    pushLog("Starting one-click demo flow.")

    try {
      const authOk = await authenticate()
      if (!authOk) return

      const seedOk = await seedNgsData()
      if (!seedOk) return

      const created = await createDemoExports()
      if (!created) return

      await pollAndPresign({ trimmingId: created.trimming.id, pipelineId: created.pipeline.id })
      pushLog("Demo flow completed.")
    } finally {
      setIsRunning(false)
    }
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast({
      title: `${label} copied`,
      description: "Copied to clipboard.",
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="h-5 w-5 text-primary" />
            Demo Recorder Flow
          </CardTitle>
          <CardDescription>
            One-screen guided flow for screencast: authenticate, seed NGS data, create exports, and show presigned links.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={runAll} disabled={isBusy} className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Run Full Demo
          </Button>
          <span className="text-xs text-muted-foreground">
            Recommended for recordings. Ends with READY jobs and copyable URLs.
          </span>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Step 1: Authenticate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" />
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="password" />
            </div>
            <Button variant="outline" onClick={authenticate} disabled={isBusy} className="gap-2">
              {isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Get & Save Token
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseZap className="h-4 w-4" />
              Step 2: Seed NGS Samples
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={seedNgsData} disabled={isBusy} className="gap-2">
              {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Create 3 Sample Sequences
            </Button>
            <p className="text-xs text-muted-foreground">
              Latest: {createdSamples.length ? createdSamples.join(", ") : "No seeded samples yet."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4" />
              Step 3: Create Export Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={createDemoExports} disabled={isBusy} className="gap-2">
              {isCreatingExports ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Queue Trimming + Pipeline Exports
            </Button>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Trimming job: {jobState.trimmingId ?? "-"}</p>
              <p>Pipeline job: {jobState.pipelineId ?? "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Step 4: Poll + Presign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={() => pollAndPresign()} disabled={isBusy} className="gap-2">
              {isPolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Wait for READY and Generate Links
            </Button>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Trimming status: {jobState.trimmingStatus ?? "-"}</p>
              <p>Pipeline status: {jobState.pipelineStatus ?? "-"}</p>
            </div>

            {jobState.trimmingUrl ? (
              <Button size="sm" onClick={() => copyText(jobState.trimmingUrl as string, "Trimming URL")}>
                Copy Trimming URL
              </Button>
            ) : null}
            {jobState.pipelineUrl ? (
              <Button size="sm" onClick={() => copyText(jobState.pipelineUrl as string, "Pipeline URL")}>
                Copy Pipeline URL
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Timeline</CardTitle>
          <CardDescription>Chronological log of authentication, sample ingestion and report generation.</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-3 font-mono text-xs">
              {timeline.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Updated at: {formatDateTime(new Date().toISOString())}</p>
        </CardContent>
      </Card>
    </div>
  )
}
