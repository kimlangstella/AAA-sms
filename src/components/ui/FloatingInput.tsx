import { InputHTMLAttributes } from "react";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingInput({ label, ...props }: FloatingInputProps) {
  return (
    <div className="relative">
      {/* Label */}
      <span
        className="
          absolute -top-2.5 left-4
          bg-white px-2
          text-xs font-medium text-indigo-500
        "
      >
        {label}
      </span>

      {/* Input */}
      <input
        {...props}
        disabled={false}
        className="
          w-full
          rounded-full
          border border-indigo-300
          bg-white
          text-slate-900
          px-4 py-3 text-sm

          focus:outline-none
          focus:ring-2 focus:ring-indigo-500
          focus:border-indigo-500

          disabled:bg-white
          disabled:text-slate-900
          disabled:opacity-100
        "
      />
    </div>
  );
}
