import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { useMeasurements, useCreateMeasurement, useUpdateMeasurement } from "@/hooks/useCustomers";
import { Plus, Ruler, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: any;
    initialItem: any;
    onConfirm: (itemWithOptions: any) => void;
    isEditing?: boolean;
}

type MeasurementField = {
    key: string;
    label: string;
    unit: string;
};

export function ItemDetailsModal({ open, onOpenChange, customer, initialItem, onConfirm, isEditing }: ItemDetailsModalProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [price, setPrice] = useState(initialItem?.price || 0);
    const [qty, setQty] = useState(1);
    const [garmentStyle, setGarmentStyle] = useState("");
    const [notes, setNotes] = useState("");
    const [designNotes, setDesignNotes] = useState("");
    const [customStyle, setCustomStyle] = useState("");

    // Measurement State
    const { data: templates } = useGarmentTemplates();
    const { data: existingMeasurements } = useMeasurements(customer?.id);
    const createMeasurement = useCreateMeasurement();
    const updateMeasurement = useUpdateMeasurement();

    const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>("new");
    const [measurements, setMeasurements] = useState<Record<string, number>>({});

    // Dynamic fields - user can add/remove
    const [activeFields, setActiveFields] = useState<MeasurementField[]>([]);
    const [newFieldName, setNewFieldName] = useState("");

    // Common measurement fields that user can choose from
    const commonFields: MeasurementField[] = [
        { key: "chest", label: "Chest", unit: "in" },
        { key: "waist", label: "Waist", unit: "in" },
        { key: "hip", label: "Hip", unit: "in" },
        { key: "shoulder", label: "Shoulder", unit: "in" },
        { key: "length", label: "Length", unit: "in" },
        { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
        { key: "neck", label: "Neck", unit: "in" },
        { key: "inseam", label: "Inseam", unit: "in" },
        { key: "outseam", label: "Outseam", unit: "in" },
        { key: "thigh", label: "Thigh", unit: "in" },
        { key: "knee", label: "Knee", unit: "in" },
        { key: "cuff", label: "Cuff", unit: "in" },
        { key: "bicep", label: "Bicep", unit: "in" },
        { key: "armhole", label: "Armhole", unit: "in" },
        { key: "bottom_width", label: "Bottom Width", unit: "in" },
        { key: "rise", label: "Rise", unit: "in" },
    ];

    // Get template fields or use empty array for custom
    const garmentTemplate = templates?.find(t => t.name.toLowerCase() === initialItem?.garment_type?.toLowerCase()) ||
        templates?.find(t => t.code.toLowerCase() === initialItem?.garment_type?.toLowerCase());

    // Initialize
    useEffect(() => {
        if (open && initialItem) {
            setPrice(initialItem.price);
            setQty(initialItem.qty || 1);
            setNotes(initialItem.notes || "");
            setDesignNotes(initialItem.design_notes || "");
            setSelectedMeasurementId("new");
            setNewFieldName("");

            // Pre-fill style when editing
            const existingStyle = initialItem.style || "";
            setGarmentStyle(existingStyle);
            setCustomStyle(existingStyle);

            // Pre-fill measurements when editing an existing cart item
            if (initialItem.measurements && Object.keys(initialItem.measurements).length > 0) {
                setMeasurements(initialItem.measurements);
                // Rebuild activeFields from saved measurement keys
                const fieldsFromItem = Object.keys(initialItem.measurements).map(key => ({
                    key,
                    label: key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    unit: 'in'
                }));
                setActiveFields(fieldsFromItem);
            } else {
                setMeasurements({});
                // Set initial active fields from template if available
                if (garmentTemplate?.measurement_fields) {
                    try {
                        const fields = typeof garmentTemplate.measurement_fields === 'string'
                            ? JSON.parse(garmentTemplate.measurement_fields)
                            : garmentTemplate.measurement_fields;
                        setActiveFields(fields);
                    } catch {
                        setActiveFields([]);
                    }
                } else {
                    setActiveFields([]);
                }
            }
        }
    }, [open, initialItem, garmentTemplate]);

    // If selecting an existing measurement, populate fields
    useEffect(() => {
        if (selectedMeasurementId !== "new" && existingMeasurements) {
            const m = existingMeasurements.find((m: any) => String(m.id) === selectedMeasurementId);
            if (m) {
                const parsedMeasurements = typeof m.measurements === 'string'
                    ? JSON.parse(m.measurements)
                    : m.measurements;
                setMeasurements(parsedMeasurements || {});

                // Also set the active fields based on what's in the measurement
                const fieldsFromMeasurement = Object.keys(parsedMeasurements || {}).map(key => ({
                    key,
                    label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    unit: 'in'
                }));
                setActiveFields(fieldsFromMeasurement);
            }
        } else if (selectedMeasurementId === "new") {
            setMeasurements({});
        }
    }, [selectedMeasurementId, existingMeasurements]);

    const addField = (field: MeasurementField) => {
        if (!activeFields.find(f => f.key === field.key)) {
            setActiveFields([...activeFields, field]);
        }
    };

    const addCustomField = () => {
        if (newFieldName.trim()) {
            const key = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
            if (!activeFields.find(f => f.key === key)) {
                setActiveFields([...activeFields, {
                    key,
                    label: newFieldName.trim(),
                    unit: 'in'
                }]);
            }
            setNewFieldName("");
        }
    };

    const removeField = (key: string) => {
        setActiveFields(activeFields.filter(f => f.key !== key));
        const newMeasurements = { ...measurements };
        delete newMeasurements[key];
        setMeasurements(newMeasurements);
    };

    const availableFields = commonFields.filter(cf => !activeFields.find(af => af.key === cf.key));

    const handleConfirm = async () => {
        let finalMeasurements = measurements;
        let measurementLabel = selectedMeasurementId === "new" ? "POS Entry" : "Existing";
        let measurementProfileId = selectedMeasurementId !== "new" ? Number(selectedMeasurementId) : null;

        // Save measurements to customer profile - permanent until edited
        if (selectedMeasurementId === "new" && Object.keys(measurements).length > 0) {
            try {
                const existingForGarment = existingMeasurements?.find(
                    (m: any) => m.garment_type?.toLowerCase() === initialItem.garment_type?.toLowerCase()
                );
                if (existingForGarment) {
                    // Update existing profile - keeps one canonical measurement per garment
                    await updateMeasurement.mutateAsync({
                        id: String(existingForGarment.id),
                        measurements,
                        notes: "Updated from POS",
                        label: existingForGarment.label
                    });
                    measurementLabel = existingForGarment.label || "Updated";
                    measurementProfileId = existingForGarment.id;
                } else {
                    // Create new profile
                    const saved = await createMeasurement.mutateAsync({
                        customerId: customer.id,
                        garment_type: initialItem.garment_type,
                        label: `POS ${new Date().toLocaleDateString()}`,
                        measurements,
                        notes: "Saved from POS"
                    });
                    measurementLabel = saved.label;
                    measurementProfileId = saved.id;
                }
            } catch (e) {
                console.error("Failed to save measurements", e);
            }
        }

        onConfirm({
            ...initialItem,
            garment_type: initialItem.garment_type,
            style: garmentStyle === "custom_input_manual" ? customStyle : (garmentStyle || ""),
            price: Number(price),
            qty: Number(qty),
            notes,
            design_notes: designNotes,
            measurements: finalMeasurements,
            measurement_label: measurementLabel,
            measurement_profile_id: measurementProfileId
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">{isEditing ? 'Edit' : 'Configure'} {initialItem?.garment_type}</span>
                        <Badge variant="outline">{customer?.full_name}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details & Price</TabsTrigger>
                        <TabsTrigger value="measurements">Measurements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Garment</Label>
                                <Input value={initialItem?.garment_type || ""} readOnly className="bg-slate-50 font-semibold" />
                            </div>
                            <div>
                                <Label>Type / Style</Label>
                                {garmentTemplate?.styles && garmentTemplate.styles.length > 0 ? (
                                    <Select value={garmentStyle} onValueChange={setGarmentStyle}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Style..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {garmentTemplate.styles.map((style: string) => (
                                                <SelectItem key={style} value={style}>{style}</SelectItem>
                                            ))}
                                            <SelectItem value="custom_input_manual">--- Custom Style ---</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input value={garmentStyle} onChange={e => setGarmentStyle(e.target.value)} placeholder="e.g. Puna, Double Pocket" />
                                )}
                                {garmentStyle === "custom_input_manual" && (
                                    <div className="mt-2">
                                        <Input
                                            autoFocus
                                            placeholder="Enter custom style..."
                                            value={customStyle}
                                            onChange={e => setCustomStyle(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Price (₹)</Label>
                                <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} />
                            </div>
                        </div>

                        <div>
                            <Label>Design Specifications (Special Buttons, Collar, etc.)</Label>
                            <Textarea
                                placeholder="e.g. Chinese collar, Gold buttons, Double pocket..."
                                value={designNotes}
                                onChange={e => setDesignNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label className="text-amber-700 font-semibold">📋 Customer Description / Special Instructions</Label>
                            <Textarea
                                placeholder="e.g. Customer wants pockets on both sides, extra long sleeve..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="border-amber-300 focus:border-amber-500"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">⚠️ This appears on the Tailor Slip as DESCRIPTION</p>
                        </div>

                        <div className="flex justify-end mt-4">
                            <Button onClick={() => setActiveTab("measurements")}>
                                Next: Measurements <Ruler className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="measurements" className="space-y-4 py-4">
                        {/* Profile Selection */}
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                            <Label>Select Measurement Profile</Label>
                            <Select value={selectedMeasurementId} onValueChange={setSelectedMeasurementId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">
                                        <span className="flex items-center"><Plus className="mr-2 h-3 w-3" /> New / Custom</span>
                                    </SelectItem>
                                    {existingMeasurements?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.garment_type} - {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Add Fields Section */}
                        <div className="border rounded-lg p-3 bg-muted/20">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                                Add Measurement Fields
                            </Label>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {availableFields.slice(0, 8).map(field => (
                                    <Button
                                        key={field.key}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => addField(field)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> {field.label}
                                    </Button>
                                ))}
                                {availableFields.length > 8 && (
                                    <Select onValueChange={(key) => {
                                        const field = availableFields.find(f => f.key === key);
                                        if (field) addField(field);
                                    }}>
                                        <SelectTrigger className="h-7 w-24 text-xs">
                                            <SelectValue placeholder="More..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableFields.slice(8).map(field => (
                                                <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Custom field input */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Custom field name..."
                                    value={newFieldName}
                                    onChange={e => setNewFieldName(e.target.value)}
                                    className="h-8 text-sm"
                                    onKeyDown={e => e.key === 'Enter' && addCustomField()}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8"
                                    onClick={addCustomField}
                                    disabled={!newFieldName.trim()}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        {/* Active Fields - Measurement Inputs */}
                        {activeFields.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3 border rounded-lg p-4 bg-card">
                                {activeFields.map((field) => (
                                    <div key={field.key} className="relative group">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/80"
                                            onClick={() => removeField(field.key)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <Label className="text-xs text-muted-foreground uppercase font-bold">{field.label}</Label>
                                        <Input
                                            type="number"
                                            step="0.25"
                                            value={measurements[field.key] || ''}
                                            onChange={(e) => setMeasurements({ ...measurements, [field.key]: parseFloat(e.target.value) || 0 })}
                                            className="h-9"
                                            placeholder="0.00"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border rounded-lg p-8 bg-card text-center text-muted-foreground">
                                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No measurement fields added yet.</p>
                                <p className="text-xs">Click the buttons above to add fields.</p>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                            * Measurements are saved to the customer&apos;s profile and kept until edited. Re-adding the same garment updates the existing profile.
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={price <= 0}>
                        {isEditing ? 'Save Changes' : 'Add Item to Cart'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
