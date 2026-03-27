import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface Trial {
    id: number;
    order_number: string;
    trial_date: string;
    trial_status: 'pending' | 'completed' | 'missed';
    garment_type: string;
    fitting_notes?: string;
    customer_name: string;
    customer_phone: string;
}

export interface Delivery {
    id: number;
    order_number: string;
    status: string;
    delivery_status: 'scheduled' | 'in_transit' | 'delivered' | 'failed';
    delivery_date: string;
    delivery_type: 'pickup' | 'home_delivery';
    delivery_proof_url?: string;
    delivery_person_id?: number;
    delivery_person_name?: string;
    customer_name: string;
    customer_phone: string;
}

export function useTrials() {
    return useQuery({
        queryKey: ["trials"],
        queryFn: async () => {
            const { trials } = await api.get<{ trials: Trial[] }>('/delivery/trials');
            return trials;
        },
    });
}

export function useDeliveries() {
    return useQuery({
        queryKey: ["deliveries"],
        queryFn: async () => {
            const { deliveries } = await api.get<{ deliveries: Delivery[] }>('/delivery/tracking');
            return deliveries;
        },
    });
}

export function useReminders(date?: string) {
  const dateStr = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["reminders", dateStr],
    queryFn: async () => {
      const data = await api.get<{
        trialReminders: any[];
        deliveryReminders: any[];
        date: string;
      }>(`/delivery/reminders?date=${dateStr}`);
      return data;
    },
  });
}

export function useDeliveryPersons() {
    return useQuery({
        queryKey: ["delivery-persons"],
        queryFn: async () => {
            const { persons } = await api.get<{ persons: any[] }>('/delivery/persons');
            return persons;
        },
    });
}

export function useUpdateTrial() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            return api.put(`/delivery/trials/${id}`, data);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["trials"] });
            toast({ title: "Trial updated" });
        },
    });
}

export function useUpdateDelivery() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            return api.put(`/delivery/tracking/${id}`, data);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["deliveries"] });
            toast({ title: "Delivery updated" });
        },
    });
}
