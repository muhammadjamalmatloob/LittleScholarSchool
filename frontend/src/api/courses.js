import client from "./client";

export const USE_MOCK = false;

let DUMMY_COURSES = [
  // Class 1 - Section A
  { id: 101, class_name: "Class 1", section: "A", course_name: "Mathematics", course_code: "MTH-101", teacher_id: 1, teacher_name: "Ms. Sana Tariq", weekly_periods: 6, room: "Room 101" },
  { id: 102, class_name: "Class 1", section: "A", course_name: "English Literature", course_code: "ENG-101", teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", weekly_periods: 5, room: "Room 101" },
  { id: 103, class_name: "Class 1", section: "A", course_name: "Urdu Language", course_code: "URD-101", teacher_id: 3, teacher_name: "Ms. Ayesha Siddiqa", weekly_periods: 5, room: "Room 101" },
  { id: 104, class_name: "Class 1", section: "A", course_name: "General Science", course_code: "SCI-101", teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", weekly_periods: 4, room: "Science Lab" },
  { id: 105, class_name: "Class 1", section: "A", course_name: "Islamiat & Nazra Quran", course_code: "ISL-101", teacher_id: 6, teacher_name: "Mr. Abdul Rehman", weekly_periods: 3, room: "Room 101" },

  // Class 1 - Section B
  { id: 106, class_name: "Class 1", section: "B", course_name: "Mathematics", course_code: "MTH-101", teacher_id: 1, teacher_name: "Ms. Sana Tariq", weekly_periods: 6, room: "Room 102" },
  { id: 107, class_name: "Class 1", section: "B", course_name: "English Literature", course_code: "ENG-101", teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", weekly_periods: 5, room: "Room 102" },
  { id: 108, class_name: "Class 1", section: "B", course_name: "Urdu Language", course_code: "URD-101", teacher_id: 3, teacher_name: "Ms. Ayesha Siddiqa", weekly_periods: 5, room: "Room 102" },
  { id: 109, class_name: "Class 1", section: "B", course_name: "General Science", course_code: "SCI-101", teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", weekly_periods: 4, room: "Science Lab" },

  // Class 9 - Section A (High School / Board Exam track)
  { id: 201, class_name: "Class 9", section: "A", course_name: "Advanced Mathematics", course_code: "MTH-901", teacher_id: 1, teacher_name: "Ms. Sana Tariq", weekly_periods: 6, room: "Hall B" },
  { id: 202, class_name: "Class 9", section: "A", course_name: "Physics (Theory & Lab)", course_code: "PHY-901", teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", weekly_periods: 6, room: "Physics Lab" },
  { id: 203, class_name: "Class 9", section: "A", course_name: "Chemistry", course_code: "CHM-901", teacher_id: 5, teacher_name: "Ms. Fatima Zahra", weekly_periods: 5, room: "Chemistry Lab" },
  { id: 204, class_name: "Class 9", section: "A", course_name: "Biology / Computer", course_code: "BIO-901", teacher_id: 7, teacher_name: "Mr. Farhan Saeed", weekly_periods: 5, room: "Computer Lab" },
  { id: 205, class_name: "Class 9", section: "A", course_name: "English Compulsory", course_code: "ENG-901", teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", weekly_periods: 4, room: "Hall B" },
  { id: 206, class_name: "Class 9", section: "A", course_name: "Pakistan Studies", course_code: "PST-901", teacher_id: 6, teacher_name: "Mr. Abdul Rehman", weekly_periods: 3, room: "Hall B" },

  // Class 10 - Section A (Matriculation Board Exam track)
  { id: 301, class_name: "Class 10", section: "A", course_name: "Advanced Mathematics", course_code: "MTH-1001", teacher_id: 1, teacher_name: "Ms. Sana Tariq", weekly_periods: 6, room: "Hall A" },
  { id: 302, class_name: "Class 10", section: "A", course_name: "Physics", course_code: "PHY-1001", teacher_id: 4, teacher_name: "Mr. Muhammad Bilal", weekly_periods: 6, room: "Physics Lab" },
  { id: 303, class_name: "Class 10", section: "A", course_name: "Chemistry", course_code: "CHM-1001", teacher_id: 5, teacher_name: "Ms. Fatima Zahra", weekly_periods: 5, room: "Chemistry Lab" },
  { id: 304, class_name: "Class 10", section: "A", course_name: "Biology / Computer Science", course_code: "BIO-1001", teacher_id: 7, teacher_name: "Mr. Farhan Saeed", weekly_periods: 5, room: "Computer Lab" },
  { id: 305, class_name: "Class 10", section: "A", course_name: "English Compulsory", course_code: "ENG-1001", teacher_id: 2, teacher_name: "Mr. Tariq Mehmood", weekly_periods: 4, room: "Hall A" },
  { id: 306, class_name: "Class 10", section: "A", course_name: "Islamiat Compulsory", course_code: "ISL-1001", teacher_id: 6, teacher_name: "Mr. Abdul Rehman", weekly_periods: 3, room: "Hall A" },
];

export const courseApi = {
  getAll: async () => {
    if (USE_MOCK) {
      return [...DUMMY_COURSES];
    }
    const res = await client.get("/courses");
    return res.data;
  },

  getBySection: async (className, section) => {
    if (USE_MOCK) {
      return DUMMY_COURSES.filter(
        (c) =>
          c.class_name.toLowerCase() === className.toLowerCase() &&
          c.section.toUpperCase() === section.toUpperCase()
      );
    }
    const res = await client.get(`/courses?class=${className}&section=${section}`);
    return res.data;
  },

  assignTeacher: async (courseId, teacherId, teacherName) => {
    if (USE_MOCK) {
      const idx = DUMMY_COURSES.findIndex((c) => c.id === courseId);
      if (idx !== -1) {
        DUMMY_COURSES[idx].teacher_id = teacherId;
        DUMMY_COURSES[idx].teacher_name = teacherName;
        return DUMMY_COURSES[idx];
      }
      throw new Error("Course not found");
    }
    const res = await client.post(`/courses/${courseId}/assign-teacher`, {
      teacher_id: teacherId,
    });
    return res.data;
  },

  create: async (courseData) => {
    if (USE_MOCK) {
      const newCourse = {
        id: Date.now(),
        ...courseData,
        weekly_periods: parseInt(courseData.weekly_periods, 10) || 5,
      };
      DUMMY_COURSES.push(newCourse);
      return newCourse;
    }
    const res = await client.post("/courses", courseData);
    return res.data;
  },

  update: async (id, courseData) => {
    if (USE_MOCK) {
      const idx = DUMMY_COURSES.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Course not found");
      DUMMY_COURSES[idx] = { ...DUMMY_COURSES[idx], ...courseData };
      return DUMMY_COURSES[idx];
    }
    const res = await client.put(`/courses/${id}`, courseData);
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      DUMMY_COURSES = DUMMY_COURSES.filter((c) => c.id !== id);
      return { success: true };
    }
    const res = await client.delete(`/courses/${id}`);
    return res.data;
  },
};
export default courseApi;
