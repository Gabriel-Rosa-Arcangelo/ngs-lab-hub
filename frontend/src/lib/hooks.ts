import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createExport,
  createNgsSequence,
  deleteNgsSequence,
  type CreateExportPayload,
  type CreateNgsSequencePayload,
  getAllExports,
  getAllNgsSequences,
  getExportById,
  getExportEvents,
  getPresignedLink,
  updateNgsSequence,
  type UpdateNgsSequencePayload,
} from "@/lib/api"

export const queryKeys = {
  exports: ["exports"] as const,
  exportDetail: (id: string) => ["exports", id] as const,
  exportEvents: (id: string) => ["exports", id, "events"] as const,
  ngsSequences: ["ngs-sequences"] as const,
}

export function useExportsQuery() {
  return useQuery({
    queryKey: queryKeys.exports,
    queryFn: getAllExports,
  })
}

export function useExportDetailQuery(id?: string) {
  return useQuery({
    queryKey: id ? queryKeys.exportDetail(id) : ["exports", "missing-id"],
    queryFn: () => getExportById(id as string),
    enabled: Boolean(id),
  })
}

export function useExportEventsQuery(id?: string) {
  return useQuery({
    queryKey: id ? queryKeys.exportEvents(id) : ["exports", "missing-id", "events"],
    queryFn: () => getExportEvents(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateExportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateExportPayload) => createExport(payload),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exports })
      queryClient.setQueryData(queryKeys.exportDetail(job.id), job)
    },
  })
}

export function usePresignMutation() {
  return useMutation({
    mutationFn: (id: string) => getPresignedLink(id),
  })
}

export function useNgsSequencesQuery() {
  return useQuery({
    queryKey: queryKeys.ngsSequences,
    queryFn: getAllNgsSequences,
  })
}

export function useCreateNgsSequenceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateNgsSequencePayload) => createNgsSequence(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ngsSequences })
    },
  })
}

export function useUpdateNgsSequenceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateNgsSequencePayload }) => updateNgsSequence(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ngsSequences })
    },
  })
}

export function useDeleteNgsSequenceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteNgsSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ngsSequences })
    },
  })
}
