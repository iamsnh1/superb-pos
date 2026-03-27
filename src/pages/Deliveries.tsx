import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Truck, User, MapPin, CheckCircle2, Phone, Clock, Send } from "lucide-react";
import { useTrials, useDeliveries, useDeliveryPersons, useUpdateTrial, useUpdateDelivery, useReminders } from "@/hooks/useDelivery";
import { formatPhoneForWhatsApp } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DeliveriesPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data: trials, isLoading: loadingTrials } = useTrials();
  const { data: deliveries, isLoading: loadingDeliveries } = useDeliveries();
  const { data: persons } = useDeliveryPersons();
  const updateTrial = useUpdateTrial();
  const updateDelivery = useUpdateDelivery();

  const trialsForSelectedDate = trials?.filter(t => t.trial_date && isSameDay(parseISO(t.trial_date), date!)) || [];
  const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const { data: reminders } = useReminders(dateStr);

  const openWhatsApp = (phone: string, message: string) => {
    const formatted = formatPhoneForWhatsApp(phone || "");
    if (!formatted || formatted.length < 10) return;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sendAllTrialReminders = () => {
    (reminders?.trialReminders || []).forEach((r: any, i: number) => {
      setTimeout(() => openWhatsApp(r.customer_phone, r.message), i * 1500);
    });
  };

  const sendAllDeliveryReminders = () => {
    (reminders?.deliveryReminders || []).forEach((r: any, i: number) => {
      setTimeout(() => openWhatsApp(r.customer_phone, r.message), i * 1500);
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Delivery & Trials</h1>
          <p className="text-sm text-muted-foreground">Manage first fittings and home deliveries</p>
        </div>

        <Tabs defaultValue="fittings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fittings" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Trial Calendar
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2">
              <Truck className="w-4 h-4" />
              Delivery Tracking
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Send className="w-4 h-4" />
              WhatsApp Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fittings">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-4 h-fit shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border shadow-sm"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-8 min-w-0">
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <CardTitle className="text-base sm:text-lg">
                    Fittings for {date ? format(date, "MMMM d, yyyy") : "Selected Date"}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    {trialsForSelectedDate.length} Appointments
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Garment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialsForSelectedDate.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No fittings scheduled for this day
                          </TableCell>
                        </TableRow>
                      ) : (
                        trialsForSelectedDate.map((trial) => (
                          <TableRow key={trial.id}>
                            <TableCell className="font-medium">{trial.order_number}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{trial.customer_name}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {trial.customer_phone}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{trial.garment_type}</TableCell>
                            <TableCell>
                              <Badge variant={trial.trial_status === 'completed' ? 'secondary' : 'default'} className="capitalize">
                                {trial.trial_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={trial.trial_status}
                                onValueChange={(val) => updateTrial.mutate({ id: trial.id, trial_status: val })}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="missed">Missed</SelectItem>
                                </SelectContent>
                              </Select>
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
          </TabsContent>

          <TabsContent value="deliveries">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Active Deliveries</CardTitle>
                <CardDescription>Track ready orders and home delivery progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDeliveries ? (
                      <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                    ) : deliveries?.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center">No active deliveries</TableCell></TableRow>
                    ) : (
                      deliveries?.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.order_number}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{d.customer_name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {d.customer_phone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{d.delivery_type?.replace('_', ' ') || 'pickup'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3" />
                              {d.delivery_date ? format(parseISO(d.delivery_date), "MMM d") : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={d.delivery_person_id?.toString() || "unassigned"}
                              onValueChange={(val) => updateDelivery.mutate({ id: d.id, delivery_person_id: val === "unassigned" ? null : parseInt(val) })}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="Assign Person" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {persons?.map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={d.delivery_status || 'scheduled'}
                              onValueChange={(val) => {
                                updateDelivery.mutate({
                                  id: d.id,
                                  delivery_status: val,
                                  status: val === 'delivered' ? 'delivered' : undefined
                                });
                              }}
                            >
                              <SelectTrigger className={`w-[130px] h-8 text-xs font-medium ${d.delivery_status === 'delivered' ? 'text-green-600' :
                                d.delivery_status === 'in_transit' ? 'text-blue-600' : ''
                                }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <div className="flex items-center gap-4">
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow-sm" />
              <div className="text-sm text-muted-foreground">
                Select a date to see reminders. Click "Send" to open WhatsApp with a pre-filled message for each customer.
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Trial Reminders — {date ? format(date, "dd MMM") : ""}</CardTitle>
                    {(reminders?.trialReminders?.length || 0) > 0 && (
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={sendAllTrialReminders}>
                        <Send className="w-4 h-4 mr-2" /> Send All ({reminders?.trialReminders?.length})
                      </Button>
                    )}
                  </div>
                  <CardDescription>Customers with trials scheduled for this date</CardDescription>
                </CardHeader>
                <CardContent>
                  {!reminders?.trialReminders?.length ? (
                    <p className="text-sm text-muted-foreground py-4">No trial reminders for this date</p>
                  ) : (
                    <div className="space-y-3">
                      {reminders.trialReminders.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{r.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{r.order_number} — {r.garment_type}</p>
                          </div>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openWhatsApp(r.customer_phone, r.message)}>
                            <Send className="w-4 h-4 mr-1" /> Send
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Delivery Reminders — {date ? format(date, "dd MMM") : ""}</CardTitle>
                    {(reminders?.deliveryReminders?.length || 0) > 0 && (
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={sendAllDeliveryReminders}>
                        <Send className="w-4 h-4 mr-2" /> Send All ({reminders?.deliveryReminders?.length})
                      </Button>
                    )}
                  </div>
                  <CardDescription>Customers with deliveries scheduled for this date</CardDescription>
                </CardHeader>
                <CardContent>
                  {!reminders?.deliveryReminders?.length ? (
                    <p className="text-sm text-muted-foreground py-4">No delivery reminders for this date</p>
                  ) : (
                    <div className="space-y-3">
                      {reminders.deliveryReminders.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{r.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{r.order_number} — {r.garment_type}</p>
                          </div>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openWhatsApp(r.customer_phone, r.message)}>
                            <Send className="w-4 h-4 mr-1" /> Send
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
