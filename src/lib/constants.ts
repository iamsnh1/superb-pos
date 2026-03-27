// Garment types with labels
export const GARMENT_TYPES = [
  { value: "shirt", label: "Shirt" },
  { value: "pant", label: "Pant" },
  { value: "kurta", label: "Kurta" },
  { value: "suit", label: "Suit" },
  { value: "blouse", label: "Blouse" },
  { value: "sherwani", label: "Sherwani" },
  { value: "lehenga", label: "Lehenga" },
  { value: "saree_blouse", label: "Saree Blouse" },
  { value: "waistcoat", label: "Waistcoat" },
  { value: "other", label: "Other" },
] as const;

// Measurement fields per garment type
export const MEASUREMENT_FIELDS: Record<string, { key: string; label: string; unit: string }[]> = {
  shirt: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "shirt_length", label: "Shirt Length", unit: "in" },
    { key: "neck", label: "Neck", unit: "in" },
    { key: "cuff", label: "Cuff", unit: "in" },
    { key: "bicep", label: "Bicep", unit: "in" },
  ],
  pant: [
    { key: "waist", label: "Waist", unit: "in" },
    { key: "hip", label: "Hip", unit: "in" },
    { key: "inseam", label: "Inseam", unit: "in" },
    { key: "outseam", label: "Outseam", unit: "in" },
    { key: "thigh", label: "Thigh", unit: "in" },
    { key: "knee", label: "Knee", unit: "in" },
    { key: "bottom_width", label: "Bottom Width", unit: "in" },
    { key: "rise", label: "Rise", unit: "in" },
  ],
  kurta: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "kurta_length", label: "Kurta Length", unit: "in" },
    { key: "neck", label: "Neck", unit: "in" },
    { key: "armhole", label: "Armhole", unit: "in" },
  ],
  suit: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "jacket_length", label: "Jacket Length", unit: "in" },
    { key: "neck", label: "Neck", unit: "in" },
    { key: "hip", label: "Hip", unit: "in" },
    { key: "inseam", label: "Inseam", unit: "in" },
    { key: "outseam", label: "Outseam", unit: "in" },
    { key: "thigh", label: "Thigh", unit: "in" },
  ],
  blouse: [
    { key: "bust", label: "Bust", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "blouse_length", label: "Blouse Length", unit: "in" },
    { key: "neck_front", label: "Neck Front", unit: "in" },
    { key: "neck_back", label: "Neck Back", unit: "in" },
    { key: "armhole", label: "Armhole", unit: "in" },
  ],
  sherwani: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "sherwani_length", label: "Sherwani Length", unit: "in" },
    { key: "neck", label: "Neck", unit: "in" },
  ],
  lehenga: [
    { key: "waist", label: "Waist", unit: "in" },
    { key: "hip", label: "Hip", unit: "in" },
    { key: "lehenga_length", label: "Lehenga Length", unit: "in" },
  ],
  saree_blouse: [
    { key: "bust", label: "Bust", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "sleeve_length", label: "Sleeve Length", unit: "in" },
    { key: "blouse_length", label: "Blouse Length", unit: "in" },
    { key: "armhole", label: "Armhole", unit: "in" },
  ],
  waistcoat: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
    { key: "waistcoat_length", label: "Waistcoat Length", unit: "in" },
  ],
  other: [
    { key: "chest", label: "Chest", unit: "in" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "hip", label: "Hip", unit: "in" },
    { key: "length", label: "Length", unit: "in" },
    { key: "shoulder", label: "Shoulder", unit: "in" },
  ],
};

// Order status configuration
export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "measurement_confirmed", label: "Measurement Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: "in_production", label: "In Production", color: "bg-purple-100 text-purple-800" },
  { value: "first_fitting", label: "First Fitting", color: "bg-indigo-100 text-indigo-800" },
  { value: "alterations", label: "Alterations", color: "bg-orange-100 text-orange-800" },
  { value: "ready", label: "Ready", color: "bg-green-100 text-green-800" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
] as const;

export const MO_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "cutting", label: "Cutting", color: "bg-blue-100 text-blue-800" },
  { value: "stitching", label: "Stitching", color: "bg-purple-100 text-purple-800" },
  { value: "finishing", label: "Finishing", color: "bg-indigo-100 text-indigo-800" },
  { value: "qc", label: "Quality Check", color: "bg-orange-100 text-orange-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
] as const;

export const PO_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "ordered", label: "Ordered", color: "bg-blue-100 text-blue-800" },
  { value: "received", label: "Received", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
] as const;

export const DELIVERY_STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  { value: "in_transit", label: "In Transit", color: "bg-yellow-100 text-yellow-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "failed", label: "Failed", color: "bg-red-100 text-red-800" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export const INVENTORY_UNITS = [
  { value: "meters", label: "Meters" },
  { value: "pieces", label: "Pieces" },
  { value: "spools", label: "Spools" },
  { value: "yards", label: "Yards" },
  { value: "kg", label: "Kg" },
  { value: "grams", label: "Grams" },
  { value: "rolls", label: "Rolls" },
] as const;

export function getStatusConfig(statuses: readonly { value: string; label: string; color: string }[], value: string) {
  return statuses.find((s) => s.value === value) || { value, label: value, color: "bg-gray-100 text-gray-800" };
}
