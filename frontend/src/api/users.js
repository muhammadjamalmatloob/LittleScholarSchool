import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

let DUMMY_USERS = [
  {
    id: 1,
    email: "admin@school.com",
    full_name: "System Administrator",
    role: "admin",
    is_active: true,
    created_at: "2024-01-01T08:00:00Z",
    permissions: [
      { resource: "students", action: "create" },
      { resource: "students", action: "read" },
      { resource: "students", action: "update" },
      { resource: "students", action: "delete" },
      { resource: "fees", action: "create" },
      { resource: "fees", action: "read" },
      { resource: "attendance", action: "create" },
      { resource: "attendance", action: "read" },
    ],
  },
  {
    id: 2,
    email: "teacher@school.com",
    full_name: "Ms. Sana Tariq",
    role: "teacher",
    is_active: true,
    created_at: "2024-01-10T09:00:00Z",
    permissions: [
      { resource: "students", action: "read" },
      { resource: "attendance", action: "create" },
      { resource: "attendance", action: "read" },
      { resource: "exams", action: "create" },
    ],
  },
  {
    id: 3,
    email: "accountant@school.com",
    full_name: "Mr. Tariq Mehmood",
    role: "accountant",
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
    permissions: [
      { resource: "students", action: "read" },
      { resource: "fees", action: "create" },
      { resource: "fees", action: "read" },
      { resource: "fees", action: "update" },
    ],
  },
  {
    id: 4,
    email: "principal@school.com",
    full_name: "Prof. Muhammad Usman",
    role: "principal",
    is_active: true,
    created_at: "2024-01-05T08:30:00Z",
    permissions: [
      { resource: "students", action: "read" },
      { resource: "fees", action: "read" },
      { resource: "attendance", action: "read" },
      { resource: "users", action: "read" },
    ],
  },
];

export const userApi = {
  getAll: async (skip = 0, limit = 100) => {
    if (USE_MOCK) {
      return DUMMY_USERS.slice(skip, skip + limit);
    }
    const res = await client.get(`/users?skip=${skip}&limit=${limit}`);
    return res.data;
  },

  getById: async (id) => {
    if (USE_MOCK) {
      const u = DUMMY_USERS.find((user) => user.id === parseInt(id, 10));
      if (!u) throw new Error("User not found");
      return u;
    }
    const res = await client.get(`/users/${id}`);
    return res.data;
  },

  create: async (userData) => {
    if (USE_MOCK) {
      const newUser = {
        id: Date.now(),
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role || "teacher",
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        created_at: new Date().toISOString(),
        permissions: [],
      };
      DUMMY_USERS.unshift(newUser);
      return newUser;
    }
    const res = await client.post("/users", userData);
    return res.data;
  },

  update: async (id, userData) => {
    if (USE_MOCK) {
      const idx = DUMMY_USERS.findIndex((u) => u.id === parseInt(id, 10));
      if (idx === -1) throw new Error("User not found");
      DUMMY_USERS[idx] = { ...DUMMY_USERS[idx], ...userData };
      return DUMMY_USERS[idx];
    }
    const res = await client.put(`/users/${id}`, userData);
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      DUMMY_USERS = DUMMY_USERS.filter((u) => u.id !== parseInt(id, 10));
      return { success: true };
    }
    const res = await client.delete(`/users/${id}`);
    return res.data;
  },

  getPermissions: async (id) => {
    if (USE_MOCK) {
      const u = DUMMY_USERS.find((user) => user.id === parseInt(id, 10));
      return u?.permissions || [];
    }
    const res = await client.get(`/users/${id}/permissions`);
    return res.data;
  },
};

export default userApi;
