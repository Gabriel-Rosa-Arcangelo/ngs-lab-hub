import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { PanelLeft, PanelRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SidebarContextValue = {
  collapsed: boolean
  toggle: () => void
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebarContext() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("Sidebar components must be used within SidebarProvider")
  }
  return context
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  const value = React.useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggle: () => setCollapsed((state) => !state),
    }),
    [collapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  const { collapsed } = useSidebarContext()

  return (
    <aside
      ref={ref}
      data-collapsed={collapsed}
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-card/60 transition-all duration-300",
        collapsed ? "w-[4.5rem]" : "w-64",
        className,
      )}
      {...props}
    />
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("border-b p-3", className)} {...props} />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto p-2", className)} {...props} />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("border-t p-2", className)} {...props} />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex min-h-screen flex-1 flex-col", className)} {...props} />
))
SidebarInset.displayName = "SidebarInset"

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { collapsed, toggle } = useSidebarContext()

  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={toggle} {...props}>
      {collapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("space-y-1", className)} {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={className} {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, asChild = false, isActive, ...props }, ref) => {
    const { collapsed } = useSidebarContext()
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "bg-accent text-accent-foreground",
          collapsed && "justify-center px-0",
          className,
        )}
        {...props}
      />
    )
  },
)
SidebarMenuButton.displayName = "SidebarMenuButton"

function SidebarLabel({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarContext()
  if (collapsed) return null
  return <span>{children}</span>
}

export {
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
  useSidebarContext,
}
