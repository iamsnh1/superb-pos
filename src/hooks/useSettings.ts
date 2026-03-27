import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Settings {
    // General
    business_name: string;
    gst_tax_id: string;
    phone: string;
    email: string;
    address: string;

    // Orders
    order_number_prefix: string;
    default_delivery_days: string;
    advance_payment_percent: string;
    urgent_surcharge_percent: string;

    // Billing
    gst_rate: string;
    currency_symbol: string;
    payment_terms: string;

    // Receipt
    receipt_footer: string;
    show_measurements: string;
    show_design_specs: string;

    // App updates (Electron)
    update_feed_url: string;
}

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const res = await api.get<{ settings?: Record<string, string> }>("/settings");
            return (res.settings ?? res.data?.settings ?? {}) as Partial<Settings>;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (updates: Partial<Settings>) => {
            const res = await api.put("/settings", updates);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success("Settings updated successfully");
        },
        onError: (error) => {
            toast.error("Failed to update settings");
            console.error(error);
        }
    });
}
