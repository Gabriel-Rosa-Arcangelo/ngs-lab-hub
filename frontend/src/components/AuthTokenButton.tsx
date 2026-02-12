import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getStoredTokenPreview, obtainToken, setStoredToken } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export function AuthTokenButton() {
  const { toast } = useToast()

  const handleSetToken = async () => {
    const input = window.prompt(
      "Paste JWT access token. Leave blank to login with username/password.",
      "",
    )
    if (input === null) return

    if (input.trim()) {
      setStoredToken(input)
      toast({
        title: "Token saved",
        description: "Authorization header will be sent on API requests.",
      })
      return
    }

    const username = window.prompt("Username", "demo")
    if (username === null) return
    const password = window.prompt("Password", "demo1234")
    if (password === null) return

    try {
      const tokenPair = await obtainToken({ username, password })
      setStoredToken(tokenPair.access)
      toast({
        title: "Authenticated",
        description: `Access token updated for ${username}.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Could not obtain token.",
      })
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleSetToken} className="gap-2">
      <KeyRound className="h-4 w-4" />
      <span className="hidden sm:inline">Token</span>
      {getStoredTokenPreview() ? <span className="hidden text-xs text-muted-foreground md:inline">{getStoredTokenPreview()}</span> : null}
    </Button>
  )
}
