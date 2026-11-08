/**
 * System-Wide Input Validation Utilities
 * Enforces business rules and constraints across frontend forms
 * All functions return both { isValid, valid, message, error } for 100% API compatibility
 */

// Course / Subject enrollment limit: max 100 students
export const validateEnrollmentLimit = (limit) => {
  if (limit === undefined || limit === null || limit === "") {
    const msg = "Enrollment limit is required.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const num = Number(limit);
  if (isNaN(num) || !Number.isInteger(num)) {
    const msg = "Enrollment limit must be an integer.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num < 1) {
    const msg = "Enrollment limit must be at least 1 student.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num > 100) {
    const msg = "Enrollment limit cannot exceed maximum 100 students.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Course code validator (e.g. MTH-101, SCI-901)
export const validateCourseCode = (code) => {
  if (!code || typeof code !== "string" || code.trim() === "") {
    const msg = "Course code is required.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const trimmed = code.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    const msg = "Course code must be between 2 and 20 characters.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Class capacity validation (1 to 100 students per section)
export const validateClassCapacity = (capacity) => {
  if (capacity === undefined || capacity === null || capacity === "") {
    const msg = "Class capacity is required.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const num = Number(capacity);
  if (isNaN(num) || !Number.isInteger(num)) {
    const msg = "Capacity must be a valid integer.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num < 1) {
    const msg = "Capacity must be at least 1 student.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num > 100) {
    const msg = "Class enrollment limit cannot exceed maximum 100 students.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Full name validator (letters, spaces, dots, hyphens)
export const validateName = (name, fieldName = "Name") => {
  if (!name || typeof name !== "string" || name.trim() === "") {
    const msg = `${fieldName} is required.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    const msg = `${fieldName} must be at least 2 characters long.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (trimmed.length > 100) {
    const msg = `${fieldName} cannot exceed 100 characters.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    const msg = `${fieldName} can only contain letters, spaces, dots, and hyphens.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Phone number validator (Standard Pakistani mobile format 03XXXXXXXXX or 11 digits)
export const validatePhone = (phone, isRequired = true) => {
  if (!phone || phone.trim() === "") {
    if (!isRequired) return { isValid: true, valid: true, message: "", error: "" };
    const msg = "Contact phone number is required.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const cleaned = phone.replace(/[\s-]/g, "");
  if (!/^03\d{9}$/.test(cleaned) && !/^\+923\d{9}$/.test(cleaned)) {
    const msg = "Phone number must be a valid 11-digit mobile number (e.g., 03001234567).";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Positive currency / fee amount
export const validateAmount = (amount, fieldName = "Amount", min = 1, max = 10000000) => {
  if (amount === undefined || amount === null || amount === "") {
    const msg = `${fieldName} is required.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const num = Number(amount);
  if (isNaN(num)) {
    const msg = `${fieldName} must be a valid number.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num < min) {
    const msg = `${fieldName} must be at least Rs. ${min}.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (num > max) {
    const msg = `${fieldName} cannot exceed Rs. ${max.toLocaleString()}.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Fee discount validation
export const validateDiscount = (discount, totalAmount) => {
  const num = Number(discount || 0);
  if (isNaN(num) || num < 0) {
    const msg = "Discount cannot be negative.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (totalAmount !== undefined && totalAmount !== null) {
    const total = Number(totalAmount);
    if (num > total) {
      const msg = `Discount (Rs. ${num}) cannot exceed total fee (Rs. ${total}).`;
      return { isValid: false, valid: false, message: msg, error: msg };
    }
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Exam Marks Validation
export const validateExamMarks = (obtained, maxMarks = 100) => {
  const obt = Number(obtained);
  const max = Number(maxMarks);
  if (isNaN(obt) || isNaN(max)) {
    const msg = "Marks must be numeric values.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (max <= 0) {
    const msg = "Maximum marks must be greater than 0.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (obt < 0) {
    const msg = "Obtained marks cannot be negative.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (obt > max) {
    const msg = `Obtained marks (${obt}) cannot exceed maximum marks (${max}).`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};

// Date of Birth validation for school students
export const validateStudentDob = (dobString, isRequired = true) => {
  if (!dobString) {
    if (!isRequired) return { isValid: true, valid: true, message: "", error: "" };
    const msg = "Date of Birth is required.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    const msg = "Invalid date format.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  const now = new Date();
  const age = (now - dob) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 2.5) {
    const msg = "Student must be at least 2.5 years of age.";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  if (age > 25) {
    const msg = "Student age exceeds normal school range (maximum 25 years).";
    return { isValid: false, valid: false, message: msg, error: msg };
  }
  return { isValid: true, valid: true, message: "", error: "" };
};
