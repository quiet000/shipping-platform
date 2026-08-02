import type {
  Agency,
  Notification,
  Profile,
  Shipment,
  ShipmentLog,
  Truck,
} from "@/lib/types";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const mockAgencies: Agency[] = [
  {
    id: "ag-1",
    name: "شركة النور للتجارة",
    contact_person: "أحمد سمير",
    phone: "01012345678",
    email: "contact@alnoor.com",
    address: "القاهرة - وسط البلد",
    commission_percent: 10,
    created_at: daysAgo(60),
  },
  {
    id: "ag-2",
    name: "مؤسسة المستقبل",
    contact_person: "سارة محمود",
    phone: "01198765432",
    email: "info@future-eg.com",
    address: "الإسكندرية - سموحة",
    commission_percent: 12,
    created_at: daysAgo(45),
  },
  {
    id: "ag-3",
    name: "سوق الإلكترونيات",
    contact_person: "محمد خالد",
    phone: "01234567890",
    email: "sales@emart.com",
    address: "الجيزة - الدقي",
    commission_percent: 8,
    created_at: daysAgo(30),
  },
];

export const mockDrivers: Profile[] = [
  {
    id: "drv-1",
    full_name: "مصطفى عبد الرحمن",
    phone: "0101112233",
    email: "mustafa@example.com",
    role: "driver",
    license_number: "LIC-112233",
    custom_permissions: { shipments: { read: true, update_status: true } },
    is_active: true,
    created_at: daysAgo(90),
  },
  {
    id: "drv-2",
    full_name: "كريم أشرف",
    phone: "0104445566",
    email: "karim@example.com",
    role: "driver",
    license_number: "LIC-445566",
    custom_permissions: { shipments: { read: true, update_status: true } },
    is_active: true,
    created_at: daysAgo(80),
  },
  {
    id: "drv-3",
    full_name: "يوسف عماد",
    phone: "0107778899",
    email: "youssef@example.com",
    role: "driver",
    license_number: "LIC-778899",
    custom_permissions: { shipments: { read: true, update_status: true } },
    is_active: false,
    created_at: daysAgo(70),
  },
];

export const mockTrucks: Truck[] = [
  {
    id: "trk-1",
    plate_number: "ق ر أ 4521",
    model_type: "فولفو FH 440",
    capacity_tons: 8,
    driver_id: "drv-1",
    status: "active",
    created_at: daysAgo(120),
  },
  {
    id: "trk-2",
    plate_number: "ق ل ص 9820",
    model_type: "مرسيدس أكتورز",
    capacity_tons: 12,
    driver_id: "drv-2",
    status: "active",
    created_at: daysAgo(110),
  },
  {
    id: "trk-3",
    plate_number: "ق ر ب 1044",
    model_type: "إيسوزو NPR",
    capacity_tons: 3,
    driver_id: null,
    status: "maintenance",
    created_at: daysAgo(100),
  },
];

