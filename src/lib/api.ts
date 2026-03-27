const API_URL = '/api';

// Get auth token from localStorage
function getToken(): string | null {
    return localStorage.getItem('auth_token');
}

// Store auth token
export function setToken(token: string) {
    localStorage.setItem('auth_token', token);
}

// Remove auth token
export function removeToken() {
    localStorage.removeItem('auth_token');
}

// API request helper
export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
}

// Convenience methods
export const api = {
    get: <T = any>(endpoint: string) => apiRequest<T>(endpoint),

    post: <T = any>(endpoint: string, data: any) =>
        apiRequest<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    put: <T = any>(endpoint: string, data: any) =>
        apiRequest<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    patch: <T = any>(endpoint: string, data: any) =>
        apiRequest<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: <T = any>(endpoint: string) =>
        apiRequest<T>(endpoint, { method: 'DELETE' }),
};

// Auth-specific helpers
export const authApi = {
    login: (email: string, password: string) =>
        api.post<{ token: string; user: any }>('/auth/login', { email, password }),

    register: (data: { email: string; password: string; full_name: string }) =>
        api.post<{ token: string; user: any }>('/auth/register', data),

    me: () => api.get<{ user: any }>('/auth/me'),
};
