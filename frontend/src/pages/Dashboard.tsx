import { useMemo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Activity, AreaChart as AreaChartIcon, Dna, FileArchive, FlaskConical } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useExportsQuery, useNgsSequencesQuery, usePresignMutation } from "@/lib/hooks"
import { formatBytes, formatDateTime, formatNumber } from "@/lib/utils"

function buildLastThirtyDaysSeries(items: { created_at: string }[]) {
  const map = new Map<string, number>()
  const now = new Date()

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    map.set(date.toISOString().slice(0, 10), 0)
  }

  items.forEach((item) => {
    const key = item.created_at.slice(0, 10)
    if (!map.has(key)) return
    map.set(key, (map.get(key) ?? 0) + 1)
  })

  return Array.from(map.entries()).map(([date, total]) => ({ date, total }))
}

function KPI({
  icon,
  title,
  value,
  helper,
}: {
  icon: ReactNode
  title: string
  value: string
  helper?: string
}) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <span className="text-primary">{icon}</span>
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}

function PipelineBadge({ status }: { status: string }) {
  const className =
    status === "SUCCEEDED"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "RUNNING"
        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
        : status === "FAILED"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>{status}</span>
}

export function Dashboard() {
  const { toast } = useToast()
  const { data: allExports = [], isLoading: exportsLoading, isError: exportsError, error: exportsErrorData } = useExportsQuery()
  const { data: sequences = [], isLoading: sequencesLoading, isError: sequencesError, error: sequencesErrorData } = useNgsSequencesQuery()
  const presignMutation = usePresignMutation()

  const exportsData = useMemo(() => {
    return allExports.filter((job) => job.kind === "NGS_TRIMMING_REPORT" || job.kind === "NGS_PIPELINE_REPORT")
  }, [allExports])

  const cutoffTime = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return cutoff.getTime()
  }, [])

  const recentExports = useMemo(() => {
    return exportsData
      .filter((job) => new Date(job.created_at).getTime() >= cutoffTime)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [cutoffTime, exportsData])

  const recentSequences = useMemo(() => {
    return [...sequences]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
  }, [sequences])

  const kpis = useMemo(() => {
    const totalSamples = sequences.length
    const runningSamples = sequences.filter((item) => item.pipeline_status === "RUNNING" || item.pipeline_status === "QUEUED").length
    const succeededSamples = sequences.filter((item) => item.pipeline_status === "SUCCEEDED").length
    const successRate = totalSamples ? Math.round((succeededSamples * 100) / totalSamples) : 0
    const variantsTotal = sequences.reduce((sum, item) => sum + item.variant_count, 0)

    const totalReports = recentExports.length
    const readyReports = recentExports.filter((job) => job.status === "READY").length

    return {
      totalSamples,
      runningSamples,
      successRate,
      variantsTotal,
      totalReports,
      readyReports,
    }
  }, [recentExports, sequences])

  const sampleSeries = useMemo(() => buildLastThirtyDaysSeries(sequences), [sequences])
  const reportSeries = useMemo(() => buildLastThirtyDaysSeries(recentExports), [recentExports])

  const handleDownload = async (jobId: string) => {
    try {
      const data = await presignMutation.mutateAsync(jobId)
      window.open(data.url, "_blank", "noopener,noreferrer")
      toast({
        title: "Download opened",
        description: `Secure report link expires in ${data.expires_in}s.`,
      })
    } catch (presignError) {
      const message = presignError instanceof Error ? presignError.message : "Could not fetch download link"
      toast({
        variant: "destructive",
        title: "Download failed",
        description: message,
      })
    }
  }

  if (exportsLoading || sequencesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (exportsError || sequencesError) {
    const message =
      (exportsErrorData instanceof Error && exportsErrorData.message) ||
      (sequencesErrorData instanceof Error && sequencesErrorData.message) ||
      "Unexpected error"

    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load NGS dashboard</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPI icon={<Dna className="h-4 w-4" />} title="Total Samples" value={formatNumber(kpis.totalSamples)} helper="NGS records in registry" />
        <KPI icon={<Activity className="h-4 w-4" />} title="Active Pipelines" value={formatNumber(kpis.runningSamples)} helper="QUEUED + RUNNING" />
        <KPI icon={<FlaskConical className="h-4 w-4" />} title="Pipeline Success" value={`${kpis.successRate}%`} helper="SUCCEEDED samples ratio" />
        <KPI icon={<AreaChartIcon className="h-4 w-4" />} title="Total Variants" value={formatNumber(kpis.variantsTotal)} helper="Aggregated called variants" />
        <KPI icon={<FileArchive className="h-4 w-4" />} title="Reports (30d)" value={formatNumber(kpis.totalReports)} />
        <KPI icon={<FileArchive className="h-4 w-4" />} title="Reports Ready" value={formatNumber(kpis.readyReports)} helper="Available for secure download" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sample Ingestion (30d)</CardTitle>
            <CardDescription>Number of registered genomic samples per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value: string) => value.slice(5)} minTickGap={24} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Area dataKey="total" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Generation (30d)</CardTitle>
            <CardDescription>Trimming and full-pipeline report jobs created per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value: string) => value.slice(5)} minTickGap={24} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Area dataKey="total" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Samples</CardTitle>
            <CardDescription>Most recent sequencing entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Q30</TableHead>
                  <TableHead>Variants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSequences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No genomic samples yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSequences.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.sample_id}</TableCell>
                      <TableCell><PipelineBadge status={item.pipeline_status} /></TableCell>
                      <TableCell>{item.q30_rate_percent.toFixed(1)}%</TableCell>
                      <TableCell>{formatNumber(item.variant_count)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-3 text-right">
              <Button asChild variant="outline" size="sm">
                <Link to="/samples">Open sample registry</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Reports</CardTitle>
            <CardDescription>Recent NGS report jobs and download action.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExports.slice(0, 8).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No reports yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentExports.slice(0, 8).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>{formatNumber(job.row_count)}</TableCell>
                      <TableCell>{formatBytes(job.file_size_bytes)}</TableCell>
                      <TableCell>{formatDateTime(job.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {job.status === "READY" ? (
                          <Button size="sm" onClick={() => handleDownload(job.id)}>
                            Download
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/exports/${job.id}`}>View</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
