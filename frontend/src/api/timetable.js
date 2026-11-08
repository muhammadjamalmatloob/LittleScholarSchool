import client from "./client";

// Set to false to connect directly to the live backend
export const USE_MOCK = false;

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const DAILY_PERIODS = [
  { period: "Period 1", time: "08:00 AM - 08:45 AM", isFirstPeriod: true },
  { period: "Period 2", time: "08:45 AM - 09:30 AM" },
  { period: "Period 3", time: "09:30 AM - 10:15 AM" },
  { period: "Break / Recess", time: "10:15 AM - 10:45 AM", isBreak: true },
  { period: "Period 4", time: "10:45 AM - 11:30 AM" },
  { period: "Period 5", time: "11:30 AM - 12:15 PM" },
  { period: "Period 6", time: "12:15 PM - 01:00 PM" },
];

export const FRIDAY_PERIODS = [
  { period: "Period 1", time: "08:00 AM - 08:45 AM", isFirstPeriod: true },
  { period: "Period 2", time: "08:45 AM - 09:30 AM" },
  { period: "Period 3", time: "09:30 AM - 10:15 AM" },
  { period: "Recess Break", time: "10:15 AM - 10:35 AM", isBreak: true },
  { period: "Period 4", time: "10:35 AM - 11:20 AM" },
  { period: "Period 5", time: "11:20 AM - 12:15 PM" },
];

