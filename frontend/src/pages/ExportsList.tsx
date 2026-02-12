import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Download, Eye, RefreshCw } from "lucide-react"

import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import type { ExportJob, ExportStatus } from "@/lib/api"
import { useExportsQuery, usePresignMutation } from "@/lib/hooks"
import { formatBytes, formatDateTime, formatNumber } from "@/lib/utils"

const kindOptions = ["ALL", "NGS_TRIMMING_REPORT", "NGS_PIPELINE_REPORT"] as const
const formatOptions = ["ALL", "csv", "zip"] as const
const statusOptions = ["ALL", "PENDING", "RUNNING", "READY", "FAILED", "EXPIRED", "CANCELED"] as const

function kindLabel(kind: ExportJob["kind"]) {
  if (kind === "NGS_TRIMMING_REPORT") return "Trimming"
  if (kind === "NGS_PIPELINE_REPORT") return "Full Pipeline"
  return kind
}

export function ExportsList() {
  const { toast } = useToast()
  const { data = [], isLoading, isError, error, refetch, isFetching } = useExportsQuery()
  const presignMutation = usePresignMutation()

  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState<(typeof kindOptions)[number]>("ALL")
  const [format, setFormat] = useState<(typeof formatOptions)[number]>("ALL")
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("ALL")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const ngsOnly = useMemo(() => {
    return data.filter((job) => job.kind === "NGS_TRIMMING_REPORT" || job.kind === "NGS_PIPELINE_REPORT")
  }, [data])

  const filteredData = useMemo(() => {
    return ngsOnly.filter((job) => {
      if (search.trim() && !job.id.toLowerCase().includes(search.toLowerCase().trim())) {
        return false
      }

      if (kind !== "ALL" && job.kind !== kind) {
        return false
      }

      if (format !== "ALL" && job.file_format !== format) {
        return false
      }

      if (status !== "ALL" && job.status !== status) {
        return false
      }

      const created = new Date(job.created_at)
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`)
        if (created < from) return false
      }

      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`)
        if (created > to) return false
      }

      return true
    })
  }, [format, fromDate, kind, ngsOnly, search, status, toDate])

  const handleDownload = useCallback(async (job: ExportJob) => {
    try {
      const result = await presignMutation.mutateAsync(job.id)
      window.open(result.url, "_blank", "noopener,noreferrer")
      toast({
        title: "Download ready",
        description: `Presigned URL generated (expires in ${result.expires_in}s).`,
      })
    } catch (presignError) {
      toast({
        variant: "destructive",
        title: "Could not download",
        description: presignError instanceof Error ? presignError.message : "Could not generate download link",
      })
    }
  }, [presignMutation, toast])

  const columns = useMemo<ColumnDef<ExportJob>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Report ID",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>,
      },
      {
        accessorKey: "kind",
        header: "Report",
        cell: ({ row }) => kindLabel(row.original.kind),
      },
      {
        accessorKey: "file_format",
        header: "Format",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status as ExportStatus} />,
      },
      {
        accessorKey: "row_count",
        header: "Rows",
        cell: ({ row }) => formatNumber(row.original.row_count),
      },
      {
        accessorKey: "file_size_bytes",
        header: "Size",
        cell: ({ row }) => formatBytes(row.original.file_size_bytes),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const job = row.original
          return (
            <div className="flex justify-end gap-2">
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to={`/exports/${job.id}`}>
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
              </Button>
              {job.status === "READY" ? (
                <Button size="sm" onClick={() => handleDownload(job)} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [handleDownload],
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-[420px]" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load pipeline reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unexpected error"}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline Report Filters</CardTitle>
          <CardDescription>Focused on NGS trimming and full-pipeline outputs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Search report ID" value={search} onChange={(event) => setSearch(event.target.value)} />

            <Select value={kind} onValueChange={(value: (typeof kindOptions)[number]) => setKind(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={format} onValueChange={(value: (typeof formatOptions)[number]) => setFormat(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(value: (typeof statusOptions)[number]) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">NGS Reports</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No NGS reports match current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {filteredData.length} reports
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
