import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface Payment {
    id: number;
    amount: number;
    method: 'cash' | 'card' | 'upi' | 'bank_transfer';
    created_at: string;
    notes?: string;
    collected_by?: number;
    customer_name?: string;
    order_number?: string;
}

export interface Invoice {
    id: number;
    invoice_number: string;
    total_amount: number;
    created_at: string;
}

export function usePayments(orderId?: string) {
    return useQuery({
        queryKey: ["payments", orderId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (orderId) params.append("order_id", orderId);
            const { payments } = await api.get<{ payments: Payment[] }>(`/billing?${params}`);
            return payments;
        }
    });
}

export function useCreatePayment() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: { order_id: string; amount: number; method: string; notes?: string }) => {
            const { payment } = await api.post("/billing", data);
            return payment;
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["payments", variables.order_id] });
            qc.invalidateQueries({ queryKey: ["order", variables.order_id] }); // Refresh order to see balance
            toast({ title: "Payment Recorded" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });
}

export function useInvoices() {
    return useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const { invoices } = await api.get<{ invoices: any[] }>("/billing/invoices");
            return invoices;
        },
    });
}

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
        mutationFn: async (order_id: string) => {
            const { invoice } = await api.post("/billing/invoice", { order_id });
            return invoice;
        },
        onSuccess: () => {
            toast({ title: "Invoice Generated" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });
}
