import { useEffect, useState } from "react";
import { X, UserPlus, Save } from "lucide-react";
import { teacherService } from "../../services/api";
import { GlassButton } from "../../components/ui/GlassButton";
import { useToast } from "../../context/ToastContext";
import { validateName, validatePhone, validateAmount } from "../../utils/validation";

const emptyForm = {
  full_name: "",
  email: "",
  phone_number: "",
  date_of_birth: "",
  gender: "",
  qualification: "",
  specialization: "",
  date_of_joining: "",
  salary: "",
  total_periods_per_week: 30,
  bank_account: "",
  bank_name: "",
  address: "",
  city: "",
  notes: "",
};

const fields = [
  ["full_name", "Full Name", "text", true],
  ["email", "Email Address", "email", true],
  ["phone_number", "Phone Number", "tel", false],
  ["date_of_birth", "Date of Birth", "date", false],
  ["qualification", "Highest Qualification", "text", true],
  ["specialization", "Specialization / Subject", "text", false],
  ["date_of_joining", "Joining Date", "date", false],
  ["salary", "Monthly Salary (Rs.)", "number", false],
  ["total_periods_per_week", "Periods / Week", "number", false],
  ["bank_account", "Bank Account #", "text", false],
  ["bank_name", "Bank Name", "text", false],
  ["city", "City", "text", false],
];

export const TeacherForm = ({ isOpen, onClose, onSuccess, initialTeacher = null }) => {
  const toast = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialTeacher
        ? Object.fromEntries(
            Object.keys(emptyForm).map((key) => [key, initialTeacher[key] ?? ""])
          )
        : emptyForm
    );
    setError("");
  }, [isOpen, initialTeacher]);

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nameValidation = validateName(formData.full_name, "Full Name");
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      toast.warning(nameValidation.error);
      return;
    }

    if (!formData.qualification?.trim()) {
      const qErr = "Qualification is required.";
      setError(qErr);
      toast.warning(qErr);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      const emailErr = "Please enter a valid email address.";
      setError(emailErr);
      toast.warning(emailErr);
      return;
    }

    if (formData.phone_number) {
      const phoneValidation = validatePhone(formData.phone_number, false);
      if (!phoneValidation.valid) {
        setError(phoneValidation.error);
        toast.warning(phoneValidation.error);
        return;
      }
    }

    if (formData.salary !== "" && formData.salary !== null && formData.salary !== undefined) {
      const salaryVal = validateAmount(formData.salary, "Monthly Salary", 0, 10000000);
      if (!salaryVal.valid) {
        setError(salaryVal.error);
        toast.warning(salaryVal.error);
        return;
      }
    }

    if (formData.total_periods_per_week !== "" && formData.total_periods_per_week !== null && formData.total_periods_per_week !== undefined) {
      const periods = Number(formData.total_periods_per_week);
      if (isNaN(periods) || periods < 1 || periods > 60) {
        const periodErr = "Periods per week must be between 1 and 60.";
        setError(periodErr);
        toast.warning(periodErr);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") payload[key] = null;
      });
      if (payload.salary !== null) payload.salary = Number(payload.salary);
      if (payload.total_periods_per_week !== null) {
        payload.total_periods_per_week = Number(payload.total_periods_per_week);
      }

      if (initialTeacher) {
        await teacherService.update(initialTeacher.id, payload);
        toast.success(`Updated teacher record for ${payload.full_name}.`);
      } else {
        await teacherService.create(payload);
        toast.success(`Teacher ${payload.full_name} added successfully!`);
      }
      onSuccess();
      onClose();
    } catch (requestError) {
      const msg = requestError.response?.data?.detail || "Failed to save teacher record.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Pinned Clean Typography Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialTeacher ? "Edit Faculty Profile" : "Register New Faculty Member"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Teacher code and portal access credentials generated upon saving.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl text-xs text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(([name, label, type, required]) => (
              <label key={name} className="block">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {label}{required ? " *" : ""}
                </span>
                <input
                  name={name}
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  required={required}
                  value={formData[name]}
                  onChange={updateField}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
                />
              </label>
            ))}
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Gender</span>
              <select
                name="gender"
                value={formData.gender}
                onChange={updateField}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Residential Address</span>
            <textarea
              name="address"
              value={formData.address}
              onChange={updateField}
              rows={2}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium resize-none transition"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Administrative Notes</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={updateField}
              rows={2}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium resize-none transition"
            />
          </label>
        </div>

        {/* Pinned Action Buttons Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <GlassButton
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-sm px-4"
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            loading={loading}
            icon={Save}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 shadow-sm shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer"
          >
            Save Faculty Profile
          </GlassButton>
        </div>
      </form>
    </div>
  );
};
