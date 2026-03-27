import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (item: { garment_type: string; price: number; notes: string }) => void;
}

export function CustomItemModal({ open, onOpenChange, onConfirm }: CustomItemModalProps) {
    const [garmentType, setGarmentType] = useState("");
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!garmentType || !price) return;

        onConfirm({
            garment_type: garmentType,
            price: Number(price),
            notes
        });

        // Reset form
        setGarmentType("");
        setPrice("");
        setNotes("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Custom Item</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="garmentType">Item / Garment Name *</Label>
                        <Input
                            id="garmentType"
                            placeholder="e.g. Blazer, Coat, Lehnga..."
                            value={garmentType}
                            onChange={(e) => setGarmentType(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="price">Price (₹) *</Label>
                        <Input
                            id="price"
                            type="number"
                            placeholder="Enter price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            min={0}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="notes">Description / Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Any special instructions or details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!garmentType || !price}>
                            Continue to Details
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
