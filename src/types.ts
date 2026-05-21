export interface PromAddress {
  id: number;
  full_address: string;
  city: string;
  country_code: string;
  state: string;
  street: string;
  house_number: string;
  flat_number?: string;
}

export interface PromDelivery {
  delivery_method: string;
  declaration_number?: string;
  delivery_address?: string;
  cost?: number;
}

export interface PromClient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  comment?: string;
}

export interface PromOrderItem {
  id: number;
  quantity: number;
  price: number;
  total_price: number;
  product_id: number;
  sku?: string;
  image?: string;
  name: string;
  url?: string;
}

export interface PromOrder {
  id: number;
  date_created: string;
  client_first_name?: string;
  client_second_name?: string;
  client_last_name?: string;
  client: PromClient;
  client_notes?: string;
  products: PromOrderItem[];
  status: string;
  price: number;
  full_price: number;
  delivery_option?: PromDelivery;
  address?: PromAddress;
  payment_method?: string;
  source?: string;
  ps_ids?: unknown[];
}

export interface PromProduct {
  id: number;
  external_id?: string;
  name: string;
  sku?: string;
  price: number;
  currency: string;
  description?: string;
  is_active: boolean;
  in_stock: boolean;
  keywords?: string;
  images?: Array<{ url: string; thumbnail_url: string }>;
  category?: { id: number; caption: string };
  group?: { id: number; name: string };
  status?: string;
  discount?: number;
  minimal_order_quantity?: number;
  main_image?: string;
  quantity_in_stock?: number;
}

export interface PromMessage {
  id: number;
  client_id: number;
  date_created: string;
  is_read: boolean;
  chat: {
    id: number;
    title: string;
  };
  author: {
    id: number;
    name: string;
    is_company: boolean;
  };
  text?: string;
}

export interface PromApiError {
  error: string | null;
  message?: string;
}

export interface OrderListResponse {
  orders: PromOrder[];
}

export interface ProductListResponse {
  products: PromProduct[];
}

export interface MessageListResponse {
  messages: PromMessage[];
}

export interface SetStatusResponse {
  processed_ids: number[];
  not_processed_ids: number[];
}

export interface EditProductResponse {
  id: number;
  status: string;
  message?: string;
}
