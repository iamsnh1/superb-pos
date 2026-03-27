import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { Clock, CheckCircle2, AlertTriangle, Scissors, Truck, User, ArrowRight } from "lucide-react";
import { useManufacturingOrders, useUpdateManufacturingOrder } from "@/hooks/useProduction";
import { useDeliveries, useUpdateDelivery } from "@/hooks/useDelivery";

export default function MyWork() {
    const { user, profile } = useAuth();
    const { data: mos, isLoading: loadingMos } = useManufacturingOrders(undefined, user?.id?.toString());
    const { data: deliveries, isLoading: loadingDeliveries } = useDeliveries();
    const updateMo = useUpdateManufacturingOrder();
    const updateDelivery = useUpdateDelivery();

    // Filter deliveries assigned to current user
    const myDeliveries = deliveries?.filter(d => d.delivery_person_id === user?.id) || [];

    const getUrgencyColor = (dateString?: string) => {
        if (!dateString) return "text-muted-foreground";
        const days = differenceInDays(parseISO(dateString), new Date());
        if (days < 0) return "text-destructive font-bold animate-pulse";
        if (days <= 1) return "text-orange-600 font-bold";
        if (days <= 3) return "text-blue-600";
        return "text-green-600";
    };

    const isTailor = profile?.role === 'tailor' || profile?.role === 'admin';
    const isDelivery = profile?.role === 'delivery_person' || profile?.role === 'admin';

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-foreground">My Workflow</h1>
                        <p className="text-sm text-muted-foreground">Hello {profile?.full_name}, here is your assigned work schedule.</p>
                    </div>
                    <Badge variant="outline" className="px-4 py-1 text-sm bg-primary/5">
                        Role: <span className="capitalize ml-1 font-bold">{profile?.role?.replace('_', ' ')}</span>
                    </Badge>
                </div>

                {isTailor && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-purple-600" />
                            Tailoring Assignments
                        </h2>
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Job #</TableHead>
                                        <TableHead>Garment</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead>Current Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingMos ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8">Loading tasks...</TableCell></TableRow>
                                    ) : mos?.filter(m => m.status !== 'completed').length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active tailoring tasks assigned to you</TableCell></TableRow>
                                    ) : (
                                        mos?.filter(m => m.status !== 'completed').sort((a, b) => {
                                            const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : Infinity;
                                            const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : Infinity;
                                            return dateA - dateB;
                                        }).map((mo) => (
                                            <TableRow key={mo.id}>
                                                <TableCell className="font-medium">{mo.mo_number}</TableCell>
                                                <TableCell>{mo.garment_type}</TableCell>
                                                <TableCell>
                                                    <div className={`flex items-center gap-1 ${getUrgencyColor(mo.delivery_date)}`}>
                                                        <Clock className="w-4 h-4" />
                                                        {mo.delivery_date ? format(parseISO(mo.delivery_date), "MMM d, eee") : "No Date"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="capitalize">{mo.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {mo.status === 'pending' && (
                                                        <Button size="sm" onClick={() => updateMo.mutate({ id: mo.id, status: 'cutting' })}>
                                                            Start Cutting <ArrowRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    )}
                                                    {mo.status === 'cutting' && (
                                                        <Button size="sm" variant="secondary" onClick={() => updateMo.mutate({ id: mo.id, status: 'stitching' })}>
                                                            Start Stitching <ArrowRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    )}
                                                    {mo.status === 'stitching' && (
                                                        <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" onClick={() => updateMo.mutate({ id: mo.id, status: 'completed' })}>
                                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Complete Job
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}

                {isDelivery && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Truck className="w-5 h-5 text-orange-600" />
                            Delivery Assignments
                        </h2>
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Delivery Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingDeliveries ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8">Loading tasks...</TableCell></TableRow>
                                    ) : myDeliveries.filter(d => d.delivery_status !== 'delivered').length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active deliveries assigned to you</TableCell></TableRow>
                                    ) : (
                                        myDeliveries.filter(d => d.delivery_status !== 'delivered').map((d) => (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-medium">{d.order_number}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{d.customer_name}</span>
                                                        <span className="text-xs text-muted-foreground">Addr: 123 Main St...</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`flex items-center gap-1 ${getUrgencyColor(d.delivery_date)}`}>
                                                        <Clock className="w-4 h-4" />
                                                        {d.delivery_date ? format(parseISO(d.delivery_date), "MMM d") : "N/A"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{d.delivery_status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {d.delivery_status === 'scheduled' && (
                                                        <Button size="sm" variant="secondary" onClick={() => updateDelivery.mutate({ id: d.id, delivery_status: 'in_transit' })}>
                                                            Mark In Transit
                                                        </Button>
                                                    )}
                                                    {d.delivery_status === 'in_transit' && (
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateDelivery.mutate({ id: d.id, delivery_status: 'delivered', status: 'delivered' })}>
                                                            Confirm Delivery
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
