import { Navigate, Route, Routes } from "react-router-dom"

import { Toaster } from "@/components/ui/toaster"
import { AppShell } from "@/layout/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { DemoRecorder } from "@/pages/DemoRecorder"
import { ExportDetail } from "@/pages/ExportDetail"
import { ExportsList } from "@/pages/ExportsList"
import { NgsSamples } from "@/pages/NgsSamples"
import { NotFound } from "@/pages/NotFound"

function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/samples" element={<NgsSamples />} />
          <Route path="/demo" element={<DemoRecorder />} />
          <Route path="/exports" element={<ExportsList />} />
          <Route path="/exports/:id" element={<ExportDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
