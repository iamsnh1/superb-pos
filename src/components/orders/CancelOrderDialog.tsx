import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpdateOrderStatus } from "@/hooks/useOrders";

interface CancelOrderDialogProps {
    orderId: string | null;
    orderNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ orderId, orderNumber, open, onOpenChange }: CancelOrderDialogProps) {
    const [reason, setReason] = useState("");
    const updateStatus = useUpdateOrderStatus();

    const handleCancel = async () => {
        if (!orderId || !reason.trim()) return;
        await updateStatus.mutateAsync({
            id: orderId,
            status: "cancelled",
            cancellation_reason: reason.trim(),
        });
        setReason("");
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Order {orderNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. Please provide a reason for cancellation.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="reason">Cancellation Reason *</Label>
                    <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason for cancellation..."
                        rows={3}
                        maxLength={500}
                        className="mt-2"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setReason("")}>Back</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleCancel}
                        disabled={!reason.trim() || updateStatus.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {updateStatus.isPending ? "Cancelling..." : "Cancel Order"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
