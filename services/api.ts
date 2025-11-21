export const BASE_URL = process.env.EXPO_BASE_URL || `http://192.168.1.8:5001`;
export const API_BASE_URL = process.env.EXPO_API_BASE_URL || `${BASE_URL}/api`;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  termAccepted?: string | null;
  termVersion?: string | null;
  hasAcceptedTerm?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  name: string;
  examDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  uploadedFiles?: ExamMedia[];
}

export interface ExamMedia {
  id: string;
  examId: string;
  mediaType: 'image' | 'pdf' | 'video' | 'document' | 'other';
  filePath: string;
  metadata?: {
    originalName: string;
    size: number;
    mimetype: string;
  };
  createdAt?: string;
}

export interface Reminder {
  id: string;
  title: string;
  reminderDate: string;
  examId?: string; // Opcional - lembrete pode existir sem exame associado
  requiresFasting?: boolean;
  fastingDuration?: number; // em horas
  fastingAlertTime?: string; // data/hora do aviso
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PrescriptionStatus = 'em_uso' | 'concluida' | 'suspensa';

export interface PrescriptionItem {
  id?: string;
  name: string;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface PrescriptionAttachment {
  path: string;
  mimeType: string;
  metadata?: {
    originalName?: string;
    size?: number;
    mimetype?: string;
  };
}

export interface Prescription {
  id: string;
  userId?: string;
  examId?: string | null;
  title: string;
  issueDate: string;
  posology: string;
  status: PrescriptionStatus;
  tags?: string[];
  notes?: string | null;
  professional?: string | null;
  attachment: PrescriptionAttachment;
  items: PrescriptionItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }
      }

      if (!response.ok) {
        // Extrair a mensagem de erro do response
        const errorMessage = data?.error || data?.message || `API Error: ${response.status} ${response.statusText}`;
        console.error(`API Error [${response.status}]:`, errorMessage, 'URL:', url);
        throw new Error(errorMessage);
      }

