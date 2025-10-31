const API_BASE_URL = 'http://192.168.1.8:5001/api';

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
  mediaType: 'image' | 'pdf' | 'video' | 'document' | 'other';
  filePath: string;
  metadata?: {
    originalName: string;
    size: number;
    mimetype: string;
  };
}

export interface Reminder {
  id: string;
  title: string;
  reminderDate: string;
  examId: string;
  createdAt: string;
  updatedAt: string;
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Extrair a mensagem de erro do response
      const errorMessage = data?.error || data?.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  // Auth endpoints
  async register(data: { name: string; email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    examId: string;
    title: string;
    reminderDate: string;
  }) {
    return this.request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
}

export const apiClient = new ApiClient(API_BASE_URL);
