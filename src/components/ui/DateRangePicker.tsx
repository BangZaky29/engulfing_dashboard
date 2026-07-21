import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className,
  placeholder = 'dd/mm/yyyy'
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary state for the picker before hitting "OK"
  const [tempStart, setTempStart] = useState<Date | null>(dateFrom ? parseISO(dateFrom) : null);
  const [tempEnd, setTempEnd] = useState<Date | null>(dateTo ? parseISO(dateTo) : null);

  // Month currently being viewed in the calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(dateFrom ? parseISO(dateFrom) : new Date());

  // Reset temp state when opening
  useEffect(() => {
    if (isOpen) {
      const s = dateFrom ? parseISO(dateFrom) : null;
      const e = dateTo ? parseISO(dateTo) : null;
      setTempStart(s);
      setTempEnd(e);
      if (s) setCurrentMonth(s);
    }
  }, [isOpen, dateFrom, dateTo]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day: Date) => {
    if (!tempStart) {
      setTempStart(day);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (isBefore(day, tempStart)) {
        setTempStart(day);
        setTempEnd(null);
      } else {
        setTempEnd(day);
      }
    } else {
      setTempStart(day);
      setTempEnd(null);
    }
  };

  const handleApply = () => {
    const fromStr = tempStart ? format(tempStart, 'yyyy-MM-dd') : '';
    const toStr = tempEnd ? format(tempEnd, 'yyyy-MM-dd') : (tempStart ? format(tempStart, 'yyyy-MM-dd') : '');
    onChange(fromStr, toStr);
    setIsOpen(false);
  };

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayClass = (day: Date) => {
    const isSelectedStart = tempStart && isSameDay(day, tempStart);
    const isSelectedEnd = tempEnd && isSameDay(day, tempEnd);
    const isSelected = isSelectedStart || isSelectedEnd;

    let isBetween = false;
    if (tempStart && tempEnd && !isSameDay(tempStart, tempEnd)) {
      isBetween = isAfter(day, tempStart) && isBefore(day, tempEnd);
    }

    const isCurrentMonth = isSameMonth(day, currentMonth);

    return cn(
      "h-8 flex items-center justify-center text-sm transition-colors cursor-pointer z-10 relative",
      !isCurrentMonth && "text-slate-600",
      isCurrentMonth && !isSelected && !isBetween && "text-slate-300 hover:bg-slate-700 rounded-full",
      isSelected && "bg-blue-500 text-white font-medium hover:bg-blue-600 rounded-full shadow-lg",
      isBetween && "text-blue-300",
      !isCurrentMonth && isBetween && "text-slate-500" // duller if outside month but in range
    );
  };

  // Rendering background for "between" days separately to avoid border-radius clipping issues
  const getBetweenBgClass = (day: Date) => {
    let isBetween = false;
    if (tempStart && tempEnd && !isSameDay(tempStart, tempEnd)) {
      isBetween = isAfter(day, tempStart) && isBefore(day, tempEnd);
    }
    const isSelectedStart = tempStart && isSameDay(day, tempStart) && tempEnd && !isSameDay(tempStart, tempEnd);
    const isSelectedEnd = tempEnd && isSameDay(day, tempEnd) && tempStart && !isSameDay(tempStart, tempEnd);

    return cn(
      "absolute inset-y-0 w-full z-0",
      isBetween && "bg-blue-500/20",
      isSelectedStart && "bg-blue-500/20 rounded-l-full left-1/2 w-1/2",
      isSelectedEnd && "bg-blue-500/20 rounded-r-full right-1/2 w-1/2"
    );
  };

  const displayFormat = 'dd/MM/yyyy';
  const displayText = dateFrom && dateTo
    ? (dateFrom === dateTo ? format(parseISO(dateFrom), displayFormat) : `${format(parseISO(dateFrom), displayFormat)} - ${format(parseISO(dateTo), displayFormat)}`)
    : '';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 min-w-[200px] h-[38px]",
          className
        )}
      >
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
          {displayText || <span className="text-slate-500">{placeholder}</span>}
        </span>
        {displayText && (
          <X
            className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 ml-1 cursor-pointer shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange('', ''); }}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 p-4 bg-[#23272e] border border-white/10 rounded-xl shadow-2xl shadow-black w-[320px] left-0 sm:left-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold uppercase tracking-wide text-sm pl-2">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-y-2 mb-2 text-center text-xs font-medium text-slate-400">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 justify-items-stretch mb-6">
              {days.map((day, i) => (
                <div key={i} className="relative w-full flex justify-center py-0.5">
                  <div className={getBetweenBgClass(day)} />
                  <div
                    onClick={() => handleDayClick(day)}
                    className={cn(getDayClass(day), "w-8")}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-6 pr-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-blue-500 hover:text-blue-400 text-sm font-semibold tracking-wide"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="text-blue-500 hover:text-blue-400 text-sm font-semibold tracking-wide"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