      // Verificar se a resposta indica sucesso mesmo com status 200
      if (data && data.success === false) {
        const errorMessage = data?.error || data?.message || 'Request failed';
        console.error(`API Error [success=false]:`, errorMessage, 'URL:', url);
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Se for erro de rede, adicionar mais contexto
        if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
          console.error('Network error:', error.message, 'URL:', url);
          throw new Error(`Erro de conexão: Não foi possível conectar ao servidor em ${this.baseURL}. Verifique se o servidor está rodando e acessível.`);
        }
        throw error;
      }
      throw new Error('Erro desconhecido na requisição');
    }
  }

  // Auth endpoints
  async register(data: { name: string; email: string; password: string }) {
    console.log('ApiClient: Register request data:', { name: data.name, email: data.email, hasPassword: !!data.password });
    try {
      const response = await this.request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('ApiClient: Register response:', response);
      return response;
    } catch (error) {
      console.error('ApiClient: Register error:', error);
      throw error;
    }
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  async refreshToken(token: string) {
    return this.request<{ token: string }>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Term endpoints
  async getTerm() {
    return this.request<{
      version: string;
      content: string;
      updatedAt: string;
    }>('/term');
  }

  async acceptTerm(version: string) {
    return this.request<{
      termAccepted: string;
      termVersion: string;
      message: string;
    }>('/term/accept', {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
  }

  async checkTermStatus() {
    return this.request<{
      hasAccepted: boolean;
      termAccepted: string | null;
      termVersion: string | null;
      currentVersion: string;
      needsAcceptance: boolean;
    }>('/term/status');
  }

  // Exams endpoints
  async getExams(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tags) queryParams.append('tags', params.tags.join(','));
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return this.request<Exam[]>(`/exams${query ? `?${query}` : ''}`);
  }

  async getExam(id: string) {
    return this.request<Exam>(`/exams/${id}`);
  }

  async createExam(data: {
    name: string;
    examDate?: string;
    notes?: string;
    tags?: string[];
  }) {
    return this.request<Exam>('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExam(id: string, data: Partial<Exam>) {
    return this.request<Exam>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: string) {
    return this.request(`/exams/${id}`, {
      method: 'DELETE',
    });
  }

  // Exam Media endpoints
  async getExamMedia(examId: string) {
    return this.request<ExamMedia[]>(`/exam-media/exam/${examId}`);
  }

  async downloadExamMedia(mediaId: string): Promise<string> {
    // Retorna URL completa para download com token
    const url = `${this.baseURL}/exam-media/${mediaId}/download`;
    return url;
  }

  // Reminders endpoints
  async getReminders(params?: {
    page?: number;
    limit?: number;
    upcoming?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.upcoming) queryParams.append('upcoming', 'true');
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return this.request<Reminder[]>(`/reminders${query ? `?${query}` : ''}`);
  }

  async getUpcomingReminders(daysAhead: number = 3) {
    return this.request<Reminder[]>(`/reminders/upcoming?daysAhead=${daysAhead}`);
  }

  async getReminderStats() {
    return this.request<{
      total: number;
      upcoming: number;
      past: number;
    }>('/reminders/stats');
  }

  async createReminder(data: {
    examId?: string;
    title: string;
    reminderDate: string;
    requiresFasting?: boolean;
    fastingDuration?: number;
    fastingAlertTime?: string;
    notes?: string;
  }) {
    return this.request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReminder(id: string, data: {
    examId?: string | null;
    title?: string;
    reminderDate?: string;
    requiresFasting?: boolean;
    fastingDuration?: number;
    fastingAlertTime?: string;
    notes?: string;
  }) {
    return this.request<Reminder>(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getReminder(id: string) {
    return this.request<Reminder>(`/reminders/${id}`);
  }

  async deleteReminder(id: string) {
    return this.request(`/reminders/${id}`, {
      method: 'DELETE',
    });
  }

  // Prescriptions endpoints
  async getPrescriptions(params?: {
    page?: number;
    limit?: number;
    status?: PrescriptionStatus | string;
    search?: string;
    startDate?: string;
    endDate?: string;
    tags?: string[];
    sortField?: 'issueDate' | 'title' | 'status' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.tags && params.tags.length > 0) {
      queryParams.append('tags', JSON.stringify(params.tags));
    }
    if (params?.sortField) queryParams.append('sortField', params.sortField);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    return this.request<{ data: Prescription[]; pagination: ApiResponse<unknown>['pagination'] }>(
      `/prescriptions${query ? `?${query}` : ''}`
    );
  }

  async getPrescription(id: string) {
    return this.request<Prescription>(`/prescriptions/${id}`);
  }

  async createPrescription(formData: FormData) {
    return this.request<Prescription>('/prescriptions', {
      method: 'POST',
      body: formData,
    });
  }

  async updatePrescription(id: string, formData: FormData) {
    return this.request<Prescription>(`/prescriptions/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deletePrescription(id: string, options?: { hard?: boolean }) {
    const query = options?.hard ? '?hard=true' : '';
    return this.request(`/prescriptions/${id}${query}`, {
      method: 'DELETE',
    });
  }

  async getPrescriptionDownloadUrl(id: string) {
    return `${this.baseURL}/prescriptions/${id}/download`;
  }

  // File upload
  async uploadExamWithFiles(formData: FormData) {
    const url = `${this.baseURL}/exams`;
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Upload Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  // Share Link endpoints (protected)
  async createShareLink(data: {
    examIds: string[]; // Array de IDs de exames
    email: string;
    expiresInDays?: number;
    maxUses?: number;
    message?: string; // Mensagem opcional
  }) {
    return this.request<ShareLink>('/share-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getShareLinks(examId?: string) {
    if (examId) {
      return this.request<ShareLink[]>(`/share-links/exam/${examId}`);
    }
    return this.request<ShareLink[]>('/share-links');
  }

  async getShareLink(id: string) {
    return this.request<ShareLink>(`/share-links/${id}`);
  }

  async revokeShareLink(id: string) {
    return this.request(`/share-links/${id}/revoke`, {
      method: 'POST',
    });
  }

  async updateShareLinkExpiration(id: string, expiresInDays: number) {
    return this.request<ShareLink>(`/share-links/${id}/expiration`, {
      method: 'PATCH',
      body: JSON.stringify({ expiresInDays }),
    });
  }

  async deleteShareLink(id: string) {
    return this.request(`/share-links/${id}`, {
      method: 'DELETE',
    });
  }

  // Share Link endpoints (public - no auth token)
  async getShareByCode(code: string) {
    const url = `${BASE_URL}/s/${code}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to get share');
    }
    return data;
  }

  async requestShareAccess(code: string, email: string) {
    const url = `${BASE_URL}/s/${code}/request-access`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to request access');
    }
    return data;
  }

  async validateShareOTP(code: string, email: string, otp: string) {
    const url = `${BASE_URL}/s/${code}/validate-otp`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to validate OTP');
    }
    return data;
  }

  async listShareFiles(code: string, accessToken: string) {
    const url = `${BASE_URL}/s/${code}/files`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to list files');
    }
    return data;
  }

  async downloadShareFile(code: string, mediaId: string, accessToken: string): Promise<string> {
    const url = `${BASE_URL}/s/${code}/files/${mediaId}/download`;
    return url; // Retorna URL para download com token
  }

  async downloadAllShareFiles(code: string, accessToken: string): Promise<string> {
    const url = `${BASE_URL}/s/${code}/download-all`;
    return url; // Retorna URL para download ZIP com token
  }
}

export interface ShareLink {
  id: string;
  userId: string;
  code: string;
  shareUrl: string;
  email: string;
  expiresAt: string;
  maxUses: number;
  timesUsed: number;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isRevoked: boolean;
  isMaxUsesReached: boolean;
  isActive: boolean;
  exams?: Array<{
    id: string;
    name: string;
    examDate?: string;
    notes?: string;
    tags?: string[];
    files?: Array<{
      id: string;
      mediaType: string;
      fileName: string;
      fileSize: number;
      downloadUrl: string;
    }>;
    hasPdf: boolean;
  }>;
}

export const apiClient = new ApiClient(API_BASE_URL);
