import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useBomTemplates() {
    return useQuery({
        queryKey: ["bom-templates"],
        queryFn: async () => {
            const { templates } = await api.get("/bom-templates");
            return templates;
        },
    });
}

export function useBomTemplateByGarment(garmentType: string | null) {
    return useQuery({
        queryKey: ["bom-template-by-garment", garmentType],
        queryFn: async () => {
            if (!garmentType) return null;
            const { templates } = await api.get("/bom-templates");
            return templates.find((t: any) => t.garment_type === garmentType) || null;
        },
        enabled: !!garmentType,
    });
}

export function useBomTemplateItems(templateId: string | null) {
    return useQuery({
        queryKey: ["bom-template-items", templateId],
        queryFn: async () => {
            if (!templateId) return [];
            const { items } = await api.get(`/bom-templates/${templateId}`);
            return items;
        },
        enabled: !!templateId,
    });
}

export function useCreateBomTemplate() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: { garment_type: string; name: string; description?: string }) => {
            const { template } = await api.post("/bom-templates", data);
            return template;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["bom-templates"] });
            toast({ title: "BOM template created" });
        },
        onError: (e: Error) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        },
    });
}

export function useUpdateBomTemplate() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
            const { template } = await api.put(`/bom-templates/${id}`, data);
            return template;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["bom-templates"] });
            toast({ title: "BOM template updated" });
        },
        onError: (e: Error) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        },
    });
}

export function useCreateBomTemplateItem() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: {
            template_id: string;
            item_id?: string;
            item_name: string;
            default_quantity: number;
            unit: string;
            notes?: string;
        }) => {
            const { item } = await api.post(`/bom-templates/${data.template_id}/items`, data);
            return item;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["bom-template-items"] });
            qc.invalidateQueries({ queryKey: ["bom-templates"] });
            toast({ title: "Item added to template" });
        },
        onError: (e: Error) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        },
    });
}

export function useDeleteBomTemplateItem() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/bom-templates/items/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["bom-template-items"] });
            qc.invalidateQueries({ queryKey: ["bom-templates"] });
            toast({ title: "Item removed" });
        },
        onError: (e: Error) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        },
    });
}

export function useGenerateOrderBom() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ orderId }: { orderId: string; garmentType: string; branchId: string }) => {
            // BOM is auto-generated on order creation in the API
            return [];
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["order-bom"] });
        },
        onError: (e: Error) => {
            toast({ title: "BOM generation failed", description: e.message, variant: "destructive" });
        },
    });
}
