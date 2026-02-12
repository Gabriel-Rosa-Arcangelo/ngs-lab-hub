import { AlertTriangle, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ExportStatus } from "@/lib/api"

type StatusConfig = {
  label: string
  variant: React.ComponentProps<typeof Badge>["variant"]
  icon: React.ReactNode
}

const statusConfig: Record<ExportStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    variant: "secondary",
    icon: <Clock3 className="h-3.5 w-3.5" />,
  },
  RUNNING: {
    label: "Running",
    variant: "warning",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  READY: {
    label: "Ready",
    variant: "success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  EXPIRED: {
    label: "Expired",
    variant: "outline",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  CANCELED: {
    label: "Canceled",
    variant: "outline",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

export function StatusBadge({ status }: { status: ExportStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}
