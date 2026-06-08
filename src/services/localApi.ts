const API_URL = '/api';

// Robust fetch helper with automatic retry for local/offline desktop reliability.
// This prevents random "Failed to fetch" errors on startup if the backend takes an extra second to compile and start.
async function customFetch(url: string, options?: RequestInit, retries = 3, delay = 300): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch to ${url} failed. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return customFetch(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const localApi = {
  // --- AUTH ---
  async signup(data: any) {
    const res = await customFetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async login(data: any) {
    const res = await customFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getUser(id: string) {
    const res = await customFetch(`${API_URL}/users/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async updateUser(id: string, updates: any) {
    const res = await customFetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteUser(id: string) {
    const res = await customFetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getUsers(companyId: string) {
    const res = await customFetch(`${API_URL}/users?companyId=${companyId}`);
    return res.json();
  },

  async getCurrentUser() {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;
    const { id } = JSON.parse(savedUser);
    return this.getUser(id);
  },

  // --- COMPANIES ---
  async getCompanies() {
    const res = await customFetch(`${API_URL}/companies`);
    return res.json();
  },

  async getCompany(id: string) {
    const res = await customFetch(`${API_URL}/companies/${id}`);
    return res.json();
  },

  async createCompany(data: any) {
    const res = await customFetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateCompany(id: string, data: any) {
    const res = await customFetch(`${API_URL}/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCompany(id: string) {
    const res = await customFetch(`${API_URL}/companies/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getCompanyProfile(id: string) {
    const res = await customFetch(`${API_URL}/companyProfile/${id}`);
    return res.json();
  },

  async updateCompanyProfile(id: string, data: any) {
    const res = await customFetch(`${API_URL}/companyProfile/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- CLIENTS ---
  async getClients(companyId: string) {
    const res = await customFetch(`${API_URL}/clients?companyId=${companyId}`);
    return res.json();
  },

  async createClient(data: any) {
    const res = await customFetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateClient(id: string, data: any) {
    const res = await customFetch(`${API_URL}/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteClient(id: string) {
    const res = await customFetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- PRODUCTS ---
  async getProducts(companyId: string) {
    const res = await customFetch(`${API_URL}/products?companyId=${companyId}`);
    return res.json();
  },

  async createProduct(data: any) {
    const res = await customFetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateProduct(id: string, data: any) {
    const res = await customFetch(`${API_URL}/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteProduct(id: string) {
    const res = await customFetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // --- QUOTATIONS ---
  async getQuotations(companyId: string) {
    const res = await customFetch(`${API_URL}/quotations?companyId=${companyId}`);
    return res.json();
  },

  async getQuotation(id: string) {
    const res = await customFetch(`${API_URL}/quotations/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async createQuotation(data: any) {
    const res = await customFetch(`${API_URL}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateQuotation(id: string, data: any) {
    const res = await customFetch(`${API_URL}/quotations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteQuotation(id: string) {
    const res = await customFetch(`${API_URL}/quotations/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async duplicateQuotation(id: string) {
    const res = await customFetch(`${API_URL}/quotations/${id}/duplicate`, { method: 'POST' });
    return res.json();
  },

  // --- COUNTERS ---
  async getCounter(id: string) {
    const res = await customFetch(`${API_URL}/counters/${id}`);
    return res.json();
  },

  async incrementCounter(id: string) {
    const res = await customFetch(`${API_URL}/counters/${id}/increment`, { method: 'POST' });
    return res.json();
  }
};
