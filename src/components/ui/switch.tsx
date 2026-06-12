import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ checked = false, className, disabled, onCheckedChange, ...props }: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted p-0.5 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className
      )}
      data-state={checked ? "checked" : "unchecked"}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(!checked);
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
