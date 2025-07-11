import * as XLSX from "xlsx";
import { addMonths, differenceInDays, differenceInMonths } from "date-fns";



interface ProcessedContractData {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  restDays: number;
  laufzeit: number;
  abgelaufeneMonate: number;
}

/**
 * Parse Excel date value to a proper Date object
 */
function parseExcelDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    // If it's a number (Excel serial date)
    if (typeof dateValue === "number") {
      // Excel dates are stored as days since 1900-01-01 (with some quirks)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }

    // If it's a string
    if (typeof dateValue === "string") {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;

      // Try different date formats
      const formats = [
        // ISO format
        /^\d{4}-\d{2}-\d{2}$/,
        // German format
        /^\d{2}\.\d{2}\.\d{4}$/,
        // US format
        /^\d{2}\/\d{2}\/\d{4}$/,
      ];

      // Try ISO format first
      if (formats[0].test(trimmed)) {
        const date = new Date(trimmed + "T00:00:00");
        return isNaN(date.getTime()) ? null : date;
      }

      // Try German format (dd.mm.yyyy)
      if (formats[1].test(trimmed)) {
        const [day, month, year] = trimmed.split(".");
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return isNaN(date.getTime()) ? null : date;
      }

      // Try US format (mm/dd/yyyy)
      if (formats[2].test(trimmed)) {
        const [month, day, year] = trimmed.split("/");
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return isNaN(date.getTime()) ? null : date;
      }

      // Try native Date parsing as fallback
      const nativeDate = new Date(trimmed);
      return isNaN(nativeDate.getTime()) ? null : nativeDate;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Process Excel data into contract format
 */
export function processExcelData(data: Record<string, unknown>[]): ProcessedContractData[] {
  return data.map((item: Record<string, unknown>, index: number) => {
    // Parse start date
    const startDate = parseExcelDate(item["Startdatum"]);
    
    // Parse duration in months
    const durationMonths = typeof item["Laufzeit in M"] === "string" 
      ? parseInt(item["Laufzeit in M"]) || 0
      : Number(item["Laufzeit in M"]) || 0;

    // Calculate end date
    const endDate = startDate ? addMonths(startDate, durationMonths) : null;

    // Calculate remaining days
    const restDays = endDate ? differenceInDays(endDate, new Date()) : 0;

    // Calculate elapsed months
    const abgelaufeneMonate = startDate ? differenceInMonths(new Date(), startDate) : 0;

    return {
      id: index + 1,
      name: String(item.Name || "Unbenannt"),
      status: String(item.Status || "online"),
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
      restDays,
      laufzeit: durationMonths,
      abgelaufeneMonate: Math.max(0, abgelaufeneMonate),
    };
  });
}

/**
 * Read and process Excel file
 */
export function readExcelFile(file: File): Promise<ProcessedContractData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        
        // Process the data
        const processedData = processExcelData(jsonData);
        
        resolve(processedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsBinaryString(file);
  });
}