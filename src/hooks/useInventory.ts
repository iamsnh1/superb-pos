import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ========== Categories ==========

export function useCategories() {
  return useQuery({
    queryKey: ["inventory-categories"],
    queryFn: async () => {
      const { categories } = await api.get("/inventory/categories");
      return categories;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; parent_id?: number }) => {
      const { category } = await api.post("/inventory/categories", data);
      return category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-categories"] });
      toast({ title: "Category created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ========== Inventory Items ==========

export function useInventoryItems(categoryId?: string, search?: string) {
  return useQuery({
    queryKey: ["inventory-items", categoryId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.set("category_id", categoryId);
      if (search) params.set("search", search);
      const { items } = await api.get(`/inventory/items?${params}`);
      return items.map((item: any) => ({
        ...item,
        attributes: typeof item.attributes === 'string' ? JSON.parse(item.attributes) : item.attributes,
      }));
    },
  });
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: ["inventory-item", id],
    queryFn: async () => {
      if (!id) return null;
      const { item } = await api.get(`/inventory/items/${id}`);
      return item;
    },
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category_id?: number;
      unit?: string;
      attributes?: Record<string, any>;
      initial_quantity?: number;
      reorder_level?: number;
    }) => {
      const { item } = await api.post("/inventory/items", data);
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({ title: "Item created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; category_id?: number; unit?: string; attributes?: Record<string, any>; reorder_level?: number }) => {
      const { item } = await api.put(`/inventory/items/${id}`, data);
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      toast({ title: "Item updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ========== Stock ==========

export function useStockLevels() {
  return useQuery({
    queryKey: ["stock-levels"],
    queryFn: async () => {
      const { stock } = await api.get("/inventory/stock");
      return stock;
    },
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { items } = await api.get("/inventory/stock/low");
      return items;
    },
  });
}

export function useStockTransactions(itemId?: string) {
  return useQuery({
    queryKey: ["stock-transactions", itemId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (itemId) params.set("item_id", itemId);
      const { transactions } = await api.get(`/inventory/transactions?${params}`);
      return transactions;
    },
  });
}

export function useCreateStockTransaction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      item_id: number;
      transaction_type: string;
      quantity: number;
      reference_type?: string;
      reference_id?: number;
      notes?: string;
    }) => {
      return await api.post("/inventory/transactions", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-levels"] });
      qc.invalidateQueries({ queryKey: ["stock-transactions"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      toast({ title: "Stock updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}
