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
    Plus, Search, Scissors, Palette, Ruler, Edit, Trash2, Tag
} from "lucide-react";

interface Fabric {
    id: number;
    name: string;
    code: string;
    fabric_type: string;
    color: string;
    material: string;
    price_per_meter: number;
    available_meters: number;
    supplier_name: string;
    supplier_id: number;
    notes: string;
    is_active: number;
}

const FABRIC_TYPES = [
    "Cotton", "Silk", "Linen", "Polyester", "Wool", "Satin", "Chiffon",
    "Georgette", "Crepe", "Denim", "Velvet", "Rayon", "Jacquard", "Brocade",
    "Net", "Organza", "Terry Cotton", "Khadi", "Muslin", "Other"
];

const MATERIAL_OPTIONS = [
    "Pure", "Blended", "Synthetic", "Natural", "Semi-Synthetic", "Organic"
];

export default function FabricCatalogue() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Form state
    const [formName, setFormName] = useState("");
    const [formFabricType, setFormFabricType] = useState("");
    const [formColor, setFormColor] = useState("");
    const [formMaterial, setFormMaterial] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formMeters, setFormMeters] = useState("");
    const [formSupplierId, setFormSupplierId] = useState("");
    const [formNotes, setFormNotes] = useState("");

    // Queries
    const { data: fabricsData, isLoading } = useQuery({
        queryKey: ["fabric-catalogue", searchTerm],
        queryFn: () => api.get<{ fabrics: Fabric[]; total: number }>(`/fabric-catalogue?search=${searchTerm}&active_only=false`),
    });

    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers-list"],
        queryFn: () => api.get<{ suppliers: any[] }>("/inventory?type=suppliers"),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/fabric-catalogue", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fabric-catalogue"] });
            setShowDialog(false);
            resetForm();
            toast({ title: "Fabric added to catalogue" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/fabric-catalogue/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fabric-catalogue"] });
            setShowDialog(false);
            setEditingFabric(null);
            resetForm();
            toast({ title: "Fabric updated" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/fabric-catalogue/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fabric-catalogue"] });
            toast({ title: "Fabric removed" });
        },
    });

    const resetForm = () => {
        setFormName("");
        setFormFabricType("");
        setFormColor("");
        setFormMaterial("");
        setFormPrice("");
        setFormMeters("");
        setFormSupplierId("");
        setFormNotes("");
    };

    const openEdit = (fabric: Fabric) => {
        setFormName(fabric.name);
        setFormFabricType(fabric.fabric_type || "");
        setFormColor(fabric.color || "");
        setFormMaterial(fabric.material || "");
        setFormPrice(String(fabric.price_per_meter || ""));
        setFormMeters(String(fabric.available_meters || ""));
        setFormSupplierId(fabric.supplier_id ? String(fabric.supplier_id) : "");
        setFormNotes(fabric.notes || "");
        setEditingFabric(fabric);
        setShowDialog(true);
    };

    const handleSubmit = () => {
        const data = {
            name: formName,
            fabric_type: formFabricType || undefined,
            color: formColor || undefined,
            material: formMaterial || undefined,
            price_per_meter: Number(formPrice) || 0,
            available_meters: Number(formMeters) || 0,
            supplier_id: formSupplierId ? Number(formSupplierId) : undefined,
            notes: formNotes || undefined,
            is_active: editingFabric ? editingFabric.is_active : 1,
        };

        if (editingFabric) {
            updateMutation.mutate({ id: editingFabric.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const fabrics = fabricsData?.fabrics || [];

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight">Fabric Catalogue</h1>
                        <p className="text-muted-foreground mt-1">Named fabrics with prices — staff selects from here when creating orders.</p>
                    </div>
                    <Button onClick={() => { resetForm(); setEditingFabric(null); setShowDialog(true); }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Fabric
                    </Button>
                </div>

                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Scissors className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Fabrics</p>
                                    <p className="text-2xl font-bold">{fabrics.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <Tag className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Active</p>
                                    <p className="text-2xl font-bold">{fabrics.filter((f: Fabric) => f.is_active).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Ruler className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Avg Price/Meter</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(
                                            fabrics.length > 0
                                                ? fabrics.reduce((s: number, f: Fabric) => s + f.price_per_meter, 0) / fabrics.length
                                                : 0
                                        )}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search by name, type, color, material..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Fabric Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" /> Fabric List
                            <Badge variant="secondary" className="ml-auto">{fabrics.length} items</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead className="text-right">₹/meter</TableHead>
                                    <TableHead className="text-right">Available (m)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fabrics.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {isLoading ? "Loading..." : "No fabrics in catalogue yet. Click 'Add Fabric' to start."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    fabrics.map((fab: Fabric) => (
                                        <TableRow key={fab.id} className={!fab.is_active ? "opacity-50" : ""}>
                                            <TableCell className="font-mono text-xs">{fab.code}</TableCell>
                                            <TableCell className="font-medium">{fab.name}</TableCell>
                                            <TableCell className="text-sm">{fab.fabric_type || "—"}</TableCell>
                                            <TableCell>
                                                {fab.color ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: fab.color.toLowerCase() }} />
                                                        <span className="text-sm">{fab.color}</span>
                                                    </div>
                                                ) : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm">{fab.material || "—"}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(fab.price_per_meter)}</TableCell>
                                            <TableCell className="text-right">{fab.available_meters}</TableCell>
                                            <TableCell>
                                                <Badge variant={fab.is_active ? "default" : "secondary"}>
                                                    {fab.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(fab)}>
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700"
                                                        onClick={() => deleteMutation.mutate(fab.id)}>
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
                <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingFabric(null); resetForm(); } }}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingFabric ? "Edit Fabric" : "Add Fabric to Catalogue"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Fabric Name *</Label>
                                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., Raymond Premium Cotton" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fabric Type</Label>
                                    <Select value={formFabricType} onValueChange={setFormFabricType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FABRIC_TYPES.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Material Quality</Label>
                                    <Select value={formMaterial} onValueChange={setFormMaterial}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MATERIAL_OPTIONS.map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <Input value={formColor} onChange={e => setFormColor(e.target.value)} placeholder="e.g., Navy Blue" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Price per Meter (₹)</Label>
                                    <Input type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Available Meters</Label>
                                    <Input type="number" step="0.1" value={formMeters} onChange={e => setFormMeters(e.target.value)} placeholder="0.0" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Supplier (optional)</Label>
                                    <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {(suppliersData as any)?.suppliers?.map((s: any) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            )) || []}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Any additional details..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingFabric(null); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button
                                disabled={!formName || createMutation.isPending || updateMutation.isPending}
                                onClick={handleSubmit}
                            >
                                {editingFabric ? "Update Fabric" : "Add Fabric"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
