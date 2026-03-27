import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ── Suppliers ──────────────────────────────────────────────────────────────

export function useSuppliers(search?: string) {
  return useQuery({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const { suppliers } = await api.get<{ suppliers: any[] }>(`/suppliers?${params}`);
      return suppliers ?? [];
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      [key: string]: any;
    }) => {
      const { supplier } = await api.post("/suppliers", input);
      return supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier created" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string | number;[key: string]: any }) => {
      const { supplier } = await api.put(`/suppliers/${id}`, input);
      return supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

// ── Purchase Orders ────────────────────────────────────────────────────────

export function usePurchaseOrders(search?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["purchase-orders", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const { purchase_orders } = await api.get<{ purchase_orders: any[] }>(`/purchase-orders?${params}`);
      return purchase_orders ?? [];
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { supplier_id: string | number; notes?: string; total_amount?: number }) => {
      const { purchase_order } = await api.post("/purchase-orders", input);
      return purchase_order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order created" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string | number;[key: string]: any }) => {
      const { purchase_order } = await api.put(`/purchase-orders/${id}`, input);
      return purchase_order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "PO updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function usePurchaseOrderItems(poId: string | number | null) {
  return useQuery({
    queryKey: ["po-items", poId],
    queryFn: async () => {
      if (!poId) return [];
      const { items } = await api.get<{ items: any[] }>(`/purchase-orders/${poId}/items`);
      return items ?? [];
    },
    enabled: !!poId,
  });
}
