import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isSameDay, isValid } from "date-fns";
import { Upload, Calendar as CalendarIcon, FileText, AlertCircle, CheckCircle, Clock, Building2, TrendingUp, Download, Search, Filter } from "lucide-react";
import { createSampleExcelFile } from "@/utils/sampleData";
import { safeParseISO } from "@/utils/dateUtils";
import { readExcelFile } from "@/utils/excelUtils";

interface ContractData {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  restDays: number;
  laufzeit: number;
  abgelaufeneMonate: number;
}

export default function App() {
  const [rows, setRows] = useState<ContractData[]>([]);
  const [filteredStatus, setFilteredStatus] = useState("Alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const processedData = await readExcelFile(file);
      setRows(processedData);
      console.log("Excel data processed successfully:", processedData);
    } catch (err) {
      console.error("Error processing Excel file:", err);
      setError("Fehler beim Laden der Excel-Datei. Bitte überprüfen Sie das Format.");
    } finally {
      setIsLoading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  const getStatusBadge = (status: string, restDays: number) => {
    if (restDays <= 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Abgelaufen</Badge>;
    }
    if (restDays <= 30) {
      return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200"><Clock className="h-3 w-3" />Fällig</Badge>;
    }
    if (status === "online") {
      return <Badge variant="default" className="gap-1 bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3" />Online</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const filteredRows = rows.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filteredStatus === "Alle") return true;
    
    const due = safeParseISO(row.endDate);
    if (filteredStatus === "Fällig") return due && row.restDays > 0 && row.restDays <= 30;
    if (filteredStatus === "Abgelaufen") return due && row.restDays <= 0;
    if (filteredStatus === "Online") return row.status === "online" && row.restDays > 30;
    
    return true;
  });

  const getCalendarEvents = () => {
    return rows
      .filter((row) => row.endDate)
      .map((row) => {
        const date = safeParseISO(row.endDate);
        return date ? {
          date,
          title: row.name,
          isExpired: row.restDays <= 0,
          isDue: row.restDays > 0 && row.restDays <= 30,
        } : null;
      })
      .filter(Boolean) as Array<{
        date: Date;
        title: string;
        isExpired: boolean;
        isDue: boolean;
      }>;
  };

  const stats = {
    total: rows.length,
    online: rows.filter(r => r.status === "online" && r.restDays > 30).length,
    due: rows.filter(r => r.restDays > 0 && r.restDays <= 30).length,
    expired: rows.filter(r => r.restDays <= 0).length,
  };

  const filters = [
    { key: "Alle", label: "Alle Verträge", icon: FileText, count: stats.total },
    { key: "Online", label: "Online", icon: CheckCircle, count: stats.online },
    { key: "Fällig", label: "Fällig", icon: Clock, count: stats.due },
    { key: "Abgelaufen", label: "Abgelaufen", icon: AlertCircle, count: stats.expired },
  ];

  // Safe date formatting function
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    const date = safeParseISO(dateString);
    return date ? format(date, "dd.MM.yyyy") : "-";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Slide Panel */}
      <div className={`${isLeftPanelOpen ? 'w-96' : 'w-16'} transition-all duration-300 bg-white border-r border-gray-200 shadow-lg flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              {isLeftPanelOpen && (
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Contract Manager</h1>
                  <p className="text-sm text-gray-500">Vertragsmanagement</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="p-2"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Section */}
        {isLeftPanelOpen && (
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Kalender</h3>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-lg border border-gray-200"
            />
            
            {selectedDate && isValid(selectedDate) && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm text-gray-700">
                  {format(selectedDate, "dd.MM.yyyy")}:
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {getCalendarEvents()
                    .filter(event => isSameDay(event.date, selectedDate))
                    .map((event, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <div className={`w-2 h-2 rounded-full ${
                          event.isExpired 
                            ? 'bg-red-500' 
                            : event.isDue 
                              ? 'bg-amber-500' 
                              : 'bg-green-500'
                        }`}></div>
                        <span className="text-sm text-gray-700">{event.title}</span>
                      </div>
                    ))}
                  {getCalendarEvents().filter(event => isSameDay(event.date, selectedDate)).length === 0 && (
                    <p className="text-sm text-gray-500 italic">Keine Verträge an diesem Tag</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {isLeftPanelOpen && (
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Statistiken</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-blue-600">Gesamt</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                <div className="text-xs text-green-600">Online</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{stats.due}</div>
                <div className="text-xs text-amber-600">Fällig</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                <div className="text-xs text-red-600">Abgelaufen</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {isLeftPanelOpen && (
          <div className="p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filter</h3>
            </div>
            <div className="space-y-2">
              {filters.map((filter) => (
                <Button
                  key={filter.key}
                  variant={filteredStatus === filter.key ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setFilteredStatus(filter.key)}
                >
                  <div className="flex items-center gap-2">
                    <filter.icon className="h-4 w-4" />
                    {filter.label}
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {filter.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vertragsübersicht</h2>
              <p className="text-gray-500">
                {filteredRows.length} von {rows.length} Verträgen werden angezeigt
              </p>
              {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Verträge suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Label htmlFor="excel-upload" className="cursor-pointer">
                <Button variant="outline" className="gap-2" asChild disabled={isLoading}>
                  <div>
                    <Upload className="h-4 w-4" />
                    {isLoading ? "Laden..." : "Excel importieren"}
                  </div>
                </Button>
              </Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={createSampleExcelFile}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Sample Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vertragsdetails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Startdatum</TableHead>
                      <TableHead className="font-semibold">Enddatum</TableHead>
                      <TableHead className="font-semibold">Resttage</TableHead>
                      <TableHead className="font-semibold">Laufzeit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-gray-100 rounded-full">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {rows.length === 0 
                                  ? "Keine Daten vorhanden" 
                                  : "Keine Verträge gefunden"
                                }
                              </p>
                              <p className="text-sm text-gray-500">
                                {rows.length === 0 
                                  ? "Importieren Sie eine Excel-Datei um zu beginnen" 
                                  : "Versuchen Sie andere Filterkriterien"
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>
                            {getStatusBadge(row.status, row.restDays)}
                          </TableCell>
                          <TableCell>{formatDate(row.startDate)}</TableCell>
                          <TableCell>{formatDate(row.endDate)}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              row.restDays <= 0 
                                ? "text-red-600" 
                                : row.restDays <= 30 
                                  ? "text-amber-600" 
                                  : "text-green-600"
                            }`}>
                              {row.restDays > 0 ? `${row.restDays} Tage` : "Abgelaufen"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {row.laufzeit} {row.laufzeit === 1 ? "Monat" : "Monate"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}