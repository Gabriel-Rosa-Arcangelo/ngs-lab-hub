import { Clapperboard, Dna, FlaskConical, Home } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"

import { AuthTokenButton } from "@/components/AuthTokenButton"
import { NewExportDialog } from "@/components/NewExportDialog"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/samples",
    label: "NGS Samples",
    icon: Dna,
  },
  {
    href: "/exports",
    label: "Pipeline Reports",
    icon: FlaskConical,
  },
  {
    href: "/demo",
    label: "Demo Flow",
    icon: Clapperboard,
  },
]

function CurrentPageTitle() {
  const location = useLocation()
  if (location.pathname.startsWith("/exports/") && location.pathname !== "/exports") {
    return "Export Detail"
  }

  if (location.pathname.startsWith("/exports")) {
    return "Pipeline Reports"
  }

  if (location.pathname.startsWith("/samples")) {
    return "NGS Samples"
  }

  if (location.pathname.startsWith("/demo")) {
    return "Demo Recorder"
  }

  return "Dashboard"
}

export function AppShell() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Dna className="h-4 w-4" />
              </div>
              <SidebarLabel>
                <p className="text-sm font-semibold text-foreground">NGS Pipeline Hub</p>
                <p className="text-xs text-muted-foreground">Genomic Data Platform</p>
              </SidebarLabel>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === "/dashboard"
                        ? location.pathname.startsWith("/dashboard")
                        : location.pathname.startsWith(item.href)
                    }
                  >
                    <NavLink to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            <div className="px-2 py-1 text-xs text-muted-foreground">Sequencing, analytics and export lifecycle</div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-base font-semibold text-foreground">
                  <CurrentPageTitle />
                </h1>
                <p className="hidden text-xs text-muted-foreground md:block">Operational view for NGS processing and reports</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AuthTokenButton />
              <ThemeToggle />
              <NewExportDialog />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
