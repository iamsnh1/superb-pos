import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCustomer, useMeasurements } from "@/hooks/useCustomers";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { MeasurementForm } from "./MeasurementForm";
import { MeasurementRequests } from "./MeasurementRequests";
import { MeasurementPrintModal } from "./MeasurementPrintModal";
import { TailorSlipModal } from "./TailorSlipModal";
import { CustomerHistory } from "./CustomerHistory";
import { ArrowLeft, Plus, Ruler, User, Calendar, Phone, Mail, MapPin, History, Printer, Wallet, Scissors } from "lucide-react";
import { CustomerLedger } from "./CustomerLedger";
import { format } from "date-fns";

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
}

export function CustomerDetail({ customerId, onBack }: CustomerDetailProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: measurements } = useMeasurements(customerId);
  const { data: templates } = useGarmentTemplates();

  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<any>(null);
  const [printMeasurement, setPrintMeasurement] = useState<any>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [tailorSlipMeasurement, setTailorSlipMeasurement] = useState<any>(null);
  const [tailorSlipOpen, setTailorSlipOpen] = useState(false);

  if (isLoading) return <div className="flex justify-center py-8"><span className="text-muted-foreground">Loading...</span></div>;
  if (!customer) return null;

  const garmentLabel = (type: string) => templates?.find((t) => t.code === type)?.name || type;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{(customer as any).full_name}</h2>
          <p className="text-sm text-muted-foreground">{(customer as any).customer_code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> Contact Info</span>
              {(customer as any).customer_group && (
                <Badge variant={(customer as any).customer_group === 'VIP' ? 'default' : 'secondary'}>
                  {(customer as any).customer_group}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(customer as any).phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {(customer as any).phone}</p>}
            {(customer as any).email && <p className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {(customer as any).email}</p>}
            {((customer as any).address || (customer as any).city) && (
              <p className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-1" />
                <span>
                  {[(customer as any).address, (customer as any).city, (customer as any).state, (customer as any).zip_code].filter(Boolean).join(", ")}
                </span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
              {(customer as any).birthday && (
                <div className="text-xs">
                  <span className="text-muted-foreground block">Birthday</span>
                  {format(new Date((customer as any).birthday), "dd MMM yyyy")}
                </div>
              )}
              {(customer as any).anniversary && (
                <div className="text-xs">
                  <span className="text-muted-foreground block">Anniversary</span>
                  {format(new Date((customer as any).anniversary), "dd MMM yyyy")}
                </div>
              )}
              {(customer as any).gender && (
                <div className="text-xs">
                  <span className="text-muted-foreground block">Gender</span>
                  <span className="capitalize">{(customer as any).gender}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2 shrink-0"><Ruler className="h-4 w-4" /> Measurements</CardTitle>
                <div className="flex gap-2 flex-wrap items-center">
                  {measurements?.length ? (
                    measurements.length === 1 ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          setTailorSlipMeasurement(measurements[0]);
                          setTailorSlipOpen(true);
                        }}
                      >
                        <Scissors className="mr-1 h-3 w-3" /> Print for Tailor
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700">
                            <Scissors className="mr-1 h-3 w-3" /> Print for Tailor
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {measurements.map((m: any) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => {
                                setTailorSlipMeasurement(m);
                                setTailorSlipOpen(true);
                              }}
                            >
                              {garmentLabel(m.garment_type)} — {m.label || "Default"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  ) : (
                    <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700" disabled>
                      <Scissors className="mr-1 h-3 w-3" /> Print for Tailor
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
                    <History className="mr-1 h-3 w-3" /> History
                  </Button>
                  <Button size="sm" onClick={() => { setEditMeasurement(null); setMeasurementOpen(true); }}>
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!measurements || measurements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No measurements recorded yet</p>
              ) : (
                <Tabs defaultValue={measurements[0]?.id}>
                  <TabsList className="flex-wrap h-auto gap-1">
                    {measurements.map((m: any) => (
                      <TabsTrigger key={m.id} value={m.id} className="text-xs">
                        {garmentLabel(m.garment_type)} — {m.label || "Default"}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {measurements.map((m: any) => {
                    const fields = templates?.find((t) => t.code === m.garment_type)?.measurement_fields || [];
                    return (
                      <TabsContent key={m.id} value={m.id}>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{garmentLabel(m.garment_type)}</Badge>
                              <span className="text-xs text-muted-foreground">{format(new Date(m.created_at || m.measured_at), "dd MMM yyyy")}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => { setTailorSlipMeasurement(m); setTailorSlipOpen(true); }}>
                                <Scissors className="h-4 w-4 mr-1" /> Slip
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setPrintMeasurement(m); setPrintOpen(true); }}><Printer className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditMeasurement(m); setMeasurementOpen(true); }}>Edit</Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {fields.map((field) => (
                              <div key={field.key} className="bg-muted/50 rounded p-2 text-center">
                                <p className="text-xs text-muted-foreground">{field.label}</p>
                                <p className="font-medium text-sm">{(m.measurements as any)?.[field.key] || "—"}</p>
                              </div>
                            ))}
                          </div>
                          {m.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {m.notes}</p>}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>

          <MeasurementRequests customerId={customerId} />

          {/* Customer Ledger - Account balance view */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Account Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerLedger customerId={Number(customerId)} />
            </CardContent>
          </Card>
        </div>
      </div>

      <MeasurementForm
        open={measurementOpen}
        onOpenChange={setMeasurementOpen}
        customerId={customerId}
        existing={editMeasurement}
      />
      <CustomerHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        customerId={customerId}
      />

      {printMeasurement && (
        <MeasurementPrintModal
          open={printOpen}
          onOpenChange={setPrintOpen}
          customer={customer}
          measurement={printMeasurement}
          template={templates?.find((t) => t.code === printMeasurement.garment_type)}
        />
      )}

      {tailorSlipMeasurement && (
        <TailorSlipModal
          key={`tailor-slip-${tailorSlipMeasurement.id}-${tailorSlipMeasurement.updated_at || tailorSlipMeasurement.created_at}`}
          open={tailorSlipOpen}
          onOpenChange={setTailorSlipOpen}
          customer={customer}
          measurement={tailorSlipMeasurement}
          template={templates?.find((t) => t.code === tailorSlipMeasurement.garment_type)}
        />
      )}
    </div>
  );
}
