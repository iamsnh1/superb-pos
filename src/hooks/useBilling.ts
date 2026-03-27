import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ── Invoices ───────────────────────────────────────────────────────────────

export function useInvoices(search?: string) {
  return useQuery({
    queryKey: ["invoices", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const { invoices } = await api.get<{ invoices: any[] }>(`/billing/invoices${params.toString() ? `?${params}` : ""}`);
      return invoices ?? [];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { order_id: string | number;[key: string]: any }) => {
      const { invoice } = await api.post("/billing/invoice", { order_id: input.order_id });
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice created" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

// ── Payments ───────────────────────────────────────────────────────────────

export function usePayments(orderId?: string) {
  return useQuery({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orderId) params.append("order_id", orderId);
      const { payments } = await api.get<{ payments: any[] }>(`/billing?${params}`);
      return payments ?? [];
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      order_id: string | number;
      amount: number;
      method?: string;
      payment_method?: string;
      notes?: string;
      [key: string]: any;
    }) => {
      const { payment } = await api.post("/billing", {
        order_id: input.order_id,
        amount: input.amount,
        method: input.method ?? input.payment_method ?? "cash",
        notes: input.notes,
      });
      return payment;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["order", String(variables.order_id)] });
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

// ── Bill data (for PDF/print) ──────────────────────────────────────────────

export function useBillData(orderId: string | null) {
  return useQuery({
    queryKey: ["bill", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      return api.get<any>(`/billing/bill/${orderId}`);
    },
    enabled: !!orderId,
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (order_id: string | number) => {
      const { invoice } = await api.post("/billing/invoice", { order_id });
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice Generated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}
