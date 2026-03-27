import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";
import { DollarSign, Wallet, AlertCircle, CheckCircle2, Search, Filter, ArrowLeft, Scissors, CheckCheck, Calendar, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useManufacturingOrders, useUpdateManufacturingOrder } from "@/hooks/useProduction";

// Fetch functions
const fetchEmployees = async () => {
    const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    });
    if (!res.ok) throw new Error("Failed to fetch employees");
    const data = await res.json();
    return data.users;
};

const fetchPayments = async (filters: any) => {
    const searchParams = new URLSearchParams();
    if (filters.employee_id) searchParams.append("employee_id", filters.employee_id);
    if (filters.start_date) searchParams.append("start_date", filters.start_date);
    if (filters.end_date) searchParams.append("end_date", filters.end_date);

    const res = await fetch(`/api/employee-payments?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    });
    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
};

const fetchEmployeeStats = async (employeeId: string) => {
    if (!employeeId || employeeId === "all") return null;
    const res = await fetch(`/api/employee-payments/${employeeId}/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
};

export default function EmployeePayments() {
    const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedUnpaidMos, setSelectedUnpaidMos] = useState<Set<number>>(new Set());
    const [completedFilter, setCompletedFilter] = useState<string>("all");
    const queryClient = useQueryClient();

    // Queries
    const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
    const { data: paymentsData } = useQuery({
        queryKey: ["employee-payments", selectedEmployee],
        queryFn: () => fetchPayments({ employee_id: selectedEmployee === "all" ? undefined : selectedEmployee })
    });
    const { data: stats } = useQuery({
        queryKey: ["employee-stats", selectedEmployee],
        queryFn: () => fetchEmployeeStats(selectedEmployee),
        enabled: selectedEmployee !== "all"
    });
    
    const { data: allMos } = useManufacturingOrders();
    const updateMo = useUpdateManufacturingOrder();

    const activeMos = allMos?.filter((mo: any) => 
        mo.assigned_tailor_id === parseInt(selectedEmployee) && mo.status !== 'completed'
    ) || [];

    const rawCompletedMos = allMos?.filter((mo: any) => 
        mo.assigned_tailor_id === parseInt(selectedEmployee) && mo.status === 'completed'
    ) || [];

    const completedMos = rawCompletedMos.filter((mo: any) => {
        if (completedFilter === "all") return true;
        const compDateStr = mo.completion_date || mo.created_at;
        if (!compDateStr) return true;
        
        const compDate = new Date(compDateStr);
        const now = new Date();
        
        if (completedFilter === "this_week") {
            const start = startOfWeek(now, { weekStartsOn: 1 });
            const end = endOfWeek(now, { weekStartsOn: 1 });
            return compDate >= start && compDate <= end;
        }
        if (completedFilter === "last_week") {
            const lastWeek = subWeeks(now, 1);
            const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
            const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
            return compDate >= start && compDate <= end;
        }
        if (completedFilter === "this_month") {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            return compDate >= start && compDate <= end;
        }
        
        return true;
    });

    const groupedWeeks = useMemo(() => {
        if (!rawCompletedMos || !stats) return [];
        
        const groups: Record<string, any[]> = {};
        rawCompletedMos.forEach((mo: any) => {
            const date = new Date(mo.completion_date || mo.created_at || new Date());
            const startStr = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
            if (!groups[startStr]) groups[startStr] = [];
            groups[startStr].push(mo);
        });

        const sortedGroups = Object.keys(groups).map(key => {
            const start = new Date(key);
            const tasks = groups[key].sort((a,b) => new Date(a.completion_date || a.created_at).getTime() - new Date(b.completion_date || b.created_at).getTime());
            return {
                start,
                end: endOfWeek(start, { weekStartsOn: 1 }),
                tasks,
                earned: tasks.reduce((sum, t) => sum + (t.labor_cost || 0), 0),
                paidAmount: 0,
                status: 'UNPAID'
            };
        }).sort((a, b) => a.start.getTime() - b.start.getTime()); // Oldest first for FIFO

        let remainingPaid = stats?.total_paid || 0;

        for (const week of sortedGroups) {
            if (remainingPaid >= week.earned && week.earned > 0) {
                week.paidAmount = week.earned;
                remainingPaid -= week.earned;
                week.status = 'PAID';
            } else if (remainingPaid > 0) {
                week.paidAmount = remainingPaid;
                remainingPaid = 0;
                week.status = 'PARTIAL';
            } else {
                week.paidAmount = 0;
                week.status = 'UNPAID';
            }
        }

        return sortedGroups.sort((a, b) => b.start.getTime() - a.start.getTime()); // Newest first for UI
    }, [rawCompletedMos, stats]);

    // Mutation
    const createPayment = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/employee-payments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create payment");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
            queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
            setIsPaymentDialogOpen(false);
            toast.success("Payment recorded successfully");
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const bulkPayMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/employee-payments/bulk-pay", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to process bulk payment");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
            queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
            queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
            setSelectedUnpaidMos(new Set());
            toast.success("Piece-rate payout recorded successfully!");
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            {selectedEmployee !== "all" && (
                                <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee("all")}>
                                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            )}
                            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                                {selectedEmployee === "all" ? "Staff Directory" : employees?.find((e: any) => e.id.toString() === selectedEmployee)?.full_name || "Employee Profile"}
                            </h1>
                        </div>
                        <p className="text-muted-foreground mt-1 ml-[calc(2rem+12px)] md:ml-0">
                            {selectedEmployee === "all" ? "Select a worker to view their assigned work and payments." : "Detailed dashboard for assigned tasks and financial tracking."}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedEmployee !== "all" && (
                            <Button
                                onClick={() => setIsPaymentDialogOpen(true)}
                                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                            >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Record Payout
                            </Button>
                        )}
                    </div>
                </div>

                {/* Global View of all employees if none selected */}
                {selectedEmployee === "all" && employees && (
                    <Tabs defaultValue="directory" className="w-full overflow-hidden">
                        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent pb-0 mb-6 px-1">
                            <TabsTrigger 
                                value="directory" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                Staff Directory
                            </TabsTrigger>
                            <TabsTrigger 
                                value="global_weekly" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                <ListChecks className="w-4 h-4 mr-2" />
                                All Workers (This Week)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="directory" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {employees.map((emp: any) => {
                                    const empMos = allMos?.filter((mo: any) => mo.assigned_tailor_id === emp.id && mo.status !== 'completed') || [];
                                    return (
                                        <Card 
                                            key={emp.id} 
                                            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/40"
                                            onClick={() => setSelectedEmployee(emp.id.toString())}
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl uppercase">
                                                        {emp.full_name.charAt(0)}
                                                    </div>
                                                    <Badge variant="outline" className="capitalize">{emp.role}</Badge>
                                                </div>
                                                <h3 className="font-semibold text-lg">{emp.full_name}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">{emp.phone || "No Phone"}</p>
                                                
                                                <div className="flex items-center gap-2 pt-4 border-t">
                                                    <Scissors className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{empMos.length} Active Garments</span>
                                                </div>
                                                <Button className="w-full mt-4 bg-muted text-muted-foreground hover:bg-primary hover:text-white transition-colors" variant="secondary">
                                                    View Detailed Dashboard →
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="global_weekly" className="mt-0">
                            <Card className="border-muted shadow-sm">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl">All Workers: This Week's Dues</CardTitle>
                                            <CardDescription>See every worker's dues side by side for the current week.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Worker</TableHead>
                                                <TableHead className="text-right">Tasks Completed</TableHead>
                                                <TableHead className="text-right">Earned This Week</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((emp: any) => {
                                                const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                                                const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
                                                
                                                const empCompletedThisWeek = allMos?.filter((mo: any) => {
                                                    if (mo.assigned_tailor_id !== emp.id || mo.status === 'completed') {
                                                        const date = new Date(mo.completion_date || mo.created_at || new Date());
                                                        return mo.assigned_tailor_id === emp.id && mo.status === 'completed' && date >= thisWeekStart && date <= thisWeekEnd;
                                                    }
                                                    return false;
                                                }) || [];
                                                
                                                const earnedThisWeek = empCompletedThisWeek.reduce((sum: number, mo: any) => sum + (mo.labor_cost || 0), 0);
                                                
                                                if (empCompletedThisWeek.length === 0) return null;

                                                return (
                                                    <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedEmployee(emp.id.toString())}>
                                                        <TableCell className="font-medium text-primary flex items-center gap-2">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                                                                {emp.full_name.charAt(0)}
                                                            </div>
                                                            {emp.full_name}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{empCompletedThisWeek.length}</TableCell>
                                                        <TableCell className="text-right font-bold text-green-700">₹{earnedThisWeek.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Stats Cards (Only if employee selected) */}
                {selectedEmployee !== "all" && stats && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-green-700">Total Work Earnings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-800">₹{stats.total_earnings.toLocaleString()}</div>
                                <p className="text-xs text-green-600 mt-1">Based on piece-rate pricing set on completed work</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-700">Total Paid</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-800">₹{stats.total_paid.toLocaleString()}</div>
                                <p className="text-xs text-blue-600 mt-1">All time payments & advances</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-amber-700">Pending Amount</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-800">₹{stats.pending_amount.toLocaleString()}</div>
                                <p className="text-xs text-amber-600 mt-1">Unpaid completed work</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-muted">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Calculated Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.allowable_balance < 0 ? 'text-red-500' : 'text-foreground'}`}>
                                    ₹{stats.allowable_balance.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Earnings - Paid</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Dashboard Tabs for selected employee */}
                {selectedEmployee !== "all" && (
                    <Tabs defaultValue="tasks" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent pb-0 mb-6">
                            <TabsTrigger 
                                value="tasks" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                Assigned Garments
                            </TabsTrigger>
                            <TabsTrigger 
                                value="reports" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                <ListChecks className="w-4 h-4 mr-2" />
                                Weekly Summary
                            </TabsTrigger>
                            <TabsTrigger 
                                value="completed" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Completed & Pricing
                            </TabsTrigger>
                            <TabsTrigger 
                                value="payments" 
                                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-12 data-[state=active]:bg-transparent"
                            >
                                Payment History
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="tasks">
                            <Card className="border-muted shadow-sm">
                                <CardHeader className="pb-4 border-b">
                                    <CardTitle>Currently Assigned Work</CardTitle>
                                    <CardDescription>Garments currently sitting with this worker</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Bill #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Garment</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeMos?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                        No active garments assigned currently.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                activeMos.map((mo: any) => (
                                                    <TableRow key={mo.id}>
                                                        <TableCell className="font-medium text-xs">#{mo.order_number}</TableCell>
                                                        <TableCell>{mo.customer_name}</TableCell>
                                                        <TableCell className="capitalize">{mo.garment_type}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">{mo.status.replace(/_/g, ' ')}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Input 
                                                                    type="date"
                                                                    id={`finish-date-${mo.id}`}
                                                                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                                                                    className="h-8 w-36 text-xs"
                                                                />
                                                                <Button 
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                                                                    onClick={() => {
                                                                        const dateEl = document.getElementById(`finish-date-${mo.id}`) as HTMLInputElement;
                                                                        const dateVal = dateEl?.value ? new Date(dateEl.value).toISOString() : new Date().toISOString();
                                                                        updateMo.mutate({
                                                                            id: mo.id,
                                                                            status: 'completed',
                                                                            completion_date: dateVal
                                                                        });
                                                                    }}
                                                                >
                                                                    <CheckCheck className="w-3 h-3 mr-1" /> Finish
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reports">
                            <Card className="border-muted shadow-sm">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl">Weekly Billing Reports</CardTitle>
                                            <CardDescription>Automatically grouped tasks by week. FIFO payment status tracks your payouts against chronologial earnings.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 bg-muted/20">
                                    {groupedWeeks.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground bg-white rounded-md border border-dashed">
                                            No completed work recorded to generate reports.
                                        </div>
                                    ) : (
                                        <Accordion type="multiple" className="space-y-4">
                                            {groupedWeeks.map((week, i) => (
                                                <AccordionItem key={i} value={`week-${i}`} className="border bg-white rounded-lg shadow-sm px-4">
                                                    <AccordionTrigger className="hover:no-underline py-4">
                                                        <div className="flex flex-1 items-center justify-between mr-4 pr-4 border-r">
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="font-semibold text-base text-primary">
                                                                    Week of {format(week.start, 'MMM d')} - {format(week.end, 'MMM d, yyyy')}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">{week.tasks.length} tasks completed</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <div className="font-bold text-base">₹{week.earned.toLocaleString()}</div>
                                                                    <div className="text-[10px] text-muted-foreground">EARNED</div>
                                                                </div>
                                                                <Badge 
                                                                    variant={week.status === 'PAID' ? 'default' : week.status === 'PARTIAL' ? 'secondary' : 'destructive'}
                                                                    className={week.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                                                                >
                                                                    {week.status === 'PARTIAL' ? `PARTIAL (₹${week.paidAmount.toLocaleString()})` : week.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 pb-4">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableHead className="h-8 text-xs">Date Finished</TableHead>
                                                                    <TableHead className="h-8 text-xs">Customer</TableHead>
                                                                    <TableHead className="h-8 text-xs">Garment</TableHead>
                                                                    <TableHead className="h-8 text-xs text-right">Earned</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {week.tasks.map((t: any) => (
                                                                    <TableRow key={t.id} className="text-xs">
                                                                        <TableCell className="text-muted-foreground">
                                                                            {format(new Date(t.completion_date || t.created_at || new Date()), "MMM d, yyyy")}
                                                                        </TableCell>
                                                                        <TableCell>{t.customer_name}</TableCell>
                                                                        <TableCell className="capitalize">{t.garment_type}</TableCell>
                                                                        <TableCell className="text-right font-medium">₹{t.labor_cost || 0}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="completed">
                            <Card className="border-muted shadow-sm">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle>Completed Work & Piece Rates</CardTitle>
                                            <div className="flex items-center gap-4 mt-2">
                                                <CardDescription>Filter and pay off work automatically.</CardDescription>
                                                <Select value={completedFilter} onValueChange={setCompletedFilter}>
                                                    <SelectTrigger className="h-8 w-[160px] text-xs">
                                                        <Calendar className="w-3 h-3 mr-2 text-muted-foreground"/>
                                                        <SelectValue placeholder="Time Period" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Time</SelectItem>
                                                        <SelectItem value="this_week">This Week (Mon-Sun)</SelectItem>
                                                        <SelectItem value="last_week">Last Week</SelectItem>
                                                        <SelectItem value="this_month">This Month</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        {selectedUnpaidMos.size > 0 && (
                                            <Button 
                                                onClick={() => {
                                                    bulkPayMutation.mutate({
                                                        employee_id: parseInt(selectedEmployee),
                                                        mo_ids: Array.from(selectedUnpaidMos),
                                                        payment_date: format(new Date(), "yyyy-MM-dd"),
                                                        notes: `Piece-rate payout for ${selectedUnpaidMos.size} garments`
                                                    });
                                                }}
                                                disabled={bulkPayMutation.isPending}
                                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm shrink-0"
                                            >
                                                Payout Selected (₹{Array.from(selectedUnpaidMos).reduce((sum, id) => {
                                                    const mo = completedMos.find((m: any) => m.id === id);
                                                    return sum + (mo?.labor_cost || 0);
                                                }, 0)})
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox 
                                                        checked={
                                                            completedMos.filter((m: any) => !m.payment_status || m.payment_status === 'unpaid').length > 0 &&
                                                            selectedUnpaidMos.size === completedMos.filter((m: any) => !m.payment_status || m.payment_status === 'unpaid').length
                                                        }
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                const newSet = new Set<number>();
                                                                completedMos.forEach((m: any) => {
                                                                    if (!m.payment_status || m.payment_status === 'unpaid') newSet.add(m.id);
                                                                });
                                                                setSelectedUnpaidMos(newSet);
                                                            } else {
                                                                setSelectedUnpaidMos(new Set());
                                                            }
                                                        }}
                                                    />
                                                </TableHead>
                                                <TableHead>Date Finished</TableHead>
                                                <TableHead>Bill #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Garment</TableHead>
                                                <TableHead className="w-[150px]">Piece Rate (₹)</TableHead>
                                                <TableHead>Payout Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {completedMos?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                        No completed garments found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                completedMos.map((mo: any) => {
                                                    const isUnpaid = !mo.payment_status || mo.payment_status === 'unpaid';
                                                    return (
                                                        <TableRow key={mo.id} className={selectedUnpaidMos.has(mo.id) ? "bg-muted/30" : ""}>
                                                            <TableCell>
                                                                <Checkbox 
                                                                    checked={selectedUnpaidMos.has(mo.id)}
                                                                    disabled={!isUnpaid}
                                                                    onCheckedChange={(checked) => {
                                                                        const newSet = new Set(selectedUnpaidMos);
                                                                        if (checked) newSet.add(mo.id);
                                                                        else newSet.delete(mo.id);
                                                                        setSelectedUnpaidMos(newSet);
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium text-sm text-muted-foreground">
                                                                <Input 
                                                                    type="date"
                                                                    defaultValue={mo.completion_date || mo.created_at ? format(new Date(mo.completion_date || mo.created_at), "yyyy-MM-dd") : ""}
                                                                    className="h-8 w-36 text-xs text-muted-foreground"
                                                                    onBlur={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val) {
                                                                            updateMo.mutate({
                                                                                id: mo.id,
                                                                                completion_date: new Date(val).toISOString()
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium text-xs">#{mo.order_number}</TableCell>
                                                            <TableCell>{mo.customer_name}</TableCell>
                                                            <TableCell className="capitalize">{mo.garment_type}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center">
                                                                    <span className="text-xs text-muted-foreground mr-1">₹</span>
                                                                    <Input 
                                                                        type="number"
                                                                        defaultValue={mo.labor_cost || 0}
                                                                        className="h-8 max-w-[100px]"
                                                                        onBlur={(e) => {
                                                                            const val = parseFloat(e.target.value);
                                                                            if (val !== mo.labor_cost) {
                                                                                updateMo.mutate({
                                                                                    id: mo.id,
                                                                                    labor_cost: val
                                                                                });
                                                                                queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={mo.payment_status === 'paid' ? "default" : "secondary"}>
                                                                    {mo.payment_status?.toUpperCase() || "UNPAID"}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="payments">
                            <Card className="border-muted shadow-sm">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <CardTitle>Payment History</CardTitle>
                                            <CardDescription>Recent transaction records</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead>Recorded By</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentsData?.payments?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        No payment records found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paymentsData?.payments?.map((payment: any) => (
                                                    <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                                                        <TableCell className="font-medium">
                                                            {format(new Date(payment.payment_date), "MMM d, yyyy")}
                                                        </TableCell>
                                                        <TableCell>{payment.employee_name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize bg-background">
                                                                {payment.payment_type === 'adjustment' ? 'General Payout' : payment.payment_type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-green-600">
                                                            ₹{payment.amount.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                            {payment.notes || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {payment.created_by_name || "System"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* New Payment Dialog */}
                <PaymentDialog
                    open={isPaymentDialogOpen}
                    onOpenChange={setIsPaymentDialogOpen}
                    employees={employees}
                    preSelectedEmployee={selectedEmployee !== "all" ? selectedEmployee : undefined}
                    onSubmit={(data: any) => createPayment.mutate(data)}
                    isSubmitting={createPayment.isPending}
                />
            </div>
        </AppLayout>
    );
}

function PaymentDialog({ open, onOpenChange, employees, preSelectedEmployee, onSubmit, isSubmitting }: any) {
    const [formData, setFormData] = useState({
        employee_id: preSelectedEmployee || "",
        amount: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_type: "adjustment",
        notes: ""
    });

    useEffect(() => {
        if (open) {
            setFormData({
                employee_id: preSelectedEmployee || "",
                amount: "",
                payment_date: format(new Date(), "yyyy-MM-dd"),
                payment_type: "adjustment",
                notes: ""
            });
        }
    }, [open, preSelectedEmployee]);

    const selectedEmployeeObj = employees?.find((e: any) => e.id.toString() === formData.employee_id);

    const handleAutoFillSalary = () => {
        if (!selectedEmployeeObj) return;
        setFormData({
            ...formData,
            amount: selectedEmployeeObj.base_salary?.toString() || "0",
            payment_type: "salary",
            notes: `Salary for ${format(new Date(), "MMMM yyyy")}`
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Enter the payment details for the employee.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="employee">Employee</Label>
                        <Select
                            value={formData.employee_id}
                            onValueChange={(val) => setFormData({ ...formData, employee_id: val })}
                            disabled={!!preSelectedEmployee}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees?.map((emp: any) => (
                                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedEmployeeObj?.salary_type === "monthly" && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                                onClick={handleAutoFillSalary}
                            >
                                ✨ Auto-fill Monthly Salary (₹{selectedEmployeeObj.base_salary?.toLocaleString() || 0})
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.payment_date}
                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Payment Type</Label>
                        <Select
                            value={formData.payment_type}
                            onValueChange={(val) => setFormData({ ...formData, payment_type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="adjustment">General Payout</SelectItem>
                                <SelectItem value="salary">Monthly Salary</SelectItem>
                                <SelectItem value="commission">Commission / Piece Rate</SelectItem>
                                <SelectItem value="advance">Advance Payment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Optional notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !formData.employee_id || !formData.amount}>
                            {isSubmitting ? "Recording..." : "Record Payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