export const SECTION_TIMETABLES = [
  {
    id: 1,
    class_name: "Class 1",
    section: "A",
    room: "Room 101",
    first_lecture_teacher: "Ms. Sana Tariq",
    first_lecture_subject: "Mathematics",
    daily_schedule: [
      { period: "Period 1", subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
      { period: "Period 2", subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
      { period: "Period 3", subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
      { period: "Break / Recess", subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
      { period: "Period 4", subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
      { period: "Period 5", subject: "Islamiat & Nazra Quran", teacher: "Mr. Abdul Rehman", room: "Room 101" },
      { period: "Period 6", subject: "Drawing & Art", teacher: "Ms. Ayesha Siddiqa", room: "Art Room" },
    ],
    friday_schedule: [
      { period: "Period 1", subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
      { period: "Period 2", subject: "English Grammar", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
      { period: "Period 3", subject: "Islamiat & Tarbiyah", teacher: "Mr. Abdul Rehman", room: "Room 101" },
      { period: "Recess Break", subject: "Short Break", teacher: "Staff", room: "Campus Yard", isBreak: true },
      { period: "Period 4", subject: "Urdu Khushkhati & Qirat", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
      { period: "Period 5", subject: "General Knowledge Quiz", teacher: "Mr. Muhammad Bilal", room: "Room 101" },
    ],
    weekly_matrix: [
      {
        period: "Period 1",
        time: "08:00 AM - 08:45 AM",
        slots: {
          Monday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
          Tuesday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
          Wednesday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
          Thursday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
          Friday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 101", isIncharge: true },
        },
      },
      {
        period: "Period 2",
        time: "08:45 AM - 09:30 AM",
        slots: {
          Monday: { subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
          Tuesday: { subject: "English Grammar", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
          Wednesday: { subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
          Thursday: { subject: "English Reading", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
          Friday: { subject: "English Grammar", teacher: "Mr. Tariq Mehmood", room: "Room 101" },
        },
      },
      {
        period: "Period 3",
        time: "09:30 AM - 10:15 AM",
        slots: {
          Monday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
          Tuesday: { subject: "Urdu Adab", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
          Wednesday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
          Thursday: { subject: "Urdu Qirat", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
          Friday: { subject: "Islamiat & Tarbiyah", teacher: "Mr. Abdul Rehman", room: "Room 101" },
        },
      },
      {
        period: "Break / Recess",
        time: "10:15 AM - 10:45 AM",
        isBreak: true,
        slots: {
          Monday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Tuesday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Wednesday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Thursday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Friday: { subject: "Friday Short Recess", teacher: "Duty Staff", room: "Campus Yard", isBreak: true },
        },
      },
      {
        period: "Period 4",
        time: "10:45 AM - 11:30 AM",
        slots: {
          Monday: { subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
          Tuesday: { subject: "Science Lab", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
          Wednesday: { subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Room 101" },
          Thursday: { subject: "Science Inquiry", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
          Friday: { subject: "Urdu Khushkhati", teacher: "Ms. Ayesha Siddiqa", room: "Room 101" },
        },
      },
      {
        period: "Period 5",
        time: "11:30 AM - 12:15 PM",
        slots: {
          Monday: { subject: "Islamiat & Nazra Quran", teacher: "Mr. Abdul Rehman", room: "Room 101" },
          Tuesday: { subject: "Islamiat", teacher: "Mr. Abdul Rehman", room: "Room 101" },
          Wednesday: { subject: "Social Studies", teacher: "Mr. Abdul Rehman", room: "Room 101" },
          Thursday: { subject: "Nazra Quran", teacher: "Mr. Abdul Rehman", room: "Room 101" },
          Friday: { subject: "General Knowledge Quiz", teacher: "Mr. Muhammad Bilal", room: "Room 101" },
        },
      },
      {
        period: "Period 6",
        time: "12:15 PM - 01:00 PM",
        slots: {
          Monday: { subject: "Drawing & Art", teacher: "Ms. Ayesha Siddiqa", room: "Art Room" },
          Tuesday: { subject: "Computer Basics", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Wednesday: { subject: "Library Reading", teacher: "Ms. Noreen Akhtar", room: "Library" },
          Thursday: { subject: "Physical Education", teacher: "Sports Coach", room: "Ground" },
          Friday: { subject: "Jummah Dismissal (12:30 PM)", teacher: "Staff", room: "Main Gate", isDismissal: true },
        },
      },
    ],
  },
  {
    id: 2,
    class_name: "Class 1",
    section: "B",
    room: "Room 102",
    first_lecture_teacher: "Ms. Ayesha Siddiqa",
    first_lecture_subject: "Urdu Language",
    daily_schedule: [
      { period: "Period 1", subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
      { period: "Period 2", subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 102" },
      { period: "Period 3", subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
      { period: "Break / Recess", subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
      { period: "Period 4", subject: "Islamiat", teacher: "Mr. Abdul Rehman", room: "Room 102" },
      { period: "Period 5", subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
      { period: "Period 6", subject: "Physical Education", teacher: "Sports Coach", room: "Sports Ground" },
    ],
    friday_schedule: [
      { period: "Period 1", subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
      { period: "Period 2", subject: "Mathematics Exercises", teacher: "Ms. Sana Tariq", room: "Room 102" },
      { period: "Period 3", subject: "English Poetry", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
      { period: "Recess Break", subject: "Short Break", teacher: "Staff", room: "Campus Yard", isBreak: true },
      { period: "Period 4", subject: "Islamiat Lessons", teacher: "Mr. Abdul Rehman", room: "Room 102" },
      { period: "Period 5", subject: "Activity & Storytelling", teacher: "Mr. Muhammad Bilal", room: "Room 102" },
    ],
    weekly_matrix: [
      {
        period: "Period 1",
        time: "08:00 AM - 08:45 AM",
        slots: {
          Monday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
          Tuesday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
          Wednesday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
          Thursday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
          Friday: { subject: "Urdu Language", teacher: "Ms. Ayesha Siddiqa", room: "Room 102", isIncharge: true },
        },
      },
      {
        period: "Period 2",
        time: "08:45 AM - 09:30 AM",
        slots: {
          Monday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 102" },
          Tuesday: { subject: "Mathematics Practice", teacher: "Ms. Sana Tariq", room: "Room 102" },
          Wednesday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Room 102" },
          Thursday: { subject: "Mental Math", teacher: "Ms. Sana Tariq", room: "Room 102" },
          Friday: { subject: "Mathematics Exercises", teacher: "Ms. Sana Tariq", room: "Room 102" },
        },
      },
      {
        period: "Period 3",
        time: "09:30 AM - 10:15 AM",
        slots: {
          Monday: { subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
          Tuesday: { subject: "English Grammar", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
          Wednesday: { subject: "English Literature", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
          Thursday: { subject: "English Phonics", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
          Friday: { subject: "English Poetry", teacher: "Mr. Tariq Mehmood", room: "Room 102" },
        },
      },
      {
        period: "Break / Recess",
        time: "10:15 AM - 10:45 AM",
        isBreak: true,
        slots: {
          Monday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Tuesday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Wednesday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Thursday: { subject: "Lunch & Refreshment", teacher: "Duty Staff", room: "Playground", isBreak: true },
          Friday: { subject: "Friday Short Recess", teacher: "Duty Staff", room: "Campus Yard", isBreak: true },
        },
      },
      {
        period: "Period 4",
        time: "10:45 AM - 11:30 AM",
        slots: {
          Monday: { subject: "Islamiat", teacher: "Mr. Abdul Rehman", room: "Room 102" },
          Tuesday: { subject: "Islamiat Lessons", teacher: "Mr. Abdul Rehman", room: "Room 102" },
          Wednesday: { subject: "Moral Science", teacher: "Mr. Abdul Rehman", room: "Room 102" },
          Thursday: { subject: "Nazra Quran", teacher: "Mr. Abdul Rehman", room: "Room 102" },
          Friday: { subject: "Islamiat Lessons", teacher: "Mr. Abdul Rehman", room: "Room 102" },
        },
      },
      {
        period: "Period 5",
        time: "11:30 AM - 12:15 PM",
        slots: {
          Monday: { subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
          Tuesday: { subject: "Science Lab", teacher: "Mr. Muhammad Bilal", room: "Science Lab" },
          Wednesday: { subject: "General Science", teacher: "Mr. Muhammad Bilal", room: "Room 102" },
          Thursday: { subject: "Environmental Studies", teacher: "Mr. Muhammad Bilal", room: "Room 102" },
          Friday: { subject: "Activity & Storytelling", teacher: "Mr. Muhammad Bilal", room: "Room 102" },
        },
      },
      {
        period: "Period 6",
        time: "12:15 PM - 01:00 PM",
        slots: {
          Monday: { subject: "Physical Education", teacher: "Sports Coach", room: "Ground" },
          Tuesday: { subject: "Art & Craft", teacher: "Ms. Ayesha Siddiqa", room: "Art Room" },
          Wednesday: { subject: "Computer Basics", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Thursday: { subject: "Library Hour", teacher: "Ms. Noreen Akhtar", room: "Library" },
          Friday: { subject: "Jummah Dismissal (12:30 PM)", teacher: "Staff", room: "Main Gate", isDismissal: true },
        },
      },
    ],
  },
  {
    id: 3,
    class_name: "Class 9",
    section: "A",
    room: "Hall B",
    isBoardExam: true,
    first_lecture_teacher: "Mr. Muhammad Bilal",
    first_lecture_subject: "Physics",
    daily_schedule: [
      { period: "Period 1", subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall B", isIncharge: true },
      { period: "Period 2", subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Hall B" },
      { period: "Period 3", subject: "Chemistry", teacher: "Ms. Fatima Zahra", room: "Hall B" },
      { period: "Break / Recess", subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
      { period: "Period 4", subject: "Biology / Computer", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
      { period: "Period 5", subject: "English Compulsory", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
      { period: "Period 6", subject: "Pakistan Studies", teacher: "Mr. Abdul Rehman", room: "Hall B" },
    ],
    friday_schedule: [
      { period: "Period 1", subject: "Physics Practical", teacher: "Mr. Muhammad Bilal", room: "Physics Lab", isIncharge: true },
      { period: "Period 2", subject: "Chemistry Practical", teacher: "Ms. Fatima Zahra", room: "Chemistry Lab" },
      { period: "Period 3", subject: "Mathematics Past Papers", teacher: "Ms. Sana Tariq", room: "Hall B" },
      { period: "Recess Break", subject: "Friday Recess", teacher: "Staff", room: "Cafeteria", isBreak: true },
      { period: "Period 4", subject: "English Composition", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
      { period: "Period 5", subject: "Board Exam Prep & Review", teacher: "Mr. Muhammad Bilal", room: "Hall B" },
    ],
    weekly_matrix: [
      {
        period: "Period 1",
        time: "08:00 AM - 08:45 AM",
        slots: {
          Monday: { subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall B", isIncharge: true },
          Tuesday: { subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall B", isIncharge: true },
          Wednesday: { subject: "Physics Problem Solving", teacher: "Mr. Muhammad Bilal", room: "Hall B", isIncharge: true },
          Thursday: { subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall B", isIncharge: true },
          Friday: { subject: "Physics Practical", teacher: "Mr. Muhammad Bilal", room: "Physics Lab", isIncharge: true },
        },
      },
      {
        period: "Period 2",
        time: "08:45 AM - 09:30 AM",
        slots: {
          Monday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Hall B" },
          Tuesday: { subject: "Mathematics", teacher: "Ms. Sana Tariq", room: "Hall B" },
          Wednesday: { subject: "Mathematics (Algebra)", teacher: "Ms. Sana Tariq", room: "Hall B" },
          Thursday: { subject: "Mathematics (Geometry)", teacher: "Ms. Sana Tariq", room: "Hall B" },
          Friday: { subject: "Chemistry Practical", teacher: "Ms. Fatima Zahra", room: "Chemistry Lab" },
        },
      },
      {
        period: "Period 3",
        time: "09:30 AM - 10:15 AM",
        slots: {
          Monday: { subject: "Chemistry (Theory)", teacher: "Ms. Fatima Zahra", room: "Hall B" },
          Tuesday: { subject: "Chemistry", teacher: "Ms. Fatima Zahra", room: "Hall B" },
          Wednesday: { subject: "Chemistry Equations", teacher: "Ms. Fatima Zahra", room: "Hall B" },
          Thursday: { subject: "Chemistry Lab Review", teacher: "Ms. Fatima Zahra", room: "Hall B" },
          Friday: { subject: "Mathematics Past Papers", teacher: "Ms. Sana Tariq", room: "Hall B" },
        },
      },
      {
        period: "Break / Recess",
        time: "10:15 AM - 10:45 AM",
        isBreak: true,
        slots: {
          Monday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Tuesday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Wednesday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Thursday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Friday: { subject: "Friday Recess", teacher: "Staff", room: "Cafeteria", isBreak: true },
        },
      },
      {
        period: "Period 4",
        time: "10:45 AM - 11:30 AM",
        slots: {
          Monday: { subject: "Biology / Computer", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Tuesday: { subject: "Biology Lab / Computer Coding", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Wednesday: { subject: "Biology / Computer", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Thursday: { subject: "Bio / Computer Theory", teacher: "Mr. Farhan Saeed", room: "Computer Lab" },
          Friday: { subject: "English Composition", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
        },
      },
      {
        period: "Period 5",
        time: "11:30 AM - 12:15 PM",
        slots: {
          Monday: { subject: "English Compulsory", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
          Tuesday: { subject: "English Grammar & Essay", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
          Wednesday: { subject: "English Comprehension", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
          Thursday: { subject: "English Past Papers", teacher: "Mr. Tariq Mehmood", room: "Hall B" },
          Friday: { subject: "Board Exam Prep & Review", teacher: "Mr. Muhammad Bilal", room: "Hall B" },
        },
      },
      {
        period: "Period 6",
        time: "12:15 PM - 01:00 PM",
        slots: {
          Monday: { subject: "Pakistan Studies", teacher: "Mr. Abdul Rehman", room: "Hall B" },
          Tuesday: { subject: "Pakistan Studies", teacher: "Mr. Abdul Rehman", room: "Hall B" },
          Wednesday: { subject: "Islamiat Compulsory", teacher: "Mr. Abdul Rehman", room: "Hall B" },
          Thursday: { subject: "Pakistan Studies Review", teacher: "Mr. Abdul Rehman", room: "Hall B" },
          Friday: { subject: "Jummah Dismissal (12:30 PM)", teacher: "Staff", room: "Main Gate", isDismissal: true },
        },
      },
    ],
  },
  {
    id: 4,
    class_name: "Class 10",
    section: "A",
    room: "Hall A",
    isBoardExam: true,
    first_lecture_teacher: "Ms. Sana Tariq",
    first_lecture_subject: "Advanced Mathematics",
    daily_schedule: [
      { period: "Period 1", subject: "Advanced Mathematics", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
      { period: "Period 2", subject: "Chemistry (Theory)", teacher: "Ms. Fatima Zahra", room: "Hall A" },
      { period: "Period 3", subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall A" },
      { period: "Break / Recess", subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
      { period: "Period 4", subject: "Biology / Computer Science", teacher: "Mr. Farhan Saeed", room: "Lab 2" },
      { period: "Period 5", subject: "English Compulsory", teacher: "Mr. Tariq Mehmood", room: "Hall A" },
      { period: "Period 6", subject: "Islamiat Compulsory", teacher: "Mr. Abdul Rehman", room: "Hall A" },
    ],
    friday_schedule: [
      { period: "Period 1", subject: "Advanced Mathematics", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
      { period: "Period 2", subject: "Physics Practical Lab", teacher: "Mr. Muhammad Bilal", room: "Physics Lab" },
      { period: "Period 3", subject: "Chemistry Practical Lab", teacher: "Ms. Fatima Zahra", room: "Chemistry Lab" },
      { period: "Recess Break", subject: "Friday Recess", teacher: "Staff", room: "Cafeteria", isBreak: true },
      { period: "Period 4", subject: "Matriculation Model Paper", teacher: "Mr. Farhan Saeed", room: "Hall A" },
      { period: "Period 5", subject: "Weekly Assessment & Board Tips", teacher: "Ms. Sana Tariq", room: "Hall A" },
    ],
    weekly_matrix: [
      {
        period: "Period 1",
        time: "08:00 AM - 08:45 AM",
        slots: {
          Monday: { subject: "Advanced Mathematics", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
          Tuesday: { subject: "Advanced Mathematics", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
          Wednesday: { subject: "Calculus & Geometry", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
          Thursday: { subject: "Board Exam Math Practice", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
          Friday: { subject: "Advanced Mathematics", teacher: "Ms. Sana Tariq", room: "Hall A", isIncharge: true },
        },
      },
      {
        period: "Period 2",
        time: "08:45 AM - 09:30 AM",
        slots: {
          Monday: { subject: "Chemistry (Theory)", teacher: "Ms. Fatima Zahra", room: "Hall A" },
          Tuesday: { subject: "Organic Chemistry", teacher: "Ms. Fatima Zahra", room: "Hall A" },
          Wednesday: { subject: "Chemistry (Theory)", teacher: "Ms. Fatima Zahra", room: "Hall A" },
          Thursday: { subject: "Chemistry Numericals", teacher: "Ms. Fatima Zahra", room: "Hall A" },
          Friday: { subject: "Physics Practical Lab", teacher: "Mr. Muhammad Bilal", room: "Physics Lab" },
        },
      },
      {
        period: "Period 3",
        time: "09:30 AM - 10:15 AM",
        slots: {
          Monday: { subject: "Physics (Theory)", teacher: "Mr. Muhammad Bilal", room: "Hall A" },
          Tuesday: { subject: "Physics Numericals", teacher: "Mr. Muhammad Bilal", room: "Hall A" },
          Wednesday: { subject: "Electromagnetism", teacher: "Mr. Muhammad Bilal", room: "Hall A" },
          Thursday: { subject: "Physics Past Papers", teacher: "Mr. Muhammad Bilal", room: "Hall A" },
          Friday: { subject: "Chemistry Practical Lab", teacher: "Ms. Fatima Zahra", room: "Chemistry Lab" },
        },
      },
      {
        period: "Break / Recess",
        time: "10:15 AM - 10:45 AM",
        isBreak: true,
        slots: {
          Monday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Tuesday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Wednesday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Thursday: { subject: "Senior Recess", teacher: "Duty Staff", room: "Cafeteria", isBreak: true },
          Friday: { subject: "Friday Recess", teacher: "Staff", room: "Cafeteria", isBreak: true },
        },
      },
      {
        period: "Period 4",
        time: "10:45 AM - 11:30 AM",
        slots: {
          Monday: { subject: "Biology / Computer Science", teacher: "Mr. Farhan Saeed", room: "Lab 2" },
          Tuesday: { subject: "Computer Programming / Bio Lab", teacher: "Mr. Farhan Saeed", room: "Lab 2" },
          Wednesday: { subject: "Biology / Computer Science", teacher: "Mr. Farhan Saeed", room: "Lab 2" },
          Thursday: { subject: "Algorithm Design / Genetics", teacher: "Mr. Farhan Saeed", room: "Lab 2" },
          Friday: { subject: "Matriculation Model Paper", teacher: "Mr. Farhan Saeed", room: "Hall A" },
        },
      },
      {
        period: "Period 5",
        time: "11:30 AM - 12:15 PM",
        slots: {
          Monday: { subject: "English Compulsory", teacher: "Mr. Tariq Mehmood", room: "Hall A" },
          Tuesday: { subject: "English Grammar", teacher: "Mr. Tariq Mehmood", room: "Hall A" },
          Wednesday: { subject: "English Composition", teacher: "Mr. Tariq Mehmood", room: "Hall A" },
          Thursday: { subject: "English Past Papers", teacher: "Mr. Tariq Mehmood", room: "Hall A" },
          Friday: { subject: "Weekly Assessment & Board Tips", teacher: "Ms. Sana Tariq", room: "Hall A" },
        },
      },
      {
        period: "Period 6",
        time: "12:15 PM - 01:00 PM",
        slots: {
          Monday: { subject: "Islamiat Compulsory", teacher: "Mr. Abdul Rehman", room: "Hall A" },
          Tuesday: { subject: "Pakistan Studies", teacher: "Mr. Abdul Rehman", room: "Hall A" },
          Wednesday: { subject: "Pakistan Studies (History)", teacher: "Mr. Abdul Rehman", room: "Hall A" },
          Thursday: { subject: "Islamiat & Quran Tafseer", teacher: "Mr. Abdul Rehman", room: "Hall A" },
          Friday: { subject: "Jummah Dismissal (12:30 PM)", teacher: "Staff", room: "Main Gate", isDismissal: true },
        },
      },
    ],
  },
];

export const timetableApi = {
  getSectionTimetables: async () => {
    if (USE_MOCK) {
      return [...SECTION_TIMETABLES];
    }
    try {
      const res = await client.get("/timetable/sections");
      return res.data;
    } catch {
      return [...SECTION_TIMETABLES];
    }
  },

  getByClass: async (classId) => {
    if (USE_MOCK) {
      const cls = SECTION_TIMETABLES.find((s) => s.id === parseInt(classId, 10));
      return cls ? [cls] : [];
    }
    try {
      const res = await client.get(`/timetable/class/${classId}`);
      return res.data;
    } catch {
      const cls = SECTION_TIMETABLES.find((s) => s.id === parseInt(classId, 10));
      return cls ? [cls] : [];
    }
  },

  getByTeacher: async (teacherId) => {
    if (USE_MOCK) {
      return [...SECTION_TIMETABLES];
    }
    try {
      const res = await client.get(`/timetable/teacher/${teacherId}`);
      return res.data;
    } catch {
      return [...SECTION_TIMETABLES];
    }
  },

  create: async (entry) => {
    if (USE_MOCK) {
      const newEntry = { id: Date.now(), ...entry };
      return newEntry;
    }
    const res = await client.post("/timetable", entry);
    return res.data;
  },

  update: async (id, entry) => {
    if (USE_MOCK) {
      return { id, ...entry };
    }
    const res = await client.put(`/timetable/${id}`, entry);
    return res.data;
  },

  delete: async (id) => {
    if (USE_MOCK) {
      return { success: true };
    }
    const res = await client.delete(`/timetable/${id}`);
    return res.data;
  },
};

export default timetableApi;
