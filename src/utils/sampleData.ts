import * as XLSX from "xlsx";

export const createSampleExcelFile = () => {
  const sampleData = [
    {
      Name: "Microsoft Office 365",
      Status: "online",
      Startdatum: "2024-01-01",
      "Laufzeit in M": 12,
    },
    {
      Name: "Adobe Creative Cloud",
      Status: "online", 
      Startdatum: "2024-02-15",
      "Laufzeit in M": 6,
    },
    {
      Name: "Slack Enterprise",
      Status: "online",
      Startdatum: "2023-12-01",
      "Laufzeit in M": 24,
    },
    {
      Name: "Zoom Pro",
      Status: "online",
      Startdatum: "2024-03-01",
      "Laufzeit in M": 12,
    },
    {
      Name: "Salesforce CRM",
      Status: "online",
      Startdatum: "2023-11-15",
      "Laufzeit in M": 36,
    },
    {
      Name: "AWS Services",
      Status: "online",
      Startdatum: "2024-01-20",
      "Laufzeit in M": 12,
    },
    {
      Name: "Google Workspace",
      Status: "online",
      Startdatum: "2023-10-01",
      "Laufzeit in M": 12,
    },
    {
      Name: "DocuSign",
      Status: "online",
      Startdatum: "2024-02-01",
      "Laufzeit in M": 6,
    },
    {
      Name: "Webex",
      Status: "online",
      Startdatum: "2023-09-15",
      "Laufzeit in M": 12,
    },
    {
      Name: "Dropbox Business",
      Status: "online",
      Startdatum: "2024-01-10",
      "Laufzeit in M": 24,
    },
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  
  // Create blob and download
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-contracts.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};