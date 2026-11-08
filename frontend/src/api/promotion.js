import client from "./client";

export const promotionApi = {
  preview: async (payload) => {
    const res = await client.post("/student-promotion/preview", payload);
    return res.data;
  },

  execute: async (payload) => {
    const res = await client.post("/student-promotion/execute", payload);
    return res.data;
  },

  getHistory: async () => {
    const res = await client.get("/student-promotion/history");
    return res.data;
  },
};

export default promotionApi;
