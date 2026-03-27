import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDeliveries(search?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["deliveries", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const { deliveries } = await api.get<{ deliveries: any[] }>(`/delivery/tracking?${params}`);
      return deliveries ?? [];
    },
  });
}

export function useDeliveryTrials(date?: string) {
  return useQuery({
    queryKey: ["delivery-trials"],
    queryFn: async () => {
      const { trials } = await api.get<{ trials: any[] }>("/delivery/trials");
      return trials ?? [];
    },
  });
}

export function useDeliveryPersons() {
  return useQuery({
    queryKey: ["delivery-persons"],
    queryFn: async () => {
      const { persons } = await api.get<{ persons: any[] }>("/delivery/persons");
      return persons ?? [];
    },
  });
}

export function useDeliveryReminders(date?: string) {
  return useQuery({
    queryKey: ["delivery-reminders", date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      return api.get<{ trialReminders: any[]; deliveryReminders: any[] }>(`/delivery/reminders?${params}`);
    },
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      order_id: string | number;
      delivery_person_id?: string | number;
      delivery_status?: string;
      scheduled_date?: string;
      scheduled_time?: string;
      notes?: string;
      [key: string]: any;
    }) => {
      const { success } = await api.put(`/delivery/tracking/${input.order_id}`, {
        delivery_status: input.delivery_status ?? "scheduled",
        delivery_person_id: input.delivery_person_id,
      });
      return success;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Delivery scheduled" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      failure_reason,
      delivery_person_id,
    }: {
      id: string | number;
      status: string;
      failure_reason?: string;
      delivery_person_id?: string | number;
    }) => {
      await api.put(`/delivery/tracking/${id}`, {
        delivery_status: status,
        status: status === "delivered" ? "delivered" : undefined,
        delivery_person_id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Delivery updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateTrialStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      orderId,
      trial_status,
      fitting_notes,
      trial_date,
    }: {
      orderId: string | number;
      trial_status?: string;
      fitting_notes?: string;
      trial_date?: string;
    }) => {
      await api.put(`/delivery/trials/${orderId}`, { trial_status, fitting_notes, trial_date });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-trials"] });
      toast({ title: "Trial updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}
