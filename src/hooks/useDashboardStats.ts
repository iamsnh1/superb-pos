import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DashboardStats {
    today_orders: number;
    pending_orders: number;
    today_revenue: number;
    total_customers: number;
    low_stock_count: number;
    urgent_orders_count: number;
    overdue_payments_count: number;
    orders_by_status: { status: string; count: number }[];
    recent_orders: {
        id: number;
        order_number: string;
        total_amount: number;
        status: string;
        created_at: string;
        customer_name: string;
    }[];
    recent_production: {
        id: number;
        mo_number: string;
        status: string;
        customer_name: string;
        delivery_date: string;
    }[];
}

export const useDashboardStats = () => {
    return useQuery<DashboardStats>({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            return await api.get("/dashboard/stats");
        },
        refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
        staleTime: 0,
    });
};

export function useSalesReport(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ["sales-report", startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.set("start_date", startDate);
            if (endDate) params.set("end_date", endDate);
            const res = await api.get(`/dashboard/sales?${params}`);
            return res.sales;
        },
    });
}

export function useGarmentTypeReport() {
    return useQuery({
        queryKey: ["garment-type-report"],
        queryFn: async () => {
            const res = await api.get("/dashboard/garment-types");
            return res.data;
        },
    });
}

export function useTopCustomers() {
    return useQuery({
        queryKey: ["top-customers"],
        queryFn: async () => {
            const res = await api.get("/dashboard/top-customers");
            return res.customers;
        },
    });
}
