"use client";

import { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

dayjs.extend(customParseFormat);

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? dayjs(value).format("DD.MM.YYYY") : ""
  );

  useEffect(() => {
    setInputValue(value ? dayjs(value).format("DD.MM.YYYY") : "");
  }, [value]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d.]/g, "");

    // Auto-insert dots after day and month
    if (/^\d{2}$/.test(raw) && !inputValue.endsWith(".")) raw += ".";
    if (/^\d{2}\.\d{2}$/.test(raw) && !inputValue.endsWith(".")) raw += ".";

    setInputValue(raw);

    const parsed = dayjs(raw, "DD.MM.YYYY", true);
    if (parsed.isValid() && !parsed.isAfter(dayjs())) {
      onChange(parsed.format("YYYY-MM-DD"));
    }
  }

  function handleInputBlur() {
    const parsed = dayjs(inputValue, "DD.MM.YYYY", true);
    if (!parsed.isValid() || parsed.isAfter(dayjs())) {
      // Reset to last valid value
      setInputValue(value ? dayjs(value).format("DD.MM.YYYY") : "");
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      onChange(dayjs(date).format("YYYY-MM-DD"));
      setOpen(false);
    }
  }

  const selected = value ? dayjs(value).toDate() : undefined;

  return (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        placeholder="TT.MM.JJJJ"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        maxLength={10}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base sm:text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
            aria-label="Kalender öffnen"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleCalendarSelect}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(1980, 0)}
            endMonth={new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
