import { parseISO, isValid, parse } from "date-fns";

/**
 * Safely parse a date from various formats
 * @param dateInput - The date input (string, number, or Date)
 * @returns Valid Date object or null
 */
export const safeParseDate = (dateInput: unknown): Date | null => {
  if (!dateInput) return null;
  
  try {
    // If it's already a Date object
    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : null;
    }
    
    // If it's a number (timestamp)
    if (typeof dateInput === "number") {
      const date = new Date(dateInput);
      return isValid(date) ? date : null;
    }
    
    // If it's a string
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (!trimmed) return null;
      
      // Try ISO format first
      if (trimmed.includes("T") || trimmed.includes("Z")) {
        const isoDate = parseISO(trimmed);
        if (isValid(isoDate)) return isoDate;
      }
      
      // Try common date formats
      const formats = [
        "yyyy-MM-dd",
        "dd.MM.yyyy",
        "MM/dd/yyyy",
        "dd/MM/yyyy",
        "yyyy/MM/dd",
        "yyyy-MM-dd HH:mm:ss",
        "dd.MM.yyyy HH:mm:ss"
      ];
      
      for (const format of formats) {
        try {
          const parsed = parse(trimmed, format, new Date());
          if (isValid(parsed)) return parsed;
        } catch {
          // Continue to next format
        }
      }
      
      // Try native Date constructor as last resort
      const nativeDate = new Date(trimmed);
      if (isValid(nativeDate)) return nativeDate;
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Safely parse an ISO date string
 * @param isoString - ISO date string
 * @returns Valid Date object or null
 */
export const safeParseISO = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  
  try {
    const date = parseISO(isoString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Check if a date is valid
 * @param date - Date to check
 * @returns boolean
 */
export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && isValid(date);
};