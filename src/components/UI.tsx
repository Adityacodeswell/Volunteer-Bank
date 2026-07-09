import React from "react";
import { motion } from "motion/react";
import { Lock, Loader2 } from "lucide-react";

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses = "relative px-4 py-2 rounded-xl font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan duration-150 inline-flex items-center justify-center gap-2 cursor-pointer";
  
  const variantClasses = {
    primary: "bg-navy hover:bg-deep text-white shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed",
    secondary: "bg-aqua/20 hover:bg-aqua/30 text-deep border border-aqua/30 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50",
    danger: "bg-coral text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-deep/70">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
          error ? "border-coral focus:ring-coral" : "border-slate-200 focus:border-cyan focus:ring-cyan/30"
        } text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-150 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-coral font-medium">{error}</span>}
    </div>
  );
};

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-deep/70">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
          error ? "border-coral focus:ring-coral" : "border-slate-200 focus:border-cyan focus:ring-cyan/30"
        } text-sm text-slate-800 focus:outline-none focus:ring-4 transition-all duration-150 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-coral font-medium">{error}</span>}
    </div>
  );
};

// --- TEXTAREA ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-deep/70">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
          error ? "border-coral focus:ring-coral" : "border-slate-200 focus:border-cyan focus:ring-cyan/30"
        } text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-150 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-coral font-medium">{error}</span>}
    </div>
  );
};

// --- CHIP / TAG ---
interface ChipProps {
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  isSelected = false,
  onClick,
  onRemove,
  className = ""
}) => {
  const isClickable = !!onClick;
  return (
    <span
      onClick={isClickable ? onClick : undefined}
      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 ${
        isSelected
          ? "bg-cyan text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      } ${isClickable ? "cursor-pointer" : ""} ${className}`}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-current hover:opacity-75 focus:outline-none"
        >
          &times;
        </button>
      )}
    </span>
  );
};

// --- STATUS BADGE ---
type BadgeStatus = "active" | "inactive" | "pending" | "todo" | "in_progress" | "done" | "high" | "medium" | "low" | "open" | "completed" | "cancelled";

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, className = "" }) => {
  const text = label || {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending Approval",
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
    high: "Urgent Priority",
    medium: "Medium Priority",
    low: "Low Priority",
    open: "Open",
    completed: "Completed",
    cancelled: "Cancelled"
  }[status];

  const colorMap = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    done: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-sky-50 text-sky-700 border-sky-200",
    open: "bg-sky-50 text-sky-700 border-sky-200",
    
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
    low: "bg-slate-100 text-slate-500 border-slate-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
    todo: "bg-slate-100 text-slate-500 border-slate-200",
    
    high: "bg-rose-50 text-coral border-rose-200",
  }[status] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorMap} ${className}`}>
      {text}
    </span>
  );
};

// --- CARD ---
interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerAction?: React.ReactNode;
  id?: string;
  glass?: "light" | "dark" | "none";
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = "",
  headerAction,
  id,
  glass = "none"
}) => {
  const glassClasses = {
    none: "bg-white border-slate-100 text-slate-800",
    light: "bg-white/45 backdrop-blur-md border border-white/50 shadow-lg text-[#1B4965]",
    dark: "bg-white/10 backdrop-blur-md border border-white/15 shadow-lg text-white"
  }[glass];

  return (
    <div id={id} className={`rounded-xl p-6 transition-all duration-300 ${glassClasses} ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className={`flex justify-between items-start gap-4 mb-5 border-b pb-4 ${glass === "dark" ? "border-white/10" : "border-slate-100"}`}>
          <div>
            {title && <h3 className={`font-serif font-semibold text-lg tracking-tight ${glass === "dark" ? "text-white" : "text-[#023E8A]"}`}>{title}</h3>}
            {subtitle && <p className={`text-xs mt-0.5 ${glass === "dark" ? "text-slate-300" : "text-slate-400"}`}>{subtitle}</p>}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

// --- AVATAR ---
interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = "md", className = "" }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Pick background color based on name hash
  const colors = [
    "bg-deep text-white",
    "bg-navy text-white",
    "bg-cyan text-white",
    "bg-aqua text-deep font-semibold"
  ];
  const charSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colorClass = colors[charSum % colors.length];

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg font-semibold"
  }[size];

  return (
    <div className={`${sizeClasses} ${colorClass} rounded-full flex items-center justify-center shrink-0 shadow-xs border border-white/20 select-none ${className}`}>
      {initials}
    </div>
  );
};

// --- EMPTY STATE ---
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 py-12 rounded-xl border border-dashed border-slate-200 bg-white/50 ${className}`}>
      {icon && <div className="text-slate-400 mb-4 bg-slate-50 p-3 rounded-full">{icon}</div>}
      <h4 className="font-serif font-bold text-deep text-base mb-1.5">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md"
}) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl"
  }[size];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-deep/40 backdrop-blur-xs transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Container */}
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        className={`bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-100 overflow-hidden w-full ${sizeClass} z-10 max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-50 shrink-0">
          <h3 className="font-serif font-semibold text-lg text-deep tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-medium focus:outline-none w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- SIDEBAR NAV ITEM ---
interface SidebarNavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isLocked?: boolean;
  onClick: () => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  label,
  icon,
  isActive = false,
  isLocked = false,
  onClick
}) => {
  return (
    <button
      disabled={isLocked}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
        isLocked 
          ? "opacity-40 cursor-not-allowed text-slate-400"
          : isActive
            ? "bg-navy text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 shrink-0 flex items-center justify-center ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
          {icon}
        </span>
        <span className="text-left leading-none">{label}</span>
      </div>
      {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
    </button>
  );
};
