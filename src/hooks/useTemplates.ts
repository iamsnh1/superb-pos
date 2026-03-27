import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface MeasurementField {
    key: string;
    label: string;
    unit: string;
}

export interface GarmentTemplate {
    id: number;
    code: string;
    name: string;
    base_price?: number; // Added base_price
    measurement_fields: MeasurementField[];
    styles?: string[];
}

export function useGarmentTemplates() {
    return useQuery({
        queryKey: ["garment-templates"],
        queryFn: async () => {
            const { templates } = await api.get<{ templates: GarmentTemplate[] }>("/templates");
            return templates;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateGarmentTemplate() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: Partial<GarmentTemplate>) => {
            const { template } = await api.post("/templates", data);
            return template;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["garment-templates"] });
            toast({ title: "Template created" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message || "Failed to create", variant: "destructive" });
        }
    });
}

export function useUpdateGarmentTemplate() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const { template } = await api.put(`/templates/${id}`, data);
            return template;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["garment-templates"] });
            toast({ title: "Template updated" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });
}

export function useDeleteGarmentTemplate() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/templates/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["garment-templates"] });
            toast({ title: "Template deleted" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });
}
