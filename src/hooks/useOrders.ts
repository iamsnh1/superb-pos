import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useOrders(search?: string, status?: string, customerId?: string) {
  return useQuery({
    queryKey: ["orders", search, status, customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status && status !== 'all') params.set("status", status);
      if (customerId) params.set("customer_id", customerId);
      const data = await api.get(`/orders?${params}`);

      // Handle both { orders: [] } and directly returning array
      const orders = Array.isArray(data) ? data : data.orders || [];

      return orders.map((o: any) => ({
        ...o,
        design_specifications: typeof o.design_specifications === 'string' ? JSON.parse(o.design_specifications) : o.design_specifications,
        measurements: o.measurements ? (typeof o.measurements === 'string' ? JSON.parse(o.measurements) : o.measurements) : {},
        customers: { full_name: o.customer_name, customer_code: o.customer_code, phone: o.customer_phone },
        invoice_number: o.invoice_number || null,
      }));
    },
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (!id) return null;
      const { order, timeline, bom, related_orders } = await api.get(`/orders/${id}`);
      return {
        ...order,
        related_orders: related_orders || [],
        design_specifications: typeof order.design_specifications === 'string' ? JSON.parse(order.design_specifications) : order.design_specifications,
        customers: { full_name: order.customer_name, customer_code: order.customer_code, phone: order.customer_phone },
        measurement_profiles: order.measurements ? {
          measurements: typeof order.measurements === 'string' ? JSON.parse(order.measurements) : order.measurements,
          label: order.measurement_label
        } : null,
      };
    },
    enabled: !!id,
  });
}

export function useOrderTimeline(orderId: string | null) {
  return useQuery({
    queryKey: ["order-timeline", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { timeline } = await api.get(`/orders/${orderId}`);
      return timeline;
    },
    enabled: !!orderId,
  });
}

export function useOrderBom(orderId: string | null) {
  return useQuery({
    queryKey: ["order-bom", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { bom } = await api.get(`/orders/${orderId}`);
      return bom;
    },
    enabled: !!orderId,
  });
}

export function useCreateBulkOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orders: any[]) => {
      const res = await api.post("/orders/bulk", { orders });
      return res;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: `${data.created} orders created` });
      if (data.errors?.length) {
        toast({ title: "Some rows failed", description: data.errors.join("; "), variant: "destructive" });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      garment_type: string;
      measurement_profile_id?: string;
      fabric_source?: string;
      fabric_item_id?: string;
      design_specifications?: Record<string, any>;
      assigned_tailor_id?: string;
      priority?: string;
      delivery_date?: string;
      delivery_type?: string;
      total_amount?: number;
      discount_amount?: number;
      tax_amount?: number;
      advance_amount?: number;
      net_amount?: number;
      balance_amount?: number;
      notes?: string;
    }) => {
      const { order } = await api.post("/orders", data);
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Order created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string;[key: string]: any }) => {
      const { order } = await api.put(`/orders/${id}`, data);
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      toast({ title: "Order updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, notes, cancellation_reason }: { id: string; status: string; notes?: string; cancellation_reason?: string }) => {
      const { order } = await api.patch(`/orders/${id}/status`, { status, notes, cancellation_reason });
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["order-timeline"] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useTailors() {
  return useQuery({
    queryKey: ["tailors"],
    queryFn: async () => {
      const { tailors } = await api.get("/orders/meta/tailors");
      return tailors.map((t: any) => ({
        user_id: t.id,
        profiles: { full_name: t.full_name },
      }));
    },
  });
}
