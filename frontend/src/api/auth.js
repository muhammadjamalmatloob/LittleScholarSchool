import client from "./client";

export const USE_MOCK = false;

// Static dummy users for testing
const DUMMY_USERS = [
  {
    id: 1,
    email: "admin@school.com",
    full_name: "System Administrator",
    role: "admin",
    is_active: true,
    permissions: [
      { resource: "students", action: "create" },
      { resource: "students", action: "read" },
      { resource: "students", action: "update" },
      { resource: "students", action: "delete" },
      { resource: "fees", action: "create" },
      { resource: "fees", action: "read" },
      { resource: "fees", action: "update" },
      { resource: "fees", action: "delete" },
      { resource: "attendance", action: "create" },
      { resource: "attendance", action: "read" },
      { resource: "attendance", action: "update" },
      { resource: "exams", action: "create" },
      { resource: "exams", action: "read" },
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
    ],
  },
  {
    id: 2,
    email: "teacher@school.com",
    full_name: "Ms. Sana Tariq",
    role: "teacher",
    is_active: true,
    permissions: [
      { resource: "students", action: "read" },
      { resource: "attendance", action: "create" },
      { resource: "attendance", action: "read" },
      { resource: "exams", action: "create" },
      { resource: "exams", action: "read" },
    ],
  },
  {
    id: 3,
    email: "accountant@school.com",
    full_name: "Mr. Tariq Mehmood",
    role: "accountant",
    is_active: true,
    permissions: [
      { resource: "students", action: "read" },
      { resource: "fees", action: "create" },
      { resource: "fees", action: "read" },
      { resource: "fees", action: "update" },
      { resource: "fees", action: "delete" },
    ],
  },
  {
    id: 4,
    email: "principal@school.com",
    full_name: "Prof. Muhammad Usman",
    role: "principal",
    is_active: true,
    permissions: [
      { resource: "students", action: "read" },
      { resource: "fees", action: "read" },
      { resource: "attendance", action: "read" },
      { resource: "exams", action: "read" },
      { resource: "users", action: "read" },
    ],
  },
];

export const authApi = {
  login: async (email, password) => {
    if (USE_MOCK) {
      const user = DUMMY_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      ) || DUMMY_USERS[0];

      return {
        access_token: `mock-token-${user.role}`,
        token_type: "bearer",
        user,
      };
    }
    const res = await client.post("/auth/login", { email, password });
    return res.data;
  },

  logout: async () => {
    if (USE_MOCK) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      return { success: true };
    }
    try {
      await client.post("/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  },

  getCurrentUser: async () => {
    if (USE_MOCK) {
      const token = localStorage.getItem("access_token") || "";
      const matched = DUMMY_USERS.find((u) => token.includes(u.role)) || DUMMY_USERS[0];
      return matched;
    }
    const res = await client.get("/auth/current-user");
    return res.data;
  },

  refreshToken: async (refreshToken) => {
    if (USE_MOCK) {
      return { access_token: "mock-token-refreshed", token_type: "bearer" };
    }
    const res = await client.post("/auth/refresh-token", { refresh_token: refreshToken });
    return res.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    if (USE_MOCK) {
      return { message: "Password updated successfully" };
    }
    const res = await client.post("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },
};

export default authApi;
