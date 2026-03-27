import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'admin' | 'manager' | 'pos_operator' | 'tailor' | 'inventory_manager' | 'delivery_person';
    phone?: string;
    specialization?: string;
    salary_type: 'monthly' | 'piece_rate';
    base_salary?: number;
    is_available: number;
    created_at: string;
}

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const { users } = await api.get<{ users: User[] }>('/users');
            return users;
        },
    });
}

export function useCreateUser() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: any) => api.post('/users', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["users"] });
            toast({ title: "Team member added" });
        },
    });
}

export function useUpdateUser() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, ...data }: any) => api.put(`/users/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["users"] });
            toast({ title: "Team member updated" });
        },
    });
}
