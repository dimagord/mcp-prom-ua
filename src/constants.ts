export const API_BASE_URL = 'https://my.prom.ua/api/v1';
export const CHARACTER_LIMIT = 50000;

export const ORDER_STATUSES = [
  'pending',
  'received',
  'delivered',
  'canceled',
  'draft',
  'paid',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CANCELLATION_REASONS = [
  'out_of_stock',
  'wrong_price',
  'duplicate_order',
  'buyer_canceled',
  'other',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
