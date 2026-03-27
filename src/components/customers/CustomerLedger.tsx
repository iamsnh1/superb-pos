import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
    Wallet, ArrowUpRight, ArrowDownRight, Receipt
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerLedgerProps {
    customerId: number;
}

export function CustomerLedger({ customerId }: CustomerLedgerProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["customer-ledger", customerId],
        queryFn: () => api.get<any>(`/customers/${customerId}/ledger`),
        enabled: !!customerId,
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!data) return null;

    const { summary, ledger } = data;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-3">
                <Card className="bg-blue-50/50 border-blue-200/50">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-blue-600" />
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total Billed</p>
                                <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.total_billed)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-200/50">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4 text-green-600" />
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total Paid</p>
                                <p className="text-lg font-bold text-green-700">{formatCurrency(summary.total_paid)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`${summary.total_balance > 0 ? 'bg-red-50/50 border-red-200/50' : 'bg-emerald-50/50 border-emerald-200/50'}`}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2">
                            <Wallet className={`h-4 w-4 ${summary.total_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Balance Due</p>
                                <p className={`text-lg font-bold ${summary.total_balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {formatCurrency(summary.total_balance)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ledger Table */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Account Ledger
                        <Badge variant="secondary" className="ml-auto text-xs">{ledger.length} entries</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Type</TableHead>
                                    <TableHead className="text-xs">Description</TableHead>
                                    <TableHead className="text-xs text-right">Debit (₹)</TableHead>
                                    <TableHead className="text-xs text-right">Credit (₹)</TableHead>
                                    <TableHead className="text-xs text-right">Balance (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledger.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                                            No transactions yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ledger.map((entry: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                    {entry.type.includes("Payment") ? (
                                                        <span className="flex items-center gap-1">
                                                            <ArrowDownRight className="h-2.5 w-2.5 text-green-600" /> {entry.type}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <ArrowUpRight className="h-2.5 w-2.5 text-blue-600" /> {entry.type}
                                                        </span>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                {entry.description}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-medium text-red-600">
                                                {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-medium text-green-600">
                                                {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                                            </TableCell>
                                            <TableCell className={`text-xs text-right font-bold ${entry.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                {formatCurrency(entry.balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
