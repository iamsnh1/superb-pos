import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useManufacturingOrders(search?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["manufacturing-orders", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const { mos } = await api.get<{ mos: any[] }>(`/production?${params}`);
      return mos ?? [];
    },
  });
}

export function useUpdateMOStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      actual_hours,
      qc_status,
      qc_notes,
      qc_passed,
      labor_cost,
    }: {
      id: string | number;
      status: string;
      actual_hours?: number;
      qc_status?: string;
      qc_notes?: string;
      qc_passed?: boolean | number;
      labor_cost?: number;
    }) => {
      const { mo } = await api.put(`/production/${id}`, {
        status,
        actual_hours,
        qc_notes: qc_notes ?? qc_status,
        qc_passed,
        labor_cost,
      });
      return mo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      qc.invalidateQueries({ queryKey: ["my-work"] });
      toast({ title: "MO status updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useAssignTailor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, tailorId }: { id: string | number; tailorId: string | number }) => {
      const { mo } = await api.put(`/production/${id}`, { assigned_tailor_id: tailorId });
      return mo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manufacturing-orders"] });
      toast({ title: "Tailor assigned" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

// MO status history is not currently exposed by the local API — return empty array gracefully
export function useMOStatusHistory(_moId: string | null) {
  return useQuery({
    queryKey: ["mo-status-history", _moId],
    queryFn: async () => [],
    enabled: false,
  });
}
