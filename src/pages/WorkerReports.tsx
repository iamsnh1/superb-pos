import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    format, startOfWeek, endOfWeek, subWeeks, addWeeks, isWithinInterval
} from "date-fns";
import {
    ChevronLeft, ChevronRight, Wallet, Clock, DollarSign,
    User, CalendarDays, CheckCircle2, BanknoteIcon, AlertCircle, Gift
} from "lucide-react";
import { toast } from "sonner";

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
});

type PayType = "week" | "task" | "advance";

interface PayState {
    type: PayType;
    label: string;
    suggestedAmount: number;
    taskId?: number;
}

export default function WorkerReports() {
    const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [payState, setPayState] = useState<PayState | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payNotes, setPayNotes] = useState("");
    const [editingRates, setEditingRates] = useState<Record<number, string>>({});
    const queryClient = useQueryClient();

    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    // ─── Fetches ───────────────────────────────────────────────────────────
    const { data: employees = [] } = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const r = await fetch("/api/users", { headers: authHeaders() });
            return (await r.json()).users || [];
        }
    });

    const { data: allMos = [] } = useQuery({
        queryKey: ["manufacturing-orders-all"],
        queryFn: async () => {
            const r = await fetch("/api/production", { headers: authHeaders() });
            return (await r.json()).mos || [];
        },
        refetchInterval: 8000
    });

    const { data: stats, refetch: refetchStats } = useQuery({
        queryKey: ["employee-stats", selectedWorkerId],
        enabled: !!selectedWorkerId,
        queryFn: async () => {
            const r = await fetch(`/api/employee-payments/${selectedWorkerId}/stats`, { headers: authHeaders() });
            return r.json();
        }
    });

    const { data: paymentHistory = [], refetch: refetchHistory } = useQuery({
        queryKey: ["employee-payments-history", selectedWorkerId],
        enabled: !!selectedWorkerId,
        queryFn: async () => {
            const r = await fetch(`/api/employee-payments?employee_id=${selectedWorkerId}`, { headers: authHeaders() });
            return (await r.json()).payments || [];
        }
    });

    // ─── Update Labor Cost Mutation ──────────────────────────────────────────
    const updateLaborCost = useMutation({
        mutationFn: async ({ moId, laborCost }: { moId: number; laborCost: number }) => {
            const r = await fetch(`/api/production/${moId}`, {
                method: "PUT", headers: authHeaders(),
                body: JSON.stringify({ labor_cost: laborCost })
            });
            if (!r.ok) throw new Error((await r.json()).error || "Failed to update");
            return r.json();
        },
        onSuccess: (_, { moId }) => {
            queryClient.invalidateQueries({ queryKey: ["manufacturing-orders-all"] });
            queryClient.invalidateQueries({ queryKey: ["employee-stats", selectedWorkerId] });
            setEditingRates(prev => { const n = { ...prev }; delete n[moId]; return n; });
            toast.success("Labor rate saved!");
        },
        onError: (e: any) => toast.error(e.message)
    });

    // ─── Record Payment Mutation ────────────────────────────────────────────
    const recordPayment = useMutation({
        mutationFn: async (body: any) => {
            const r = await fetch("/api/employee-payments", {
                method: "POST", headers: authHeaders(), body: JSON.stringify(body)
            });
            if (!r.ok) throw new Error((await r.json()).error);
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["employee-stats", selectedWorkerId] });
            queryClient.invalidateQueries({ queryKey: ["employee-payments-history", selectedWorkerId] });
            setPayState(null); setPayAmount(""); setPayNotes("");
            toast.success("✅ Payment recorded successfully!");
        },
        onError: (e: any) => toast.error(e.message)
    });

    // ─── Derived ────────────────────────────────────────────────────────────
    const worker = employees.find((e: any) => e.id === selectedWorkerId);

    const workerMos = useMemo(() =>
        allMos.filter((mo: any) => mo.assigned_tailor_id === selectedWorkerId),
        [allMos, selectedWorkerId]);

    const activeMos = useMemo(() =>
        workerMos.filter((mo: any) => mo.status !== "completed"),
        [workerMos]);

    const allCompletedSorted = useMemo(() =>
        workerMos
            .filter((mo: any) => mo.status === "completed")
            .sort((a: any, b: any) =>
                new Date(a.completion_date || a.created_at).getTime() -
                new Date(b.completion_date || b.created_at).getTime()),
        [workerMos]);

    const thisWeekCompleted = useMemo(() =>
        allCompletedSorted.filter((mo: any) =>
            isWithinInterval(new Date(mo.completion_date || mo.created_at), { start: currentWeekStart, end: currentWeekEnd })
        ),
        [allCompletedSorted, currentWeekStart, currentWeekEnd]);

    const thisWeekEarned = thisWeekCompleted.reduce((s: number, mo: any) => s + (mo.labor_cost || 0), 0);

    // FIFO: determine how much of total_paid covers this specific week
    const weekPaymentStatus = useMemo(() => {
        if (!stats) return { status: "UNPAID" as const, paidForWeek: 0, dueForWeek: thisWeekEarned };
        let remaining = stats.total_paid || 0;

        const weekMap: Record<string, number> = {};
        allCompletedSorted.forEach((mo: any) => {
            const d = new Date(mo.completion_date || mo.created_at);
            const key = startOfWeek(d, { weekStartsOn: 1 }).toISOString();
            weekMap[key] = (weekMap[key] || 0) + (mo.labor_cost || 0);
        });
        const sortedKeys = Object.keys(weekMap).sort();
        const thisKey = currentWeekStart.toISOString();

        for (const k of sortedKeys) {
            const earned = weekMap[k];
            if (k === thisKey) {
                if (thisWeekEarned === 0) return { status: "PAID" as const, paidForWeek: 0, dueForWeek: 0 };
                if (remaining >= thisWeekEarned) return { status: "PAID" as const, paidForWeek: thisWeekEarned, dueForWeek: 0 };
                const due = thisWeekEarned - remaining;
                return remaining > 0
                    ? { status: "PARTIAL" as const, paidForWeek: remaining, dueForWeek: due }
                    : { status: "UNPAID" as const, paidForWeek: 0, dueForWeek: thisWeekEarned };
            }
            remaining = Math.max(0, remaining - earned);
        }
        return { status: "UNPAID" as const, paidForWeek: 0, dueForWeek: thisWeekEarned };
    }, [stats, allCompletedSorted, currentWeekStart, thisWeekEarned]);

    // Sidebar summary
    const workerSummaries = useMemo(() =>
        employees.map((emp: any) => {
            const mos = allMos.filter((mo: any) => mo.assigned_tailor_id === emp.id);
            const active = mos.filter((mo: any) => mo.status !== "completed").length;
            const weekMos = mos.filter((mo: any) =>
                mo.status === "completed" &&
                isWithinInterval(new Date(mo.completion_date || mo.created_at), { start: currentWeekStart, end: currentWeekEnd })
            );
            const weekEarned = weekMos.reduce((s: number, m: any) => s + (m.labor_cost || 0), 0);
            return { ...emp, active, weekEarned, weekTaskCount: weekMos.length };
        }),
        [employees, allMos, currentWeekStart, currentWeekEnd]);

    // ─── Helpers ────────────────────────────────────────────────────────────
    const openWeekPay = () => {
        if (weekPaymentStatus.dueForWeek <= 0) return;
        setPayState({
            type: "week",
            label: `Week ${format(currentWeekStart, "MMM d")} – ${format(currentWeekEnd, "MMM d, yyyy")}`,
            suggestedAmount: weekPaymentStatus.dueForWeek
        });
        setPayAmount(String(weekPaymentStatus.dueForWeek));
        setPayNotes(`Payment for week ${format(currentWeekStart, "MMM d")} – ${format(currentWeekEnd, "MMM d, yyyy")}`);
    };

    const openTaskPay = (mo: any) => {
        setPayState({
            type: "task",
            label: `Task #${mo.order_number} — ${mo.customer_name} (${mo.garment_type})`,
            suggestedAmount: mo.labor_cost || 0,
            taskId: mo.id
        });
        setPayAmount(String(mo.labor_cost || 0));
        setPayNotes(`Payment for task #${mo.order_number}`);
    };

    const openAdvancePay = () => {
        setPayState({ type: "advance", label: "Advance Payment", suggestedAmount: 0 });
        setPayAmount("");
        setPayNotes("Advance");
    };

    const submitPayment = () => {
        recordPayment.mutate({
            employee_id: selectedWorkerId,
            amount: parseFloat(payAmount),
            notes: payNotes,
            payment_type: payState?.type === "advance" ? "advance" : "payout",
            payment_date: format(new Date(), "yyyy-MM-dd")
        });
    };

    const statusColor = (s: string) =>
        s === "PAID" ? "bg-green-100 text-green-800 border-green-200"
        : s === "PARTIAL" ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";

    const isCurrentWeek = currentWeekStart.getTime() === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

    return (
        <AppLayout>
            <div className="flex h-full min-h-screen -m-6 overflow-hidden">

                {/* ── Sidebar ── */}
                <aside className="w-72 shrink-0 border-r bg-background flex flex-col">
                    <div className="px-5 py-4 border-b">
                        <h2 className="font-bold text-base">Workers</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Click to view week-wise report</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {workerSummaries.map((emp: any) => (
                            <button key={emp.id} onClick={() => setSelectedWorkerId(emp.id)}
                                className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                                    selectedWorkerId === emp.id
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                        : "bg-muted/30 hover:bg-muted border-transparent"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm uppercase ${
                                        selectedWorkerId === emp.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                    }`}>{emp.full_name.charAt(0)}</div>
                                    <div className="min-w-0">
                                        <div className={`font-semibold text-sm truncate ${selectedWorkerId === emp.id ? "text-white" : ""}`}>{emp.full_name}</div>
                                        <div className={`text-[11px] mt-0.5 ${selectedWorkerId === emp.id ? "text-white/70" : "text-muted-foreground"}`}>
                                            {emp.active} active · {emp.weekTaskCount} this week · ₹{emp.weekEarned}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ── Main ── */}
                <main className="flex-1 overflow-y-auto bg-muted/20">
                    {!selectedWorkerId ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center text-muted-foreground">
                            <User className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-xl font-semibold text-foreground">Select a Worker</h3>
                            <p className="text-sm mt-1">Choose from the left panel to view weekly work & payments</p>
                        </div>
                    ) : (
                        <div className="p-6 space-y-5">

                            {/* Header */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase">
                                        {worker?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold">{worker?.full_name}</h1>
                                        <p className="text-sm text-muted-foreground capitalize">{worker?.role} · {worker?.phone || "No phone"}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" onClick={openAdvancePay}>
                                        <Gift className="w-4 h-4 mr-2 text-violet-500" /> Advance Payment
                                    </Button>
                                    <Button variant="outline" onClick={() => {
                                        setPayState({ type: "week", label: "Manual payment", suggestedAmount: Math.max(0, stats?.allowable_balance || 0) });
                                        setPayAmount(String(Math.max(0, stats?.allowable_balance || 0)));
                                        setPayNotes("Manual payment");
                                    }}>
                                        <Wallet className="w-4 h-4 mr-2" /> Record Payment
                                    </Button>
                                </div>
                            </div>

                            {/* Stats */}
                            {stats && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Card className="border-green-200 bg-green-50">
                                        <CardContent className="p-4">
                                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">All-Time Earned</p>
                                            <p className="text-2xl font-bold text-green-800 mt-1">₹{(stats.total_earnings || 0).toLocaleString()}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-blue-200 bg-blue-50">
                                        <CardContent className="p-4">
                                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Paid</p>
                                            <p className="text-2xl font-bold text-blue-800 mt-1">₹{(stats.total_paid || 0).toLocaleString()}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={`border-2 ${(stats.allowable_balance || 0) > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                                        <CardContent className="p-4">
                                            <p className={`text-xs font-semibold uppercase tracking-wide ${(stats.allowable_balance || 0) > 0 ? "text-red-700" : "text-emerald-700"}`}>Balance Due</p>
                                            <p className={`text-2xl font-bold mt-1 ${(stats.allowable_balance || 0) > 0 ? "text-red-800" : "text-emerald-800"}`}>
                                                ₹{Math.max(0, stats.allowable_balance || 0).toLocaleString()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-violet-200 bg-violet-50">
                                        <CardContent className="p-4">
                                            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Active Garments</p>
                                            <p className="text-2xl font-bold text-violet-800 mt-1">{activeMos.length}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Week Navigator */}
                            <div className="flex items-center justify-between bg-white border rounded-xl px-5 py-3 shadow-sm">
                                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="text-center">
                                    <div className="flex items-center gap-2 justify-center font-bold text-primary text-base">
                                        <CalendarDays className="w-4 h-4" />
                                        {format(currentWeekStart, "MMM d")} — {format(currentWeekEnd, "MMM d, yyyy")}
                                        {isCurrentWeek && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 ml-1">This Week</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {thisWeekCompleted.length} tasks completed · ₹{thisWeekEarned.toLocaleString()} earned
                                    </p>
                                </div>
                                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ── COMPLETED WORK THIS WEEK ── */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <div>
                                                <CardTitle className="text-base">
                                                    Completed This Week
                                                    <span className="ml-2 text-sm font-normal text-muted-foreground">({thisWeekCompleted.length} tasks)</span>
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-0.5">
                                                    {format(currentWeekStart, "EEEE, MMM d")} – {format(currentWeekEnd, "EEEE, MMM d")}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        {thisWeekCompleted.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-xs px-3 py-1 ${statusColor(weekPaymentStatus.status)}`}>
                                                    {weekPaymentStatus.status === "PARTIAL"
                                                        ? `PARTIAL · ₹${weekPaymentStatus.paidForWeek} of ₹${thisWeekEarned}`
                                                        : weekPaymentStatus.status}
                                                </Badge>
                                                {weekPaymentStatus.status !== "PAID" && (
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={openWeekPay}>
                                                        <BanknoteIcon className="w-4 h-4" />
                                                        Release Week Payment · ₹{weekPaymentStatus.dueForWeek.toLocaleString()}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Alert banner when week is unpaid */}
                                    {thisWeekCompleted.length > 0 && weekPaymentStatus.status !== "PAID" && (
                                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                            <div>
                                                <span className="font-semibold">{worker?.full_name}</span> completed{" "}
                                                <span className="font-semibold">{thisWeekCompleted.length} tasks</span> this week earning{" "}
                                                <span className="font-semibold">₹{thisWeekEarned.toLocaleString()}</span>.{" "}
                                                {weekPaymentStatus.status === "PARTIAL"
                                                    ? `₹${weekPaymentStatus.paidForWeek} already paid — ₹${weekPaymentStatus.dueForWeek} still due.`
                                                    : "Payment not yet released."}
                                            </div>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="p-0">
                                    {thisWeekCompleted.length === 0 ? (
                                        <div className="py-10 text-center text-sm text-muted-foreground">
                                            No completed work in this week. Use ◄ ► to navigate to other weeks.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="h-9 text-xs">Date</TableHead>
                                                    <TableHead className="h-9 text-xs">Receipt #</TableHead>
                                                    <TableHead className="h-9 text-xs">Customer</TableHead>
                                                    <TableHead className="h-9 text-xs">Garment</TableHead>
                                                    <TableHead className="h-9 text-xs text-right">Labor Rate</TableHead>
                                                    <TableHead className="h-9 text-xs text-right">Pay</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {thisWeekCompleted.map((mo: any) => {
                                                    const isEditing = mo.id in editingRates;
                                                    const hasRate = (mo.labor_cost || 0) > 0;
                                                    return (
                                                        <TableRow key={mo.id} className={`text-sm hover:bg-muted/30 ${!hasRate ? "bg-amber-50/50" : ""}`}>
                                                            <TableCell className="text-muted-foreground text-xs">
                                                                {format(new Date(mo.completion_date || mo.created_at), "E, MMM d")}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">#{mo.order_number}</TableCell>
                                                            <TableCell className="font-medium">{mo.customer_name}</TableCell>
                                                            <TableCell className="capitalize">{mo.garment_type}</TableCell>
                                                            <TableCell className="text-right">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Input
                                                                            type="number"
                                                                            className="h-7 w-24 text-xs text-right"
                                                                            placeholder="₹ rate"
                                                                            value={editingRates[mo.id]}
                                                                            onChange={e => setEditingRates(prev => ({ ...prev, [mo.id]: e.target.value }))}
                                                                            onKeyDown={e => {
                                                                                if (e.key === "Enter") {
                                                                                    const val = parseFloat(editingRates[mo.id]);
                                                                                    if (!isNaN(val) && val > 0) updateLaborCost.mutate({ moId: mo.id, laborCost: val });
                                                                                }
                                                                                if (e.key === "Escape") setEditingRates(prev => { const n = { ...prev }; delete n[mo.id]; return n; });
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <Button size="sm" className="h-7 text-xs bg-primary" onClick={() => {
                                                                            const val = parseFloat(editingRates[mo.id]);
                                                                            if (!isNaN(val) && val > 0) updateLaborCost.mutate({ moId: mo.id, laborCost: val });
                                                                        }}>✓</Button>
                                                                    </div>
                                                                ) : hasRate ? (
                                                                    <button
                                                                        className="font-bold text-foreground hover:text-primary hover:underline transition-colors"
                                                                        onClick={() => setEditingRates(prev => ({ ...prev, [mo.id]: String(mo.labor_cost) }))}
                                                                        title="Click to edit rate"
                                                                    >₹{mo.labor_cost}</button>
                                                                ) : (
                                                                    <button
                                                                        className="text-xs text-amber-600 font-semibold border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-50 transition-colors"
                                                                        onClick={() => setEditingRates(prev => ({ ...prev, [mo.id]: "" }))}
                                                                    >+ Set Rate</button>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {hasRate && (
                                                                    <Button size="sm" variant="outline"
                                                                        className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                                                        onClick={() => openTaskPay(mo)}>
                                                                        Pay ₹{mo.labor_cost}
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow className="bg-muted/30 border-t-2 font-semibold">
                                                    <TableCell colSpan={4} className="text-sm">Week Total</TableCell>
                                                    <TableCell className="text-right text-blue-700">₹{thisWeekEarned.toLocaleString()}</TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ── ACTIVE GARMENTS ── */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        <CardTitle className="text-base">Active Garments ({activeMos.length})</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {activeMos.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground">No active garments assigned.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="h-9 text-xs">Receipt #</TableHead>
                                                    <TableHead className="h-9 text-xs">Customer</TableHead>
                                                    <TableHead className="h-9 text-xs">Garment</TableHead>
                                                    <TableHead className="h-9 text-xs">Status</TableHead>
                                                    <TableHead className="h-9 text-xs">Assigned</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {activeMos.map((mo: any) => (
                                                    <TableRow key={mo.id} className="text-sm">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">#{mo.order_number}</TableCell>
                                                        <TableCell className="font-medium">{mo.customer_name}</TableCell>
                                                        <TableCell className="capitalize">{mo.garment_type}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                                {mo.status?.replace(/_/g, " ")}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            {format(new Date(mo.created_at), "MMM d, yyyy")}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ── PAYMENT HISTORY ── */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-blue-500" />
                                            <CardTitle className="text-base">Payment History</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {paymentHistory.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="h-9 text-xs">Date</TableHead>
                                                    <TableHead className="h-9 text-xs">Type</TableHead>
                                                    <TableHead className="h-9 text-xs">Notes</TableHead>
                                                    <TableHead className="h-9 text-xs text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paymentHistory.map((p: any) => (
                                                    <TableRow key={p.id} className="text-sm">
                                                        <TableCell className="text-muted-foreground">
                                                            {format(new Date(p.payment_date || p.created_at), "MMM d, yyyy")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`capitalize text-xs ${
                                                                p.payment_type === "advance" ? "bg-violet-50 text-violet-700 border-violet-200" : ""
                                                            }`}>{p.payment_type}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{p.notes || "—"}</TableCell>
                                                        <TableCell className="text-right font-bold text-green-700">₹{p.amount?.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Payment Dialog ── */}
            <Dialog open={!!payState} onOpenChange={() => setPayState(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {payState?.type === "advance" ? (
                                <><Gift className="w-5 h-5 text-violet-500" /> Advance Payment</>
                            ) : (
                                <><BanknoteIcon className="w-5 h-5 text-green-500" />
                                    {payState?.type === "week" ? "Release Week Payment" : "Pay for Task"}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>{payState?.label}</DialogDescription>
                    </DialogHeader>

                    {payState?.type === "week" && thisWeekCompleted.length > 0 && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                            <p className="font-semibold text-foreground">Week Summary</p>
                            {thisWeekCompleted.map((mo: any) => (
                                <div key={mo.id} className="flex justify-between text-muted-foreground">
                                    <span>#{mo.order_number} {mo.customer_name} ({mo.garment_type})</span>
                                    <span className="font-medium text-foreground">₹{mo.labor_cost || 0}</span>
                                </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between font-bold text-base">
                                <span>Week Total</span>
                                <span className="text-blue-700">₹{thisWeekEarned}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Already paid</span>
                                <span>₹{weekPaymentStatus.paidForWeek}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-green-700">
                                <span>Balance to release</span>
                                <span>₹{weekPaymentStatus.dueForWeek}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 py-1">
                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                placeholder={payState?.type === "advance" ? "Enter advance amount" : `e.g. ${payState?.suggestedAmount}`} />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes (optional)</Label>
                            <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayState(null)}>Cancel</Button>
                        <Button
                            className={payState?.type === "advance" ? "bg-violet-600 hover:bg-violet-700" : "bg-green-600 hover:bg-green-700"}
                            onClick={submitPayment}
                            disabled={!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0 || recordPayment.isPending}
                        >
                            {recordPayment.isPending ? "Recording…" : "Confirm Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
