import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../constants.js';
import type {
  OrderListResponse,
  ProductListResponse,
  MessageListResponse,
  PromOrder,
  SetStatusResponse,
  EditProductResponse,
} from '../types.js';

export class PromApiClient {
  private client: AxiosInstance;

  constructor(token: string) {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const errorMsg = data?.error || data?.message || axiosError.message;

      if (status === 401) {
        throw new Error('Authentication failed: Invalid or expired token. Please check your PROM_API_TOKEN.');
      }
      if (status === 403) {
        throw new Error('Access forbidden: Your token does not have permission for this operation.');
      }
      if (status === 404) {
        throw new Error(`Resource not found: ${errorMsg}`);
      }
      if (status === 429) {
        throw new Error('Rate limit exceeded: Too many requests. Please wait before retrying.');
      }
      throw new Error(`Prom API error (${status}): ${errorMsg}`);
    }
    throw new Error(`Unexpected error: ${String(error)}`);
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  async listOrders(params?: {
    limit?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
  }): Promise<OrderListResponse> {
    try {
      const response = await this.client.get<OrderListResponse>('/orders/list', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOrder(orderId: number): Promise<PromOrder> {
    try {
      const response = await this.client.get<PromOrder>(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async setOrderStatus(body: {
    status: string;
    ids: number[];
    cancellation_reason?: string;
    cancellation_text?: string;
  }): Promise<SetStatusResponse> {
    try {
      const response = await this.client.post<SetStatusResponse>('/orders/set_status', body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async setOrderDelivery(orderId: number, body: {
    declaration_number: string;
    delivery_type?: string;
  }): Promise<{ message: string }> {
    try {
      const response = await this.client.post<{ message: string }>(
        `/orders/${orderId}/set_delivery`,
        body
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async listProducts(params?: {
    page?: number;
    per_page?: number;
    group_id?: number;
    status?: string;
  }): Promise<ProductListResponse> {
    try {
      const response = await this.client.get<ProductListResponse>('/products/list', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(productId: number): Promise<{ product: import('../types.js').PromProduct }> {
    try {
      const response = await this.client.get<{ product: import('../types.js').PromProduct }>(
        `/products/${productId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async editProduct(body: {
    id: number;
    price?: number;
    is_active?: boolean;
    in_stock?: boolean;
    quantity_in_stock?: number;
    discount?: number;
    name?: string;
    description?: string;
    keywords?: string;
    external_id?: string;
  }): Promise<EditProductResponse> {
    try {
      const response = await this.client.post<EditProductResponse>('/products/edit', body);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async editProductByExternalId(body: {
    external_id: string;
    price?: number;
    is_active?: boolean;
    in_stock?: boolean;
    quantity_in_stock?: number;
    discount?: number;
  }): Promise<EditProductResponse> {
    try {
      const response = await this.client.post<EditProductResponse>(
        '/products/edit_by_external_id',
        body
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  async listMessages(params?: {
    limit?: number;
    from_id?: number;
  }): Promise<MessageListResponse> {
    try {
      const response = await this.client.get<MessageListResponse>('/messages/list', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getChat(chatId: number): Promise<{ messages: import('../types.js').PromMessage[] }> {
    try {
      const response = await this.client.get<{ messages: import('../types.js').PromMessage[] }>(
        `/messages/${chatId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async sendMessage(chatId: number, text: string): Promise<{ id: number }> {
    try {
      const response = await this.client.post<{ id: number }>(`/messages/${chatId}`, { text });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}
