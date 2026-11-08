import client from "./client";

export const academicYearApi = {
  getAll: async (includeInactive = false) => {
    const response = await client.get("/academic-years", {
      params: includeInactive ? { include_inactive: true } : undefined,
    });
    return response.data;
  },

  create: async (payload) => {
    const response = await client.post("/academic-years", payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await client.put(`/academic-years/${id}`, payload);
    return response.data;
  },

  setCurrent: async (id) => {
    const response = await client.post(`/academic-years/${id}/set-current`);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await client.delete(`/academic-years/${id}`);
    return response.data;
  },
};

