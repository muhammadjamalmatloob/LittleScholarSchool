import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createStudent, updateStudent } from "../../api/students";
import { getClasses } from "../../api/classes";
import { X, Loader2, Save, Percent } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import {
  validateName,
  validatePhone,
  validateStudentDob,
} from "../../utils/validation";

const CONCESSION_PRESETS = [
  { label: "None (Standard Tuition)", value: "None", percent: 0 },
  { label: "Sibling Concession (25%)", value: "Sibling", percent: 25 },
  { label: "Kinship Concession (50%)", value: "Kinship", percent: 50 },
  { label: "Teacher / Staff Child (50%)", value: "Teacher Child", percent: 50 },
  { label: "Full Scholarship (100%)", value: "Full Scholarship", percent: 100 },
  { label: "Custom Concession", value: "Custom", percent: 0 },
];

export const StudentForm = ({ isOpen, onClose, onSuccess, initialStudent = null }) => {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    class_id: "",
    class_name: "",
    section: "A",
    date_of_birth: "",
    gender: "Male",
    parent_name: "",
    contact_number: "",
    email: "",
    address: "",
    city: "",
    admission_date: new Date().toISOString().split("T")[0],
    is_active: true,
    concession_type: "None",
    discount_percentage: 0,
    discount_amount: 0,
    notes: "",
  });

  useEffect(() => {
    getClasses()
      .then((data) => {
        setClasses(data || []);
        if (!initialStudent && data && data.length > 0 && !formData.class_id) {
          setFormData((prev) => ({
            ...prev,
            class_id: data[0].id,
            class_name: data[0].name,
            section: data[0].section || "A",
          }));
        }
      })
      .catch((err) => console.error("Error loading classes:", err));
  }, [initialStudent]);

  // Selected student pre-fill
  useEffect(() => {
    if (initialStudent) {
      setFormData({
        name: initialStudent.name || "",
        class_id: initialStudent.class_id || "",
        class_name: initialStudent.class_name?.replace(/\s*-\s*[^-]+$/, "") || "",
        section: initialStudent.section || "A",
        date_of_birth: initialStudent.date_of_birth || "",
        gender: (initialStudent.gender && String(initialStudent.gender).toLowerCase().startsWith("f")) ? "Female" : "Male",
        parent_name: initialStudent.parent_name || "",
        contact_number: initialStudent.contact_number || "",
        email: initialStudent.email || "",
        address: initialStudent.address || "",
        city: initialStudent.city || "",
        admission_date: initialStudent.admission_date || new Date().toISOString().split("T")[0],
        is_active: initialStudent.is_active !== undefined ? initialStudent.is_active : true,
        concession_type: initialStudent.concession_type || "None",
        discount_percentage: initialStudent.discount_percentage || 0,
        discount_amount: initialStudent.discount_amount || 0,
        notes: initialStudent.notes || "",
      });
    }
  }, [initialStudent]);

  if (!isOpen) return null;

  const classNames = [...new Set(classes.map((c) => c.name).filter(Boolean))];
  const sectionsForClass = classes
    .filter((c) => c.name === formData.class_name)
    .map((c) => c.section)
    .filter(Boolean);

  const handleClassChange = (className) => {
    const matchingClass = classes.find((c) => c.name === className);
    setFormData({
      ...formData,
      class_name: className,
      class_id: matchingClass?.id || "",
      section: matchingClass?.section || "A",
    });
  };

  const handleSectionChange = (newSection) => {
    const matchingClass = classes.find(
      (c) => c.name === formData.class_name && c.section?.toUpperCase() === newSection
    );
    setFormData({
      ...formData,
      class_id: matchingClass?.id || "",
      section: newSection,
    });
  };

  const handleConcessionChange = (presetValue) => {
    const preset = CONCESSION_PRESETS.find((p) => p.value === presetValue);
    setFormData((prev) => ({
      ...prev,
      concession_type: presetValue,
      discount_percentage: preset ? preset.percent : 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      const msg = "Student Full Name is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const nameValidation = validateName(formData.name, "Student Name");
    if (!nameValidation.isValid) {
      setError(nameValidation.message);
      toast.warning(nameValidation.message);
      return;
    }

    if (!formData.class_id) {
      const msg = "Please select an Assigned Class.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!formData.section) {
      const msg = "Please select an Assigned Section.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    // Date of Birth is strictly mandatory
    if (!formData.date_of_birth) {
      const msg = "Date of Birth is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const dobValidation = validateStudentDob(formData.date_of_birth, true);
    if (!dobValidation.isValid) {
      setError(dobValidation.message);
      toast.warning(dobValidation.message);
      return;
    }

    if (!formData.gender) {
      const msg = "Gender is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (!formData.parent_name?.trim()) {
      const msg = "Parent / Guardian Name is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const parentValidation = validateName(formData.parent_name, "Parent/Guardian Name");
    if (!parentValidation.isValid) {
      setError(parentValidation.message);
      toast.warning(parentValidation.message);
      return;
    }

    if (!formData.contact_number?.trim()) {
      const msg = "Contact Number is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const phoneValidation = validatePhone(formData.contact_number, true);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.message);
      toast.warning(phoneValidation.message);
      return;
    }

    if (!formData.address?.trim()) {
      const msg = "Residential Address is required.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (
      formData.concession_type === "Custom" &&
      (isNaN(formData.discount_percentage) || formData.discount_percentage <= 0)
    ) {
      const msg = "Please enter a valid custom concession discount percentage (> 0%).";
      setError(msg);
      toast.warning(msg);
      return;
    }

    // Email is strictly OPTIONAL - only validated if entered
    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      const emailErr = "Please enter a valid email address.";
      setError(emailErr);
      toast.warning(emailErr);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name.trim(),
        class_id: parseInt(formData.class_id, 10),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        parent_name: formData.parent_name ? formData.parent_name.trim() : null,
        contact_number: formData.contact_number ? formData.contact_number.trim() : null,
        email: formData.email ? formData.email.trim() : null,
        address: formData.address ? formData.address.trim() : null,
        city: formData.city ? formData.city.trim() : null,
        admission_date: formData.admission_date || null,
        is_active: formData.is_active,
        concession_type: formData.concession_type || "None",
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        discount_amount: parseFloat(formData.discount_amount) || 0,
        notes: formData.notes ? formData.notes.trim() : null,
      };

      let savedStudent;
      if (initialStudent?.id) {
        savedStudent = await updateStudent(initialStudent.id, payload);
        toast.success(`Updated student record for "${payload.name}"`);
      } else {
        savedStudent = await createStudent(payload);
        toast.success(`Successfully enrolled "${payload.name}"!`);
      }

      onSuccess(savedStudent, Boolean(initialStudent));
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to save student record.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-8 shadow-2xl">
        {/* Simple Typography Header */}
        <div className="px-6 sm:px-7 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {initialStudent ? "Edit Student Record" : "Enroll New Student"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {initialStudent
                ? `Updating student #${initialStudent.formatted_roll_number || initialStudent.roll_number || initialStudent.id}`
                : "Assign class, section, fee concession, and student details"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Ayaan Ahmed"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {/* Compact Read-Only Assigned Roll Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roll Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={initialStudent?.formatted_roll_number || "Assigned automatically"}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-mono cursor-not-allowed select-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  Auto
                </span>
              </div>
            </div>

            {/* Assigned Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Class *
              </label>
              <select
                required
                value={formData.class_name}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              >
                <option value="">Select a class</option>
                {classNames.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Section *
              </label>
              <select
                value={formData.section}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              >
                {sectionsForClass.map((section) => (
                  <option key={section} value={section.toUpperCase()}>
                    Section {section.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Date of Birth - Mandatory */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gender *
              </label>
              <select
                required
                value={String(formData.gender || "").toLowerCase().startsWith("f") ? "Female" : "Male"}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Parent / Guardian Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Parent / Guardian Name *
              </label>
              <input
                type="text"
                required
                value={formData.parent_name}
                onChange={(e) =>
                  setFormData({ ...formData, parent_name: e.target.value })
                }
                placeholder="e.g. Tariq Mahmood"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {/* Emergency Contact Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Number *
              </label>
              <input
                type="text"
                required
                value={formData.contact_number}
                onChange={(e) =>
                  setFormData({ ...formData, contact_number: e.target.value })
                }
                placeholder="e.g. 03001234567"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {/* Fee Concession Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Fee Concession Category *</span>
                <span className="text-[10px] text-blue-600 font-bold">Policy</span>
              </label>
              <select
                required
                value={formData.concession_type}
                onChange={(e) => handleConcessionChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              >
                {CONCESSION_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Custom Discount Input (only visible if Custom Concession is chosen) */}
            {formData.concession_type === "Custom" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Concession Discount (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.discount_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                      })
                    }
                    placeholder="e.g. 15"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            )}

            {/* Email Address (STRICTLY OPTIONAL) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-[10px] text-slate-400 font-semibold">(Optional)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Optional - e.g. student@littlescholar.edu.pk"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Residential Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="e.g. House 45, Gulshan Block, Allama Iqbal Town, Lahore"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{initialStudent ? "Save Changes" : "Confirm Enrollment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default StudentForm;
