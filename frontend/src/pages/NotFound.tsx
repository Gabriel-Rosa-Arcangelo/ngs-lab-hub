import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function NotFound() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Page not found</CardTitle>
        <CardDescription>The requested route does not exist.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
