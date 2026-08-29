const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9999';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9999/ws/central';

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const parseApiError = (err, fallbackMessage) => {
  if (!err) return fallbackMessage;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail
      .map(d => {
        if (typeof d === 'string') return d;
        const field = d.loc ? d.loc[d.loc.length - 1] : '';
        return field ? `${field}: ${d.msg}` : d.msg || JSON.stringify(d);
      })
      .join(' | ');
  }
  return fallbackMessage;
};

const handleResponse = async (res, fallbackError) => {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (res.status === 401 || (err && err.detail === 'Inactive user')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: err?.detail }));
    }
    throw new Error(parseApiError(err, fallbackError));
  }
  return await res.json();
};

export async function login(username, password) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await handleResponse(res, 'Fallo de autenticación');
  if (data && data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export async function getMe() {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: getHeaders(),
  });
  return handleResponse(res, 'No autorizado');
}

export async function updateMyPassword(newPassword) {
  const res = await fetch(`${API_BASE_URL}/users/me/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ new_password: newPassword }),
  });
  return handleResponse(res, 'Error al cambiar la contraseña');
}

export async function getUsers() {
  const res = await fetch(`${API_BASE_URL}/users/`, {
    headers: getHeaders(),
  });
  return handleResponse(res, 'Error al obtener usuarios');
}

export async function createUser(userData) {
  const res = await fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  });
  return handleResponse(res, 'Error al crear usuario');
}

export async function updateUser(userId, updateData) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updateData),
  });
  return handleResponse(res, 'Error al actualizar usuario');
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res, 'Error al eliminar usuario');
}

export async function getCategories() {
  const res = await fetch(`${API_BASE_URL}/categories/`, {
    headers: getHeaders(),
  });
  return handleResponse(res, 'Error al obtener categorías');
}

export async function createCategory(categoryData) {
  const res = await fetch(`${API_BASE_URL}/categories/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(categoryData),
  });
  return handleResponse(res, 'Error al crear categoría');
}

export async function getProducts() {
  const res = await fetch(`${API_BASE_URL}/products/`, {
    headers: getHeaders(),
  });
  return handleResponse(res, 'Error al obtener productos');
}

export async function createProduct(productData) {
  const res = await fetch(`${API_BASE_URL}/products/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  return handleResponse(res, 'Error al crear producto');
}

export async function updateProduct(productId, productData) {
  const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  return handleResponse(res, 'Error al actualizar producto');
}

export async function getOrders() {
  const res = await fetch(`${API_BASE_URL}/orders/`, {
    headers: getHeaders(),
  });
  return handleResponse(res, 'Error al obtener pedidos');
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_BASE_URL}/orders/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
  });
  return handleResponse(res, 'Error al enviar pedido');
}

export function subscribeToOrdersWebSocket(onMessage, onError) {
  let ws = null;
  let isClosedIntentionally = false;

  const connect = () => {
    ws = new WebSocket(WS_BASE_URL);

    ws.onopen = () => {
      console.log('Conectado a WebSocket central');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('Error parseando mensaje WS:', err);
      }
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = () => {
      if (!isClosedIntentionally) {
        setTimeout(connect, 3000); // Reintento automático
      }
    };
  };

  connect();

  return () => {
    isClosedIntentionally = true;
    if (ws) ws.close();
  };
}
