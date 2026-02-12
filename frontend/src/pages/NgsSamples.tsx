import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Dna, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import type { CreateNgsSequencePayload, NgsPipelineStatus, NgsSequence } from "@/lib/api"
import {
  useCreateNgsSequenceMutation,
  useDeleteNgsSequenceMutation,
  useNgsSequencesQuery,
  useUpdateNgsSequenceMutation,
} from "@/lib/hooks"
import { formatNumber } from "@/lib/utils"

type FormState = CreateNgsSequencePayload

const pipelineOptions: NgsPipelineStatus[] = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]

function emptyFormState(): FormState {
  return {
    sample_id: "",
    sequence: "",
    platform: "ILLUMINA",
    raw_reads: 0,
    trimmed_reads: 0,
    aligned_reads: 0,
    read_length: 150,
    q30_rate_percent: 0,
    mean_depth: 0,
    variant_count: 0,
    pipeline_status: "QUEUED",
  }
}

function toFormState(sequence: NgsSequence): FormState {
  return {
    sample_id: sequence.sample_id,
    sequence: sequence.sequence,
    platform: sequence.platform,
    raw_reads: sequence.raw_reads,
    trimmed_reads: sequence.trimmed_reads,
    aligned_reads: sequence.aligned_reads,
    read_length: sequence.read_length,
    q30_rate_percent: sequence.q30_rate_percent,
    mean_depth: sequence.mean_depth,
    variant_count: sequence.variant_count,
    pipeline_status: sequence.pipeline_status,
  }
}

function PipelineBadge({ status }: { status: NgsPipelineStatus }) {
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

function SequenceDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  submitLabel,
  form,
  setForm,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => Promise<void>
  title: string
  description: string
  submitLabel: string
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Sample ID</label>
            <Input value={form.sample_id} onChange={(event) => setForm((prev) => ({ ...prev, sample_id: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Platform</label>
            <Input value={form.platform} onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-muted-foreground">Sequence</label>
            <textarea
              value={form.sequence}
              onChange={(event) => setForm((prev) => ({ ...prev, sequence: event.target.value }))}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Raw Reads</label>
            <Input
              type="number"
              min={0}
              value={form.raw_reads}
              onChange={(event) => setForm((prev) => ({ ...prev, raw_reads: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Trimmed Reads</label>
            <Input
              type="number"
              min={0}
              value={form.trimmed_reads}
              onChange={(event) => setForm((prev) => ({ ...prev, trimmed_reads: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Aligned Reads</label>
            <Input
              type="number"
              min={0}
              value={form.aligned_reads}
              onChange={(event) => setForm((prev) => ({ ...prev, aligned_reads: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Read Length</label>
            <Input
              type="number"
              min={1}
              value={form.read_length}
              onChange={(event) => setForm((prev) => ({ ...prev, read_length: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Q30 Rate (%)</label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.q30_rate_percent}
              onChange={(event) => setForm((prev) => ({ ...prev, q30_rate_percent: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mean Depth</label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.mean_depth}
              onChange={(event) => setForm((prev) => ({ ...prev, mean_depth: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Variants</label>
            <Input
              type="number"
              min={0}
              value={form.variant_count}
              onChange={(event) => setForm((prev) => ({ ...prev, variant_count: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pipeline Status</label>
            <Select
              value={form.pipeline_status}
              onValueChange={(value: NgsPipelineStatus) => setForm((prev) => ({ ...prev, pipeline_status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelineOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => { void onSubmit() }} disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NgsSamples() {
  const { toast } = useToast()
  const { data = [], isLoading, isError, error, refetch, isFetching } = useNgsSequencesQuery()

  const createMutation = useCreateNgsSequenceMutation()
  const updateMutation = useUpdateNgsSequenceMutation()
  const deleteMutation = useDeleteNgsSequenceMutation()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | NgsPipelineStatus>("ALL")

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formState, setFormState] = useState<FormState>(emptyFormState)

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.pipeline_status !== statusFilter) {
        return false
      }

      if (!search.trim()) {
        return true
      }

      const query = search.trim().toLowerCase()
      return item.sample_id.toLowerCase().includes(query) || item.platform.toLowerCase().includes(query)
    })
  }, [data, search, statusFilter])

  const openCreate = () => {
    setFormState(emptyFormState())
    setCreateOpen(true)
  }

  const openEdit = (item: NgsSequence) => {
    setEditingId(item.id)
    setFormState(toFormState(item))
    setEditOpen(true)
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formState)
      setCreateOpen(false)
      toast({ title: "Sample created", description: "NGS sequence saved." })
    } catch (createError) {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: createError instanceof Error ? createError.message : "Could not create sample",
      })
    }
  }

  const handleEdit = async () => {
    if (!editingId) return

    try {
      await updateMutation.mutateAsync({ id: editingId, payload: formState })
      setEditOpen(false)
      setEditingId(null)
      toast({ title: "Sample updated", description: "NGS sequence updated." })
    } catch (updateError) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: updateError instanceof Error ? updateError.message : "Could not update sample",
      })
    }
  }

  const handleDelete = async (item: NgsSequence) => {
    const confirmed = window.confirm(`Delete sample ${item.sample_id}?`)
    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync(item.id)
      toast({ title: "Sample deleted", description: `${item.sample_id} removed.` })
    } catch (deleteError) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: deleteError instanceof Error ? deleteError.message : "Could not delete sample",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-[420px]" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load NGS samples</CardTitle>
          <CardDescription>{error instanceof Error ? error.message : "Unexpected error"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dna className="h-4 w-4 text-primary" />
            NGS Sample Registry
          </CardTitle>
          <CardDescription>Manage genomic samples and pipeline metrics.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input
            className="w-full max-w-sm"
            placeholder="Search sample ID or platform"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select value={statusFilter} onValueChange={(value: "ALL" | NgsPipelineStatus) => setStatusFilter(value)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Pipeline status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL</SelectItem>
              {pipelineOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Sample
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Samples ({formatNumber(filtered.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Reads (R/T/A)</TableHead>
                <TableHead>Q30 %</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No NGS samples found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sample_id}</TableCell>
                    <TableCell>
                      <PipelineBadge status={item.pipeline_status} />
                    </TableCell>
                    <TableCell>{item.platform}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumber(item.raw_reads)} / {formatNumber(item.trimmed_reads)} / {formatNumber(item.aligned_reads)}
                    </TableCell>
                    <TableCell>{item.q30_rate_percent.toFixed(1)}</TableCell>
                    <TableCell>{item.mean_depth.toFixed(1)}</TableCell>
                    <TableCell>{formatNumber(item.variant_count)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item)} className="gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        title="Create NGS Sample"
        description="Register a new sample with sequencing and pipeline metrics."
        submitLabel="Create"
        form={formState}
        setForm={setFormState}
        isPending={createMutation.isPending}
      />

      <SequenceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        title="Edit NGS Sample"
        description="Update sequencing and analysis fields for this sample."
        submitLabel="Save Changes"
        form={formState}
        setForm={setFormState}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
