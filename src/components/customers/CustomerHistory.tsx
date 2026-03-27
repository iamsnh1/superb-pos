import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMeasurements } from "@/hooks/useCustomers";
import { GARMENT_TYPES } from "@/lib/constants";
import { format } from "date-fns";

interface CustomerHistoryProps {
    customerId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerHistory({ customerId, open, onOpenChange }: CustomerHistoryProps) {
    const { data: measurements } = useMeasurements(customerId);

    const garmentLabel = (type: string) => GARMENT_TYPES.find((g) => g.value === type)?.label || type;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Measurement History</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {!measurements || measurements.length === 0 ? (
                        <p className="text-center text-muted-foreground">No history found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Garment</TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {measurements.map((m: any) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-medium text-xs">
                                            {format(new Date(m.created_at), "dd MMM yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>{garmentLabel(m.garment_type)}</TableCell>
                                        <TableCell>{m.label}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground w-1/2">
                                            {Object.entries(m.measurements as Record<string, any>)
                                                .map(([k, v]) => `${k}: ${v}`)
                                                .join(", ")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
