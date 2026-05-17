export type OrderStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PaymentStatus = "paid" | "unpaid";

export type DailyMenuItem = {
  id: string;
  menu_date: string;
  name: string;
  description: string | null;
  price: number;
  available_quantity: number | null;
  is_active: boolean;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type GuestOrder = {
  id: string;
  employee_code: string;
  employee_name: string;
  order_date: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_mode: string | null;
  total_amount: number;
  admin_note: string | null;
  created_at: string;
  order_items: OrderItem[];
};

export type CartLine = {
  item: DailyMenuItem;
  quantity: number;
};
