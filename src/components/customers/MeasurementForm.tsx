import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeasurement, useUpdateMeasurement } from "@/hooks/useCustomers";
import { useGarmentTemplates } from "@/hooks/useTemplates";

interface MeasurementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  existing?: any;
}

export function MeasurementForm({ open, onOpenChange, customerId, existing }: MeasurementFormProps) {
  const isEdit = !!existing;
  const create = useCreateMeasurement();
  const update = useUpdateMeasurement();
  const { data: templates } = useGarmentTemplates();

  const [garmentType, setGarmentType] = useState(existing?.garment_type || "");
  const [label, setLabel] = useState(existing?.label || "Default");
  const [measurements, setMeasurements] = useState<Record<string, number>>(existing?.measurements || {});
  const [notes, setNotes] = useState(existing?.notes || "");

  // Set default garment type when templates load
  useEffect(() => {
    if (!garmentType && templates && templates.length > 0) {
      setGarmentType(templates[0].code);
    }
  }, [templates, garmentType]);

  const fields = templates?.find((t) => t.code === garmentType)?.measurement_fields || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      await update.mutateAsync({ id: existing.id, measurements, label, notes });
    } else {
      await create.mutateAsync({ customerId, garment_type: garmentType, label, measurements, notes });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Measurement" : "New Measurement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Garment Type</Label>
              <Select value={garmentType} onValueChange={setGarmentType} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((g) => (
                    <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Regular, Party" maxLength={50} />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Measurements (inches)</h4>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="200"
                    value={measurements[field.key] || ""}
                    onChange={(e) => setMeasurements((p) => ({ ...p, [field.key]: parseFloat(e.target.value) || 0 }))}
                    placeholder={field.unit}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
