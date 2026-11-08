import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

let DUMMY_CLASSES = [
  { id: 1, name: "Playgroup", section: "A", class_teacher_id: 8, teacher_name: "Ms. Noreen Akhtar", capacity: 25, student_count: 8, academic_year: "2024-2025", display_name: "Playgroup - Section A" },
  { id: 2, name: "Nursery", section: "A", class_teacher_id: 8, teacher_name: "Ms. Noreen Akhtar", capacity: 30, student_count: 12, academic_year: "2024-2025", display_name: "Nursery - Section A" },
  { id: 3, name: "Prep", section: "A", class_teacher_id: 3, teacher_name: "Ms. Ayesha Siddiqa", capacity: 30, student_count: 15, academic_year: "2024-2025", display_name: "Prep - Section A" },
  { id: 4, name: "Class 1", section: "A", class_teacher_id: 1, teacher_name: "Ms. Sana Tariq", capacity: 40, student_count: 22, academic_year: "2024-2025", display_name: "Class 1 - Section A" },
  { id: 5, name: "Class 1", section: "B", class_teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", capacity: 40, student_count: 19, academic_year: "2024-2025", display_name: "Class 1 - Section B" },
  { id: 6, name: "Class 2", section: "A", class_teacher_id: 3, teacher_name: "Ms. Ayesha Siddiqa", capacity: 40, student_count: 25, academic_year: "2024-2025", display_name: "Class 2 - Section A" },
  { id: 7, name: "Class 3", section: "A", class_teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", capacity: 40, student_count: 28, academic_year: "2024-2025", display_name: "Class 3 - Section A" },
  { id: 8, name: "Class 4", section: "A", class_teacher_id: 6, teacher_name: "Mr. Abdul Rehman", capacity: 40, student_count: 24, academic_year: "2024-2025", display_name: "Class 4 - Section A" },
  { id: 9, name: "Class 5", section: "A", class_teacher_id: 1, teacher_name: "Ms. Sana Tariq", capacity: 40, student_count: 30, academic_year: "2024-2025", display_name: "Class 5 - Section A" },
  { id: 10, name: "Class 6", section: "A", class_teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", capacity: 40, student_count: 32, academic_year: "2024-2025", display_name: "Class 6 - Section A" },
  { id: 11, name: "Class 7", section: "A", class_teacher_id: 7, teacher_name: "Mr. Farhan Saeed", capacity: 40, student_count: 35, academic_year: "2024-2025", display_name: "Class 7 - Section A" },
  { id: 12, name: "Class 8", section: "A", class_teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", capacity: 40, student_count: 36, academic_year: "2024-2025", display_name: "Class 8 - Section A" },
  { id: 13, name: "Class 9", section: "A", class_teacher_id: 5, teacher_name: "Ms. Fatima Zahra", capacity: 40, student_count: 38, academic_year: "2024-2025", display_name: "Class 9 - Section A" },
  { id: 14, name: "Class 10", section: "A", class_teacher_id: 1, teacher_name: "Ms. Sana Tariq", capacity: 40, student_count: 38, academic_year: "2024-2025", display_name: "Class 10 - Section A" },
  { id: 15, name: "Class 10", section: "B", class_teacher_id: 5, teacher_name: "Ms. Fatima Zahra", capacity: 40, student_count: 34, academic_year: "2024-2025", display_name: "Class 10 - Section B" },
];

export const classApi = {
  getAll: async () => {
    if (USE_MOCK) {
      return [...DUMMY_CLASSES];
    }
    const res = await client.get("/classes");
    return res.data;
  },

  getById: async (id) => {
    if (USE_MOCK) {
      const cls = DUMMY_CLASSES.find((c) => c.id === parseInt(id, 10));
      if (!cls) throw new Error("Class not found");
      return cls;
    }
    const res = await client.get(`/classes/${id}`);
    return res.data;
  },

  getStudents: async (classId) => {
    if (USE_MOCK) {
      return [];
    }
    const res = await client.get(`/classes/${classId}/students`);
    return res.data;
  },

  create: async (classData) => {
    if (USE_MOCK) {
      const sectionStr = classData.section ? classData.section.toUpperCase() : "A";
      const newClass = {
        id: Date.now(),
        name: classData.name,
        section: sectionStr,
        class_teacher_id: classData.class_teacher_id || 1,
        teacher_name: classData.teacher_name || "Faculty Member",
        capacity: classData.capacity || 40,
        student_count: 0,
        academic_year: classData.academic_year || "2024-2025",
        display_name: `${classData.name} - Section ${sectionStr}`,
      };
      DUMMY_CLASSES.push(newClass);
      return newClass;
    }
    const res = await client.post("/classes", {
      name: String(classData.name || "").trim(),
      section: classData.section ? String(classData.section).trim().toUpperCase() : undefined,
      capacity: Number.parseInt(classData.capacity, 10) || 40,
      class_teacher_id: classData.class_teacher_id ? Number.parseInt(classData.class_teacher_id, 10) : undefined,
      monthly_fee: classData.monthly_fee !== undefined ? Number.parseFloat(classData.monthly_fee) : undefined,
    });
    return res.data;
  },

  update: async (id, classData) => {
    if (USE_MOCK) {
      const idx = DUMMY_CLASSES.findIndex((c) => c.id === parseInt(id, 10));
      if (idx === -1) throw new Error("Class not found");
      const sectionStr = classData.section ? classData.section.toUpperCase() : DUMMY_CLASSES[idx].section;
      DUMMY_CLASSES[idx] = {
        ...DUMMY_CLASSES[idx],
        ...classData,
        section: sectionStr,
        display_name: `${classData.name || DUMMY_CLASSES[idx].name} - Section ${sectionStr}`,
      };
      return DUMMY_CLASSES[idx];
    }
    const res = await client.put(`/classes/${id}`, {
      name: classData.name !== undefined ? String(classData.name).trim() : undefined,
      section: classData.section ? String(classData.section).trim().toUpperCase() : undefined,
      capacity: classData.capacity !== undefined
        ? Number.parseInt(classData.capacity, 10) || 40
        : undefined,
      class_teacher_id: classData.class_teacher_id !== undefined
        ? (classData.class_teacher_id ? Number.parseInt(classData.class_teacher_id, 10) : null)
        : undefined,
      monthly_fee: classData.monthly_fee !== undefined
        ? Number.parseFloat(classData.monthly_fee)
        : undefined,
    });
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      DUMMY_CLASSES = DUMMY_CLASSES.filter((c) => c.id !== parseInt(id, 10));
      return { success: true };
    }
    const res = await client.delete(`/classes/${id}`);
    return res.data;
  },
};

export const getClasses = () => classApi.getAll();
export default classApi;
