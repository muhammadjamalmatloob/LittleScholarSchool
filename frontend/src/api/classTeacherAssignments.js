import client from "./client";

export const classTeacherAssignmentApi = {
  getClasses: async () => {
    const response = await client.get("/classes");
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await client.get("/class-teacher-assignments", { params });
    return response.data;
  },

  create: async (payload) => {
    const response = await client.post("/class-teacher-assignments", payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await client.put(`/class-teacher-assignments/${id}`, payload);
    return response.data;
  },

  getCurrentTeacher: async (classId, academicYearId) => {
    const response = await client.get(`/classes/${classId}/current-teacher`, {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    });
    return response.data;
  },
};