const shipmentSeed = [
  {
    id: "shp-1",
    waybill_number: "SHP-849201",
    client_name: "أحمد حسن",
    client_phone: "01200000001",
    destination_address: "شارع النيل - عمارة 12",
    destination_city: "القاهرة",
    shipping_type: "express" as const,
    status: "delivered" as const,
    agency_id: "ag-1",
    assigned_driver_id: "drv-1",
    price: 150,
    cod_amount: 2500,
    expected_delivery_date: daysAhead(-2),
    created_at: daysAgo(5),
  },
  {
    id: "shp-2",
    waybill_number: "SHP-203944",
    client_name: "منى إبراهيم",
    client_phone: "01200000002",
    destination_address: "شارع سوريا - المهندسين",
    destination_city: "الجيزة",
    shipping_type: "standard" as const,
    status: "out_for_delivery" as const,
    agency_id: "ag-2",
    assigned_driver_id: "drv-1",
    price: 90,
    cod_amount: 0,
    expected_delivery_date: daysAhead(1),
    created_at: daysAgo(2),
  },
  {
    id: "shp-3",
    waybill_number: "SHP-118477",
    client_name: "محمد عادل",
    client_phone: "01200000003",
    destination_address: "كورنيش الإسكندرية",
    destination_city: "الإسكندرية",
    shipping_type: "express" as const,
    status: "in_warehouse" as const,
    agency_id: "ag-3",
    assigned_driver_id: null,
    price: 200,
    cod_amount: 5400,
    expected_delivery_date: daysAhead(2),
    created_at: daysAgo(1),
  },
  {
    id: "shp-4",
    waybill_number: "SHP-552009",
    client_name: "سلمى فتحي",
    client_phone: "01200000004",
    destination_address: "مدينة نصر - شارع عباس العقاد",
    destination_city: "القاهرة",
    shipping_type: "standard" as const,
    status: "delivered" as const,
    agency_id: "ag-1",
    assigned_driver_id: "drv-2",
    price: 75,
    cod_amount: 1800,
    expected_delivery_date: daysAhead(-1),
    created_at: daysAgo(4),
  },
  {
    id: "shp-5",
    waybill_number: "SHP-903311",
    client_name: "عمر مصطفى",
    client_phone: "01200000005",
    destination_address: "المنصورة - شارع الجيش",
    destination_city: "المنصورة",
    shipping_type: "standard" as const,
    status: "delayed" as const,
    agency_id: "ag-2",
    assigned_driver_id: "drv-2",
    price: 120,
    cod_amount: 0,
    expected_delivery_date: daysAhead(1),
    created_at: daysAgo(7),
  },
  {
    id: "shp-6",
    waybill_number: "SHP-672134",
    client_name: "هدى سامي",
    client_phone: "01200000006",
    destination_address: "طنطا - شارع البحر",
    destination_city: "طنطا",
    shipping_type: "express" as const,
    status: "out_for_delivery" as const,
    agency_id: "ag-3",
    assigned_driver_id: "drv-1",
    price: 180,
    cod_amount: 3200,
    expected_delivery_date: daysAhead(0),
    created_at: daysAgo(1),
  },
  {
    id: "shp-7",
    waybill_number: "SHP-784456",
    client_name: "خالد رشاد",
    client_phone: "01200000007",
    destination_address: "أسيوط - حي شرق",
    destination_city: "أسيوط",
    shipping_type: "standard" as const,
    status: "in_warehouse" as const,
    agency_id: "ag-1",
    assigned_driver_id: null,
    price: 110,
    cod_amount: 0,
    expected_delivery_date: daysAhead(3),
    created_at: daysAgo(0),
  },
  {
    id: "shp-8",
    waybill_number: "SHP-199005",
    client_name: "نورهان علي",
    client_phone: "01200000008",
    destination_address: "المعادي - شارع 9",
    destination_city: "القاهرة",
    shipping_type: "express" as const,
    status: "returned" as const,
    agency_id: "ag-2",
    assigned_driver_id: "drv-3",
    price: 95,
    cod_amount: 0,
    expected_delivery_date: daysAhead(-3),
    created_at: daysAgo(6),
  },
];

export const mockShipments: Shipment[] = shipmentSeed.map((s) => ({
  ...s,
  updated_at: daysAgo(0),
  agency: mockAgencies.find((a) => a.id === s.agency_id) ?? null,
  assigned_driver: mockDrivers.find((d) => d.id === s.assigned_driver_id) ?? null,
}));

export const mockLogs: Record<string, ShipmentLog[]> = Object.fromEntries(
  mockShipments.map((s) => [
    s.id,
    [
      {
        id: `${s.id}-l1`,
        shipment_id: s.id,
        status: "in_warehouse",
        location_description: "المخزن الرئيسي - القاهرة",
        notes: "تم استلام الشحنة وتسجيلها في النظام",
        created_at: s.created_at,
      },
      ...(s.status === "out_for_delivery" || s.status === "delivered" || s.status === "returned"
        ? [
            {
              id: `${s.id}-l2`,
              shipment_id: s.id,
              status: "out_for_delivery" as const,
              location_description: "في الطريق إلى " + s.destination_city,
              notes: "تم تحميلها على الشاحنة",
              created_at: daysAgo(1),
            },
          ]
        : []),
      ...(s.status === "delivered"
        ? [
            {
              id: `${s.id}-l3`,
              shipment_id: s.id,
              status: "delivered" as const,
              location_description: s.destination_address,
              notes: "تم تسليم الشحنة للعميل بنجاح",
              created_at: daysAgo(0),
            },
          ]
        : []),
    ],
  ]),
);

export const mockNotifications: Notification[] = [
  {
    id: "nt-1",
    shipment_id: "shp-5",
    title: "شحنة متأخرة تحتاج متابعة",
    message: "البوليصة SHP-903311 متبقّي على موعد تسليمها يوم واحد ولم تُسلَّم بعد.",
    is_read: false,
    alert_type: "urgent",
    created_at: daysAgo(0),
    shipment: {
      waybill_number: "SHP-903311",
      expected_delivery_date: daysAhead(1),
    },
  },
  {
    id: "nt-2",
    shipment_id: "shp-3",
    title: "شحنة قاربت على موعد التسليم",
    message: "البوليصة SHP-118477 متبقّي على موعد تسليمها يومان.",
    is_read: false,
    alert_type: "warning",
    created_at: daysAgo(0),
    shipment: {
      waybill_number: "SHP-118477",
      expected_delivery_date: daysAhead(2),
    },
  },
  {
    id: "nt-3",
    shipment_id: "shp-6",
    title: "شحنة في الطريق للتوصيل",
    message: "البوليصة SHP-672134 خرجت للتوصيل وموعد تسليمها اليوم.",
    is_read: true,
    alert_type: "info",
    created_at: daysAgo(1),
    shipment: {
      waybill_number: "SHP-672134",
      expected_delivery_date: daysAhead(0),
    },
  },
];
