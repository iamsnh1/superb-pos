import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface ManufacturingOrder {
    id: number;
    mo_number: string;
    order_id: number;
    order_number: string;
    garment_type: string;
    delivery_date: string;
    customer_name: string;
    tailor_name: string;
    assigned_tailor_id?: number;
    status: 'pending' | 'cutting' | 'stitching' | 'finishing' | 'qc' | 'completed';
    priority: 'normal' | 'urgent';
    work_instructions?: string;
    qc_notes?: string;
    qc_passed?: number;
    start_date?: string;
    completion_date?: string;
    design_specifications?: any;
}

export function useManufacturingOrders(status?: string, tailor_id?: string, order_id?: string) {
    return useQuery({
        queryKey: ["manufacturing-orders", status, tailor_id, order_id],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (tailor_id) params.set("tailor_id", tailor_id);
            if (order_id) params.set("order_id", order_id);
            const { mos } = await api.get<{ mos: ManufacturingOrder[] }>(`/production?${params}`);
            return mos;
        },
        refetchInterval: 5000,
        staleTime: 0,
    });
}

export function useManufacturingOrder(id: string | null) {
    return useQuery({
        queryKey: ["manufacturing-order", id],
        enabled: !!id,
        queryFn: async () => {
            if (!id) return null;
            const { mo } = await api.get<{ mo: ManufacturingOrder }>(`/production/${id}`);
            return mo;
        },
    });
}

export function useUpdateManufacturingOrder() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const { mo } = await api.put<{ mo: ManufacturingOrder }>(`/production/${id}`, data);
            return mo;
        },
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: ["manufacturing-orders"] });
            qc.invalidateQueries({ queryKey: ["manufacturing-order", updated.id] });
            toast({ title: "Updated" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });
}
