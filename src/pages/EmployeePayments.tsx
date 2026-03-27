
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { DollarSign, Wallet, AlertCircle, CheckCircle2, Search, Filter } from "lucide-react";
import { toast } from "sonner";

// Fetch functions
const fetchEmployees = async () => {
    const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    });
    if (!res.ok) throw new Error("Failed to fetch employees");
    const data = await res.json();
    // Filter only employees/tailors if needed, but for now show all
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

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Staff Payments</h1>
                        <p className="text-muted-foreground mt-1">Manage tailor payouts, salaries, and commissions.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger className="w-[200px] h-10 border-muted-foreground/20">
                                <SelectValue placeholder="Filter by Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees?.map((emp: any) => (
                                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => setIsPaymentDialogOpen(true)}
                            className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                        >
                            <DollarSign className="w-4 h-4 mr-2" />
                            New Payment
                        </Button>
                    </div>
                </div>

                {/* Stats Cards (Only if employee selected) */}
                {selectedEmployee !== "all" && stats && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-green-700">Total Work Earnings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-800">₹{stats.total_earnings.toLocaleString()}</div>
                                <p className="text-xs text-green-600 mt-1">Based on completed orders</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-700">Total Paid</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-800">₹{stats.total_paid.toLocaleString()}</div>
                                <p className="text-xs text-blue-600 mt-1">All time payments</p>
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

                {/* Payments List */}
                <Card className="border-muted shadow-sm">
                    <CardHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle>Payment History</CardTitle>
                                <CardDescription>Recent transaction records</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="h-8">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                            </Button>
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
