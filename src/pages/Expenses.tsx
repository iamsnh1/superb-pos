import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
    Plus, Receipt, TrendingDown, Filter, Wallet, Building,
    Zap, Droplets, Phone, Wrench, Truck, Package, Megaphone, MoreHorizontal, Trash2, Edit
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
    "Shop Rent": Building,
    "Electricity": Zap,
    "Water": Droplets,
    "Internet & Phone": Phone,
    "Equipment Maintenance": Wrench,
    "Transport": Truck,
    "Packaging": Package,
    "Marketing": Megaphone,
    "Miscellaneous": MoreHorizontal,
};

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "upi", label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "other", label: "Other" },
];

export default function Expenses() {
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [filterCategory, setFilterCategory] = useState("all");
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Form state
    const [formCategoryId, setFormCategoryId] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [formDescription, setFormDescription] = useState("");
    const [formPaymentMethod, setFormPaymentMethod] = useState("cash");
    const [formReference, setFormReference] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Queries
    const { data: categoriesData } = useQuery({
        queryKey: ["expense-categories"],
        queryFn: () => api.get<{ categories: any[] }>("/expenses/categories"),
    });

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ["expenses", filterCategory, startDate, endDate],
        queryFn: () => {
            let url = `/expenses?start_date=${startDate}&end_date=${endDate}`;
            if (filterCategory !== "all") url += `&category_id=${filterCategory}`;
            return api.get<{ expenses: any[]; total: number }>(url);
        },
    });

    const { data: summaryData } = useQuery({
        queryKey: ["expense-summary", startDate, endDate],
        queryFn: () => api.get<{ summary: any[]; total_expenses: number }>(`/expenses/summary?start_date=${startDate}&end_date=${endDate}`),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/expenses", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            setShowAddDialog(false);
            resetForm();
            toast({ title: "Expense recorded" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/expenses/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            setEditingExpense(null);
            resetForm();
            toast({ title: "Expense updated" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/expenses/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            toast({ title: "Expense deleted" });
        },
    });

    const resetForm = () => {
        setFormCategoryId("");
        setFormAmount("");
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormDescription("");
        setFormPaymentMethod("cash");
        setFormReference("");
    };

    const openEdit = (expense: any) => {
        setFormCategoryId(String(expense.category_id));
        setFormAmount(String(expense.amount));
        setFormDate(expense.expense_date);
        setFormDescription(expense.description || "");
        setFormPaymentMethod(expense.payment_method || "cash");
        setFormReference(expense.reference || "");
        setEditingExpense(expense);
    };

    const handleSubmit = () => {
        const data = {
            category_id: Number(formCategoryId),
            amount: Number(formAmount),
            expense_date: formDate,
            description: formDescription || undefined,
            payment_method: formPaymentMethod,
            reference: formReference || undefined,
        };

        if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const categories = categoriesData?.categories || [];
    const expenses = expensesData?.expenses || [];
    const summary = summaryData?.summary || [];
    const totalExpenses = summaryData?.total_expenses || 0;

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight">Expense Tracking</h1>
                        <p className="text-muted-foreground mt-1">Track shop overheads and operational expenses.</p>
                    </div>
                    <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Expense
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
                                    <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {summary.slice(0, 3).map((cat: any) => {
                        const Icon = CATEGORY_ICONS[cat.category] || Receipt;
                        return (
                            <Card key={cat.category}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">{cat.category}</p>
                                            <p className="text-xl font-bold">{formatCurrency(cat.total)}</p>
                                            <p className="text-xs text-muted-foreground">{cat.count} entries</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">From</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">To</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Category</Label>
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" /> Expense Records
                            <Badge variant="secondary" className="ml-auto">{expenses.length} entries</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No expenses recorded for this period
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((exp: any) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="font-medium">
                                                {new Date(exp.expense_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{exp.category_name}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                {exp.description || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs capitalize">{exp.payment_method?.replace("_", " ")}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-red-600">
                                                {formatCurrency(exp.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exp)}>
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700"
                                                        onClick={() => deleteMutation.mutate(exp.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
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

                {/* Add / Edit Dialog */}
                <Dialog open={showAddDialog || !!editingExpense} onOpenChange={(open) => {
                    if (!open) { setShowAddDialog(false); setEditingExpense(null); resetForm(); }
                }}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c: any) => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount (₹)</Label>
                                    <Input type="number" step="0.01" value={formAmount}
                                        onChange={e => setFormAmount(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map(pm => (
                                                <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                                    placeholder="What was the expense for?" />
                            </div>

                            <div className="space-y-2">
                                <Label>Reference / Receipt No. (optional)</Label>
                                <Input value={formReference} onChange={e => setFormReference(e.target.value)}
                                    placeholder="e.g., Bill #123" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingExpense(null); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button
                                disabled={!formCategoryId || !formAmount || !formDate || createMutation.isPending || updateMutation.isPending}
                                onClick={handleSubmit}
                            >
                                {editingExpense ? "Update" : "Save Expense"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
