import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { branches } = await api.get<{ branches: any[] }>("/branches");
      return branches ?? [];
    },
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { name: string; address?: string; phone?: string; email?: string }) => {
      const { branch } = await api.post("/branches", input);
      return branch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch created" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string | number;[key: string]: any }) => {
      const { branch } = await api.put(`/branches/${id}`, input);
      return branch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch updated" });
    },
    onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}
