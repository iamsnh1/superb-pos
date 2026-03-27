import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const { customers } = await api.get(`/customers?${params}`);
      return customers;
    },
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      const { customer } = await api.get(`/customers/${id}`);
      return customer;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { full_name: string; phone?: string; email?: string; address?: string; birthday?: string }) => {
      const { customer } = await api.post("/customers", data);
      return customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; full_name?: string; phone?: string; email?: string; address?: string }) => {
      const { customer } = await api.put(`/customers/${id}`, data);
      return customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useMeasurements(customerId: string | null) {
  return useQuery({
    queryKey: ["measurements", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { measurements } = await api.get(`/customers/${customerId}/measurements`);
      return measurements.map((m: any) => ({
        ...m,
        measurements: typeof m.measurements === 'string' ? JSON.parse(m.measurements) : m.measurements,
      }));
    },
    enabled: !!customerId,
  });
}

export function useCreateMeasurement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ customerId, ...data }: { customerId: string; garment_type: string; label?: string; measurements: Record<string, number>; notes?: string }) => {
      const { measurement } = await api.post(`/customers/${customerId}/measurements`, data);
      return measurement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      toast({ title: "Measurement saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateMeasurement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; measurements: Record<string, number>; notes?: string }) => {
      const { measurement } = await api.put(`/customers/measurements/${id}`, data);
      return measurement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      toast({ title: "Measurement updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/measurements/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      toast({ title: "Measurement deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ========== Measurement Requests ==========

export function useMeasurementRequests(customerId: string | null) {
  return useQuery({
    queryKey: ["measurement-requests", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { requests } = await api.get(`/customers/${customerId}/requests`);
      return requests;
    },
    enabled: !!customerId,
  });
}

export function useCreateMeasurementRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { customer_id: string; garment_type: string; requested_changes: string }) => {
      const { request } = await api.post("/customers/requests", data);
      return request;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["measurement-requests", variables.customer_id] });
      toast({ title: "Request created" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateMeasurementRequestStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, customerId }: { id: string; status: 'pending' | 'approved' | 'rejected', customerId: string }) => {
      const { request } = await api.put(`/customers/requests/${id}`, { status });
      return request;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["measurement-requests", variables.customerId] });
      toast({ title: "Status updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}
