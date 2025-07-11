import { useState } from "react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import {
  format,
  differenceInDays,
  addMonths,
  differenceInMonths,
  isSameDay,
  isValid,
} from "date-fns";
import { 
  Upload, 
  Calendar as CalendarIcon, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Building2,
  TrendingUp,
  Download
} from "lucide-react";
import { createSampleExcelFile } from "@/utils/sampleData";
import { safeParseDate, safeParseISO, isValidDate } from "@/utils/dateUtils";

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

interface RawExcelData {
  [key: string]: unknown;
}

export default function App() {
  const [rows, setRows] = useState<ContractData[]>([]);
  const [rawExcelData, setRawExcelData] = useState<RawExcelData[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [filteredStatus, setFilteredStatus] = useState("Alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

      // Store raw Excel data
      setRawExcelData(data);
      
      // Extract headers from first row
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setExcelHeaders(headers);
      }

      // Process data for the contract view
      const formatted = data.map((item: Record<string, unknown>, index: number) => {
        // Safely parse the start date
        const startDate = safeParseDate(item["Startdatum"]);
        const durationMonths = Number(item["Laufzeit in M"]) || 0;

        // Calculate end date only if start date is valid
        const endDate = startDate && isValidDate(startDate)
          ? addMonths(startDate, durationMonths)
          : null;

        // Calculate remaining days
        const restDays = endDate && isValidDate(endDate)
          ? differenceInDays(endDate, new Date())
          : 0;

        // Calculate elapsed months
        const abgelaufeneMonate = startDate && isValidDate(startDate)
          ? differenceInMonths(new Date(), startDate)
          : 0;

        return {
          id: index + 1,
          name: (item.Name as string) || "Unbenannt",
          status: (item.Status as string) || "online",
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
          restDays,
          laufzeit: durationMonths,
          abgelaufeneMonate,
        };
      });

      setRows(formatted);
    };

    reader.readAsBinaryString(file);
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

  // Get headers starting from column 4 (index 3)
  const getHeadersFromColumn4 = () => {
    return excelHeaders.slice(3);
  };

  // Get raw data starting from column 4
  const getRawDataFromColumn4 = () => {
    return rawExcelData.map((row) => {
      const values: unknown[] = [];
      excelHeaders.slice(3).forEach((header) => {
        values.push(row[header]);
      });
      return values;
    });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50/40">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b bg-white">
            <div className="flex items-center gap-2 px-4 py-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold">Contract Manager</h1>
                <p className="text-sm text-muted-foreground">Vertragsmanagement</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-gray-500 px-3 pb-2">
                Filter
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filters.map((filter) => (
                    <SidebarMenuItem key={filter.key}>
                      <SidebarMenuButton
                        isActive={filteredStatus === filter.key}
                        onClick={() => setFilteredStatus(filter.key)}
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <filter.icon className="h-4 w-4" />
                          {filter.label}
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {filter.count}
                        </Badge>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="my-4" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-gray-500 px-3 pb-2">
                Statistiken
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-3">
                <div className="grid grid-cols-2 gap-2">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-lg font-semibold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Gesamt</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-lg font-semibold">{stats.due + stats.expired}</p>
                        <p className="text-xs text-muted-foreground">Kritisch</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Vertragsübersicht</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Input
                  placeholder="Verträge suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Label htmlFor="excel-upload" className="cursor-pointer">
                <Button variant="outline" className="gap-2" asChild>
                  <div>
                    <Upload className="h-4 w-4" />
                    Excel importieren
                  </div>
                </Button>
              </Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
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
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Vertragsdetails
                    </CardTitle>
                    <CardDescription>
                      {filteredRows.length} von {rows.length} Verträgen werden angezeigt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="processed" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="processed">Vertragsübersicht</TabsTrigger>
                        <TabsTrigger value="raw">Rohdaten ab Spalte 4</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="processed" className="space-y-4">
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50/60">
                                <TableHead className="font-medium">Name</TableHead>
                                <TableHead className="font-medium">Status</TableHead>
                                <TableHead className="font-medium">Startdatum</TableHead>
                                <TableHead className="font-medium">Enddatum</TableHead>
                                <TableHead className="font-medium">Resttage</TableHead>
                                <TableHead className="font-medium">Laufzeit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {rows.length === 0 
                                      ? "Keine Daten vorhanden. Importieren Sie eine Excel-Datei."
                                      : "Keine Verträge gefunden."
                                    }
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredRows.map((row) => (
                                  <TableRow key={row.id} className="hover:bg-gray-50/60">
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
                      </TabsContent>
                      
                      <TabsContent value="raw" className="space-y-4">
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50/60">
                                {getHeadersFromColumn4().map((header, index) => (
                                  <TableHead key={index} className="font-medium">
                                    {header}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getRawDataFromColumn4().length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={getHeadersFromColumn4().length} className="text-center py-8 text-muted-foreground">
                                    Keine Rohdaten vorhanden. Importieren Sie eine Excel-Datei.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getRawDataFromColumn4().map((row, rowIndex) => (
                                  <TableRow key={rowIndex} className="hover:bg-gray-50/60">
                                    {row.map((cell, cellIndex) => (
                                      <TableCell key={cellIndex} className="font-medium">
                                        {cell?.toString() || "-"}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Ablaufkalender
                    </CardTitle>
                    <CardDescription>
                      Vertragsenden im Überblick
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                    
                    {selectedDate && isValid(selectedDate) && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">
                          Ablaufende Verträge am {format(selectedDate, "dd.MM.yyyy")}:
                        </h4>
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
                              <span className="text-sm">{event.title}</span>
                            </div>
                          ))}
                        {getCalendarEvents().filter(event => isSameDay(event.date, selectedDate)).length === 0 && (
                          <p className="text-sm text-muted-foreground">Keine Verträge an diesem Tag</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}