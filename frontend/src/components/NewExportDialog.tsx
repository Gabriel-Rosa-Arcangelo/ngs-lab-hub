import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useCreateExportMutation } from "@/lib/hooks"
import type { ExportKind } from "@/lib/api"

export function NewExportDialog() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ExportKind>("NGS_TRIMMING_REPORT")
  const [days, setDays] = useState(30)

  const createMutation = useCreateExportMutation()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const job = await createMutation.mutateAsync({
        kind,
        format: kind === "NGS_PIPELINE_REPORT" ? "zip" : "csv",
        params: { days },
      })

      toast({
        title: "Export created",
        description: `Job ${job.id} queued successfully.`,
      })

      setOpen(false)
      navigate(`/exports/${job.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create export"
      toast({
        variant: "destructive",
        title: "Create failed",
        description: message,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Export</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New NGS Report</DialogTitle>
          <DialogDescription>Generate trimming or full-pipeline report from current genomic samples.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="export-kind">
              Kind
            </label>
            <Select value={kind} onValueChange={(value: ExportKind) => setKind(value)}>
              <SelectTrigger id="export-kind">
                <SelectValue placeholder="Select export kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NGS_TRIMMING_REPORT">NGS_TRIMMING_REPORT</SelectItem>
                <SelectItem value="NGS_PIPELINE_REPORT">NGS_PIPELINE_REPORT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Output format is automatic: trimming report as CSV, full pipeline report as ZIP.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="export-days">
              Params.days (lookback window)
            </label>
            <Input
              id="export-days"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
