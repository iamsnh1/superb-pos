import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMeasurementRequests, useCreateMeasurementRequest, useUpdateMeasurementRequestStatus } from "@/hooks/useCustomers";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";

interface MeasurementRequestsProps {
    customerId: string;
}

export function MeasurementRequests({ customerId }: MeasurementRequestsProps) {
    const { data: requests, isLoading } = useMeasurementRequests(customerId);
    const { data: templates } = useGarmentTemplates();
    const createRequest = useCreateMeasurementRequest();
    const updateStatus = useUpdateMeasurementRequestStatus();
    const [open, setOpen] = useState(false);
    const [garmentType, setGarmentType] = useState("");
    const [changes, setChanges] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!garmentType || !changes.trim()) return;
        await createRequest.mutateAsync({
            customer_id: customerId,
            garment_type: garmentType,
            requested_changes: changes,
        });
        setOpen(false);
        setGarmentType("");
        setChanges("");
    };

    const handleStatusChange = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
        await updateStatus.mutateAsync({ id, status, customerId });
    };

    const statusColor = (status: string) => {
        switch (status) {
            case "approved": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            default: return "bg-yellow-100 text-yellow-800";
        }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "approved": return <CheckCircle className="h-4 w-4" />;
            case "rejected": return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const garmentLabel = (type: string) => templates?.find((g) => g.code === type)?.name || type;

    return (
        <Card className="border-0 shadow-sm mt-6">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Modification Requests
                    </CardTitle>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">Request Change</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Request Measurement Change</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Garment Type</Label>
                                    <Select value={garmentType} onValueChange={setGarmentType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select garment" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates?.map((g) => (
                                                <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Requested Changes</Label>
                                    <Textarea
                                        placeholder="Describe the changes needed (e.g., increase waist by 1 inch)"
                                        value={changes}
                                        onChange={(e) => setChanges(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={createRequest.isPending}>Submit Request</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                ) : !requests || requests.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No pending requests</p>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req: any) => (
                            <div key={req.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{garmentLabel(req.garment_type)}</Badge>
                                        <Badge className={statusColor(req.status)} variant="secondary">
                                            <span className="flex items-center gap-1">
                                                {statusIcon(req.status)} {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                            </span>
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(req.created_at), "dd MMM yyyy")}
                                        </span>
                                    </div>
                                    <p className="text-sm">{req.requested_changes}</p>
                                    {req.created_by_name && (
                                        <p className="text-xs text-muted-foreground">Requested by: {req.created_by_name}</p>
                                    )}
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(req.id, 'approved')}>
                                            <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(req.id, 'rejected')}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
