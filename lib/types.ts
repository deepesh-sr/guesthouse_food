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

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Terminal = {
  id: string;
  code: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Subcategory = {
  id: string;
  category_id: string;
  name: string;
};

export type Unit = {
  id: string;
  name: string;
};

export type Material = {
  id: string;
  terminal_id: string;
  terminal_code: string;
  terminal_name: string;
  name: string;
  category_id: string;
  category: string;
  subcategory_id: string;
  subcategory: string;
  unit_id: string;
  unit: string;
  quantity: number;
  minimum_stock: number;
  location: string;
  updated_at: string;
  created_at: string;
};

export type MaterialFormValues = {
  name: string;
  category_id: string;
  subcategory_id: string;
  unit_id: string;
  quantity: number;
  minimum_stock: number;
  location: string;
};

export type AdminTerminalAssignment = {
  terminal: Terminal;
};

export type UserProfile = {
  id: string;
  user_id: string | null;
  login_id: string;
  email: string | null;
  role: "admin" | "employee";
  display_name: string;
};
