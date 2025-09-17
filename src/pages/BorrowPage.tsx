// src/pages/BorrowPage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CircularProgress from "@mui/material/CircularProgress";
import ClearIcon from '@mui/icons-material/Clear';
// Add this import at the top with other imports
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {
  Box,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Card,
  List,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Popover,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Badge
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "";
interface BorrowRecord {
  borrow_id?: string;
  course?: string;
  group_number?: string;
  group_leader?: string;
  group_leader_id?: string;
  instructor?: string;
  subject?: string;
  schedule?: string;
  item?: string; // CSV
  quantity?: string; // CSV
  status?: string;
  date_borrowed?: string;
}

interface BorrowItem {
  num: string;
  equipment_name: string;
  total_qty: number;
  borrowed: number;
  available: number;
  brand_model?: string;
  location?: string;
  identifier_type?: string;
  identifiers?: string[];
  statuses?: string[];
  is_consumable?: boolean;
  description?: string;
  quantity_opened?: number;
  quantity_unopened?: number;
}

interface SelectedItem {
  num: string;
  name: string;
  qty: number;
  available: number;
  is_consumable: boolean;
  selected_identifiers?: string[];
  identifier_type?: string;
}
interface SetupData {
  code: string;
  course: string;
  instructor: string;
  subject: string;
  schedule: string;
  item: string;
}
export default function BorrowPage() {
  const theme = useTheme();
  // records & inventory

  
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportTable, setReportTable] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  const [itemType, setItemType] = useState<"all" | "non-consumable" | "consumable">("all");
  const [codeStatus, setCodeStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
const [codeValidation, setCodeValidation] = useState({ isValid: false, message: '' });
  // selected items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [identifierDialogOpen, setIdentifierDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<BorrowItem | null>(null);
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<string[]>([]);

  // dialog + stepper
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Borrower Info", "Select Item(s)", "Confirmation"];
  const [showItemsModal, setShowItemsModal] = useState(false);
const [modalItems, setModalItems] = useState<string[]>([]);
const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });

  // Request form
  const [requestForm, setRequestForm] = useState({
    borrow_id: "",
    course: "",
    group_number: "",
    group_leader: "",
    group_leader_id: "",
    instructor: "",
    subject: "",
    schedule: "",
    status: "Borrowed",
    date_borrowed: "",
  });

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [setupCode, setSetupCode] = useState("");

  const [rowsPerPage, setRowsPerPage] = useState(10);

    // Date filter state
  const [dateFilterAnchor, setDateFilterAnchor] = useState<null | HTMLElement>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

// Update the useEffect to include proper typing
// Update the useEffect
useEffect(() => {
  const fetchSetupData = async () => {
    if (setupCode.length === 6) {
      setCodeStatus('loading');
      try {
        const response = await axios.get(
          "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec",
          {
            params: {
              sheet: "pre_setup",
              action: "read"
            }
          }
        );

        if (response.data.success) {
          const setupData: string[][] = response.data.data;
          const foundSetup = setupData.find((row: string[]) => row[0] === setupCode);
          
          if (foundSetup) {
            setRequestForm(prev => ({
              ...prev,
              course: foundSetup[1] || "",
              instructor: foundSetup[2] || "",
              subject: foundSetup[3] || "",
              schedule: foundSetup[4] || "",
              item: foundSetup[5] || ""
            }));
            setCodeStatus('valid');
            setCodeValidation({ isValid: true, message: 'Valid setup code' });
            
            // Show items modal if there are items
            if (foundSetup[5]) {
              const items = foundSetup[5].split(';').map(item => item.trim()).filter(item => item);
              setModalItems(items);
              setShowItemsModal(true);
            }
          } else {
            setCodeStatus('invalid');
            setCodeValidation({ isValid: false, message: 'Invalid setup code' });
            setShowItemsModal(false);
          }
        }
      } catch (error) {
        setCodeStatus('invalid');
        setCodeValidation({ isValid: false, message: 'Error validating code' });
        setShowItemsModal(false);
        console.error("Error fetching setup data:", error);
      }
    } else {
      setCodeStatus('idle');
      setCodeValidation({ isValid: false, message: '' });
      setShowItemsModal(false);
    }
  };

  const debounceTimer = setTimeout(fetchSetupData, 500);
  return () => clearTimeout(debounceTimer);
}, [setupCode]);

// Add function to close modal
const handleCloseModal = () => {
  setShowItemsModal(false);
};

// Add function to handle modal drag (simplified version)
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  const startX = e.clientX - modalPosition.x;
  const startY = e.clientY - modalPosition.y;

  const handleMouseMove = (e: MouseEvent) => {
    setModalPosition({
      x: e.clientX - startX,
      y: e.clientY - startY
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Add this function to clear the code
const handleClearCode = () => {
  setSetupCode("");
  setCodeStatus('idle');
  setCodeValidation({ isValid: false, message: '' });
  setRequestForm(prev => ({
    ...prev,
    course: "",
    instructor: "",
    subject: "",
    schedule: "",
    item: ""
  }));
};

const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.toUpperCase();
  setSetupCode(value);

  // If code is cleared, unlock the fields
  if (value === "") {
    setRequestForm(prev => ({
      ...prev,
      course: "",
      instructor: "",
      subject: "",
      schedule: "",
      item: ""
    }));
  }
};



// Update the handleGenerateReport function to handle the type conversion:
const handleGenerateReport = async () => {
  setLoading(true);
  setReportText("");
  setReportTable(null);

  try {
    // Add "in json" to the question if it's not already there
    const formattedQuestion = question.toLowerCase().includes("json") 
      ? question 
      : `${question} in json`;

    const res = await axios.get(WEB_APP_URL, {
      params: {
        sheet: "report",
        targetSheet: "group_borrow",
        q: formattedQuestion,
      },
    });

    const json = res.data;

    if (json.success && json.data) {
      try {
        // Remove markdown code block syntax if present and extract only the JSON part
        let cleanedData = json.data;
        
        // Extract JSON from markdown code blocks
        if (cleanedData.includes('```json')) {
          const jsonMatch = cleanedData.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            cleanedData = jsonMatch[1].trim();
          } else {
            // Fallback: remove all markdown code block markers
            cleanedData = cleanedData.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          }
        }
        
        // Remove any non-JSON text that might come after the JSON (like "Limitations:" notes)
        const jsonStart = cleanedData.indexOf('[');
        const jsonEnd = cleanedData.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanedData = cleanedData.substring(jsonStart, jsonEnd);
        }
        
        const parsed = JSON.parse(cleanedData);
        
        // Handle both response formats
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Convert array format to table format with proper string conversion
          const columns = Object.keys(parsed[0]);
          const rows = parsed.map((item: any) => 
            Object.values(item).map((value: any) => 
              value === null || value === undefined ? '' : String(value)
            )
          );
          setReportTable({ columns, rows });
        } else if (parsed.columns && parsed.rows) {
          // Handle existing table format - ensure all values are strings
          const columns = parsed.columns;
          const rows = parsed.rows.map((row: any[]) => 
            row.map((cell: any) => cell === null || cell === undefined ? '' : String(cell))
          );
          setReportTable({ columns, rows });
        } else {
          setReportText(json.data);
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setReportText(json.data);
      }
    } else {
      setError("Failed to generate report: " + JSON.stringify(json));
    }
  } catch (err) {
    console.error(err);
    setError("Error generating report");
  }

  setLoading(false);
};
const handleGeneratePDF = () => {
  if (!reportTable) return;
  
  // Create a printable version of the table
  const printContent = `
    <html>
      <head>
        <title>Borrow Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1 { color: #b91c1c; }
        </style>
      </head>
      <body>
        <h1>Borrow Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${reportTable.columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${reportTable.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

  // fetch borrow records
  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await axios.get(WEB_APP_URL, {
        params: { action: "read", sheet: "borrow" },
      });
      const raw = res.data?.data;
      if (!raw || raw.length <= 1) {
        setRecords([]);
        return;
      }

      const headerRow = (raw[0] || []).map((h: any) =>
        String(h || "").trim().toLowerCase().replace(/\s+/g, "_")
      );
      const idx = (key: string) => headerRow.indexOf(key);

      const mapped = raw.slice(1).map((row: any[]) => ({
        borrow_id: row[idx("borrow_id")] ?? row[0] ?? "",
        course: row[idx("course")] ?? "",
        group_number: row[idx("group_number")] ?? "",
        group_leader: row[idx("group_leader")] ?? "",
        group_leader_id: row[idx("group_leader_id")] ?? "",
        instructor: row[idx("instructor")] ?? "",
        subject: row[idx("subject")] ?? "",
        schedule: row[idx("schedule")] ?? "",
        item: row[idx("item")] ?? "",
        quantity: row[idx("quantity")] ?? "",
        status: row[idx("status")] ?? "",
        date_borrowed: row[idx("date_borrowed")] ?? "",
      })) as BorrowRecord[];

      setRecords(mapped);
    } catch (err) {
      console.error("fetchRecords error:", err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // fetch inventory (both non-consumable and consumable)
  const fetchItems = async () => {
    setItemsLoading(true);
    try {
      // Fetch non-consumable items
      const ncRes = await axios.get(WEB_APP_URL, {
        params: { action: "read", sheet: "nc_inventory" },
      });
      
      // Fetch consumable items
      const cRes = await axios.get(WEB_APP_URL, {
        params: { action: "read", sheet: "c_inventory" },
      });

      const ncRaw = ncRes.data?.data;
      const cRaw = cRes.data?.data;

      const allItems: BorrowItem[] = [];

      // Process non-consumable items
      if (ncRaw && ncRaw.length > 2) {
        const headers = ncRaw[1];
        const idx = (key: string) => headers.indexOf(key);

        ncRaw.slice(2).forEach((row: any[]) => {
          const totalQty = parseInt(row[idx("TOTAL_QTY")] ?? "0") || 0;
          const borrowed = parseInt(row[idx("BORROWED")] ?? "0") || 0;
          
          const identifiersRaw = row[idx("IDENTIFIER_NUMBER")] || "";
          const identifiers = identifiersRaw
            ? String(identifiersRaw)
                .split(",")
                .map((id: string) => id.trim().replace(/^\{|\}$/g, ""))
            : [];

          const statusesRaw = row[idx("STATUS")] || "";
          const statuses = statusesRaw
            ? String(statusesRaw)
                .split(",")
                .map((s: string) => s.trim().toLowerCase())
            : [];

          allItems.push({
            num: String(row[idx("NO.")] ?? row[0] ?? ""),
            equipment_name: String(row[idx("EQUIPMENT_NAME")] ?? row[1] ?? ""),
            total_qty: totalQty,
            borrowed,
            available: Math.max(0, totalQty - borrowed),
            brand_model: String(row[idx("BRAND_MODEL")] ?? ""),
            location: String(row[idx("LOCATION")] ?? ""),
            identifier_type: String(row[idx("IDENTIFIER_TYPE")] ?? ""),
            identifiers,
            statuses,
            is_consumable: false
          });
        });
      }

      // Process consumable items
      if (cRaw && cRaw.length > 2) {
        const headers = cRaw[1];
        const idx = (key: string) => headers.indexOf(key);

        cRaw.slice(2).forEach((row: any[]) => {
          const quantityOpened = parseInt(row[idx("QUANTITY_OPENED")] ?? "0") || 0;
          const quantityUnopened = parseInt(row[idx("QUANTITY_UNOPENED")] ?? "0") || 0;
          const totalQty = quantityOpened + quantityUnopened;

          allItems.push({
            num: String(row[idx("NO.")] ?? row[0] ?? ""),
            equipment_name: String(row[idx("DESCRIPTION")] ?? row[1] ?? ""),
            total_qty: totalQty,
            borrowed: 0,
            available: totalQty,
            location: String(row[idx("LOCATION")] ?? ""),
            description: String(row[idx("DESCRIPTION")] ?? ""),
            quantity_opened: quantityOpened,
            quantity_unopened: quantityUnopened,
            is_consumable: true
          });
        });
      }

      setItems(allItems);
    } catch (err) {
      console.error("fetchItems error:", err);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchItems();
  }, []);

  // filter items
  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        // Filter by type
        if (itemType !== "all") {
          if (itemType === "non-consumable" && item.is_consumable) return false;
          if (itemType === "consumable" && !item.is_consumable) return false;
        }

        // Filter by search
        return (
          item.equipment_name.toLowerCase().includes(search.toLowerCase()) ||
          (item.brand_model ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (item.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (item.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (item.identifiers?.some(id => id.toLowerCase().includes(search.toLowerCase())) ?? false)
        );
      }),
    [items, search, itemType]
  );

  // filter records
  const filteredRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          (r.course?.toLowerCase().includes(search.toLowerCase()) ||
          r.group_leader?.toLowerCase().includes(search.toLowerCase()) ||
          r.instructor?.toLowerCase().includes(search.toLowerCase()) ||
          r.subject?.toLowerCase().includes(search.toLowerCase())) &&
          // Date filter
          (!startDate || !r.date_borrowed || new Date(r.date_borrowed) >= new Date(startDate)) &&
          (!endDate || !r.date_borrowed || new Date(r.date_borrowed) <= new Date(endDate))
      ),
    [records, search, startDate, endDate]
  );
  // Apply date filter
  const applyDateFilter = () => {
    setDateFilterAnchor(null);
  };

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateFilterAnchor(null);
  };


  // Open identifier selection dialog
  const handleOpenIdentifierDialog = (item: BorrowItem) => {
    setCurrentItem(item);
    setSelectedIdentifiers([]);
    setIdentifierDialogOpen(true);
  };

  // Add item with selected identifiers
  const handleAddWithIdentifiers = () => {
    if (!currentItem) return;

    const newItem: SelectedItem = {
      num: currentItem.num,
      name: currentItem.equipment_name,
      qty: selectedIdentifiers.length,
      available: currentItem.available,
      is_consumable: currentItem.is_consumable || false,
      selected_identifiers: [...selectedIdentifiers],
      identifier_type: currentItem.identifier_type
    };

    setSelectedItems(prev => [...prev, newItem]);
    setIdentifierDialogOpen(false);
    setCurrentItem(null);
    setSelectedIdentifiers([]);
  };

  // update item qty
  const updateItemQty = (
    num: string,
    delta: number,
    available: number,
    name: string,
    is_consumable: boolean = false
  ) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.num === num);
      
      if (!existing) {
        // For non-consumable items with identifiers, open the dialog
        if (!is_consumable && delta > 0) {
          const item = items.find(i => i.num === num);
          if (item && item.identifiers && item.identifiers.length > 0) {
            handleOpenIdentifierDialog(item);
            return prev;
          }
        }
        
        if (delta > 0) return [...prev, { 
          num, 
          name, 
          qty: 1, 
          available,
          is_consumable 
        }];
        return prev;
      }
      
      const newQty = Math.max(0, Math.min(existing.qty + delta, available));
      if (newQty === 0) {
        return prev.filter((i) => i.num !== num);
      }
      return prev.map((i) => (i.num === num ? { ...i, qty: newQty } : i));
    });
  };

  // Remove item from cart
  const removeFromCart = (num: string) => {
    setSelectedItems(prev => prev.filter(item => item.num !== num));
  };

  // stepper nav
  const handleNext = () => {
    if (activeStep === 0) {
      const req = requestForm;
      if (
        !req.course ||
        !req.group_number ||
        !req.group_leader ||
        !req.group_leader_id ||
        !req.instructor ||
        !req.subject ||
        !req.schedule
      ) {
        setError("Please complete all required fields on Step 1.");
        return;
      }
      setError(null);
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (selectedItems.length === 0) {
        setError("Please select at least one item.");
        return;
      }
      setError(null);
      setActiveStep(2);
    }
  };

  // Parse item and quantity strings from the database format
  const parseItemsAndQuantities = (itemStr: string = "", qtyStr: string = "") => {
    const items: {name: string, qty: number}[] = [];
    
    // Parse items in format like: (7-SEGMENT TESTER - CN001, CN002, CN003),(CALCULATOR - CN123)
    const itemMatches = itemStr.match(/\(([^)]+)\)/g) || [];
    const qtyMatches = qtyStr.match(/\(([^)]+)\)/g) || [];
    
    itemMatches.forEach((itemMatch, index) => {
      const itemContent = itemMatch.replace(/[()]/g, "").trim();
      const qtyContent = qtyMatches[index] ? qtyMatches[index].replace(/[()]/g, "").trim() : "0";
      
      items.push({
        name: itemContent,
        qty: parseInt(qtyContent) || 0
      });
    });
    
    return items;
  };

  // View Borrow: open dialog and populate the stepper with data
  const handleViewBorrow = (record: BorrowRecord) => {
    setRequestForm({
      borrow_id: record.borrow_id || "",
      course: record.course || "",
      group_number: record.group_number || "",
      group_leader: record.group_leader || "",
      group_leader_id: record.group_leader_id || "",
      instructor: record.instructor || "",
      subject: record.subject || "",
      schedule: record.schedule || "",
      status: record.status || "Borrowed",
      date_borrowed: record.date_borrowed || "",
    });

    // Parse the items and quantities correctly
    const parsedItems = parseItemsAndQuantities(record.item, record.quantity);
    const itemsArr = parsedItems.map((item, idx) => ({
      num: `view-${idx}`,
      name: item.name,
      qty: item.qty,
      available: 0,
      is_consumable: false
    }));
    
    setSelectedItems(itemsArr);
    setActiveStep(2); // jump to summary
    setOpen(true);
  };

  // Update Borrow: similar to New Borrow but populate stepper for editing
  const handleUpdateBorrow = (record: BorrowRecord) => {
    setRequestForm({
      borrow_id: record.borrow_id || "",
      course: record.course || "",
      group_number: record.group_number || "",
      group_leader: record.group_leader || "",
      group_leader_id: record.group_leader_id || "",
      instructor: record.instructor || "",
      subject: record.subject || "",
      schedule: record.schedule || "",
      status: record.status || "Borrowed",
      date_borrowed: record.date_borrowed || "",
    });

    // Parse the items and quantities correctly
    const parsedItems = parseItemsAndQuantities(record.item, record.quantity);
    const itemsArr = parsedItems.map((item, idx) => ({
      num: `edit-${idx}`,
      name: item.name,
      qty: item.qty,
      available: 999, // allow editing
      is_consumable: false
    }));

    setSelectedItems(itemsArr);
    setActiveStep(1); // jump to item selection
    setOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedRecordIds.length === 0) return;
    if (!confirm(`Delete ${selectedRecordIds.length} borrow record(s)?`)) return;

    try {
      for (const id of selectedRecordIds) {
        await axios.get(WEB_APP_URL, {
          params: { action: "delete", sheet: "borrow", borrow_id: id },
        });
      }
      await fetchRecords();
      setSelectedRecordIds([]);
    } catch (err) {
      console.error("delete selected error:", err);
      alert("Failed to delete some records.");
    }
  };

  // Delete Borrow
  const handleDeleteBorrow = async (borrowId: string) => {
    if (!confirm("Are you sure you want to delete this borrow request?")) return;
    try {
      await axios.get(WEB_APP_URL, {
        params: { action: "delete", sheet: "borrow", borrow_id: borrowId },
      });
      await fetchRecords();
    } catch (err) {
      console.error("deleteBorrow error:", err);
      alert("Failed to delete the record.");
    }
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const resetDialog = () => {
    setOpen(false);
    setActiveStep(0);
    setRequestForm({
      borrow_id: "",
      course: "",
      group_number: "",
      group_leader: "",
      group_leader_id: "",
      instructor: "",
      subject: "",
      schedule: "",
      status: "Borrowed",
      date_borrowed: "",
    });
    setSelectedItems([]);
    setError(null);
  };

  // Format items and quantities for saving to database
  const formatItemsAndQuantities = (items: SelectedItem[]) => {
    const itemStr = items.map((s) => {
      if (s.selected_identifiers && s.selected_identifiers.length > 0) {
        return `(${s.name} - ${s.selected_identifiers.join(", ")})`;
      }
      return `(${s.name})`;
    }).join(",");
    
    const qtyStr = items.map((s) => `(${s.qty})`).join(",");
    
    return { itemStr, qtyStr };
  };

  // save borrow
  const handleConfirmBorrow = async () => {
    if (selectedItems.length === 0) return;
    setSaving(true);
    try {
      const { itemStr, qtyStr } = formatItemsAndQuantities(selectedItems);
      
      const action = requestForm.borrow_id ? "update" : "create";

      await axios.get(WEB_APP_URL, {
        params: {
          action,
          sheet: "borrow",
          ...requestForm,
          item: itemStr,
          quantity: qtyStr,
        },
      });

      await fetchRecords();
      await fetchItems();
      resetDialog();
    } catch (err) {
      console.error(`${requestForm.borrow_id ? "update" : "create"} borrow error:`, err);
      setError("Failed to save borrow record.");
    } finally {
      setSaving(false);
    }
  };

  // summary calc
  const totalRequestedCount = records.reduce((acc, r) => {
    if (!r.quantity) return acc;
    
    // Parse the quantity string correctly
    const qtyMatches = r.quantity.match(/\(([^)]+)\)/g) || [];
    const sum = qtyMatches.reduce((total, qtyMatch) => {
      const qtyContent = qtyMatch.replace(/[()]/g, "").trim();
      return total + (parseInt(qtyContent) || 0);
    }, 0);
    
    return acc + sum;
  }, 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Summary cards */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color="#b91c1c" gutterBottom>
          Borrow Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage equipment and consumable inventory
        </Typography>
      </Box>
      
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={4}>
        <Card sx={{ 
          flex: 1, 
          p: 3, 
          borderRadius: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          background: `linear-gradient(135deg, rgba(185,28,28,0.1) 0%, rgba(185,28,28,0.2) 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: "rgba(185,28,28,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <PersonIcon sx={{ fontSize: 30, color: "#b91c1c" }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">Borrow Requests</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#b91c1c" }}>
              {records.length}
            </Typography>
          </Box>
        </Card>

        <Card sx={{ 
          flex: 1, 
          p: 3, 
          borderRadius: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.2)} 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: alpha(theme.palette.success.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CheckCircleIcon sx={{ fontSize: 30, color: theme.palette.success.main }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">Total Items Borrowed</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.success.main }}>
              {totalRequestedCount}
            </Typography>
          </Box>
        </Card>
      </Stack>

      {/* Action Bar */}
<Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} sx={{ flex: 1, maxWidth: 600 }} alignItems="center">
          <TextField
            placeholder="Search course, leader, instructor, subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              bgcolor: "background.paper",
              borderRadius: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                "& fieldset": {
                  borderRadius: 3,
                },
                "&:hover fieldset": {
                  borderColor: "#b91c1c",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#b91c1c",
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Date Filter Button */}
          <Button
            variant="outlined"
            onClick={(e) => setDateFilterAnchor(e.currentTarget)}
            startIcon={<FilterListIcon />}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              px: 2,
              borderColor: "#b91c1c",
              color: "#b91c1c",
              "&:hover": {
                borderColor: "#b91c1c",
                bgcolor: "rgba(185, 28, 28, 0.04)"
              }
            }}
          >
            Date Filter
          </Button>

          {/* Date Filter Popover */}
          <Popover
            open={Boolean(dateFilterAnchor)}
            anchorEl={dateFilterAnchor}
            onClose={() => setDateFilterAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Box sx={{ p: 2, minWidth: 300 }}>
              <Typography variant="subtitle1" gutterBottom>
                Filter by Borrow Date
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={applyDateFilter}
                    sx={{ flex: 1 }}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearDateFilter}
                    sx={{ flex: 1 }}
                  >
                    Clear
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Popover>
        </Stack>
        
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="contained"
            onClick={() => setOpen(true)}
            sx={{
              bgcolor: "#b91c1c",
              "&:hover": { bgcolor: "#b91c1c.dark" },
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            + New Borrow
          </Button>

{userRole === "Custodian" && (
  <Button
    variant="outlined"
    color="error"
    sx={{
      borderRadius: 2,
      textTransform: "none",
      px: 3,
      fontWeight: "bold",
    }}
    disabled={selectedRecordIds.length === 0}
    onClick={handleDeleteSelected}
  >
    Delete Selected ({selectedRecordIds.length})
  </Button>
)}

  {/* AI Report Button - Only show for Custodian */}
{userRole === "Custodian" && (
  <Button
    variant="outlined"
    color="primary"
    onClick={() => setAiDialogOpen(true)}
    sx={{
      borderRadius: 2,
      textTransform: "none",
      px: 3,
      fontWeight: "bold",
      borderColor: "#1976d2",
      color: "#1976d2",
      "&:hover": {
        borderColor: "#1565c0",
        bgcolor: "rgba(25, 118, 210, 0.04)"
      }
    }}
    startIcon={<AutoAwesomeIcon />}
  >
    AI Report
  </Button>
)}

        </Stack>
      </Stack>

      {/* Borrow Records Table */}
      <Card
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {recordsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader />
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Typography variant="body2" color="text.secondary">
              No borrow records found.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600, borderRadius: 2 }}>
              <Table stickyHeader sx={{ minWidth: 950 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: "grey.50" }}>
                      <Checkbox
                        indeterminate={
                          selectedRecordIds.length > 0 &&
                          selectedRecordIds.length < records.length
                        }
                        checked={
                          records.length > 0 &&
                          selectedRecordIds.length === records.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecordIds(records.map((r) => r.borrow_id!));
                          } else {
                            setSelectedRecordIds([]);
                          }
                        }}
                        sx={{ color: "#b91c1c" }}
                      />
                    </TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Course</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Group</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Leader</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Instructor</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Schedule</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Status</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((r) => (
                      <TableRow key={r.borrow_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedRecordIds.includes(r.borrow_id!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecordIds((prev) => [...prev, r.borrow_id!]);
                              } else {
                                setSelectedRecordIds((prev) =>
                                  prev.filter((id) => id !== r.borrow_id)
                                );
                              }
                            }}
                            sx={{ color: "#b91c1c" }}
                          />
                        </TableCell>
                        <TableCell>
                          {r.date_borrowed
                            ? new Date(r.date_borrowed).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {r.course}
                          </Typography>
                        </TableCell>
                        <TableCell>{r.group_number}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {r.group_leader}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {r.group_leader_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{r.instructor}</TableCell>
                        <TableCell>{r.schedule}</TableCell>
                        <TableCell>
                          <Chip 
                            label={r.status} 
                            size="small" 
                            color={r.status === "Returned" ? "success" : "error"} 
                            variant={r.status === "Returned" ? "filled" : "outlined"} 
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="View">
                              <IconButton
                                color="default"
                                onClick={() => handleViewBorrow(r)}
                                sx={{
                                  bgcolor: "grey.100",
                                  "&:hover": { bgcolor: "primary.main", color: "#fff" },
                                }}
                              >
                                <EventIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Update">
                              <IconButton
                                color="primary"
                                onClick={() => handleUpdateBorrow(r)}
                                sx={{
                                  bgcolor: "#e3f2fd",
                                  "&:hover": { bgcolor: "#90caf9" },
                                  p: 1,
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                           {userRole === "Custodian" && (
  <Tooltip title="Delete">
    <IconButton
      color="error"
      onClick={() => handleDeleteBorrow(r.borrow_id!)}
      sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#f44336", color: "#fff" },
        p: 1,
      }}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Tooltip>
)}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          </>
        )}
      </Card>

      {/* Dialog (Stepper Form) */}
      <Dialog open={open} onClose={resetDialog} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            color: "#b91c1c",
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {requestForm.borrow_id ? "Update Borrow Request" : "New Borrow Request"}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EventIcon color="error" />
            <Typography variant="caption" color="text.secondary">
              Step {activeStep + 1} of {steps.length}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "background.default" }}>
          <Box mb={3}>
            <Stepper
              activeStep={activeStep}
              sx={{
                "& .MuiStepLabel-root .Mui-active": { color: "#b91c1c" },
                "& .MuiStepLabel-root .Mui-completed": { color: "success.main" },
                "& .MuiStepConnector-root .Mui-active .MuiStepConnector-line": { borderColor: "#b91c1c" },
                "& .MuiStepConnector-root .Mui-completed .MuiStepConnector-line": { borderColor: "success.main" },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step 1: Borrower Info */}
 {activeStep === 0 && (
  <Stack spacing={2}>
    {/* Code Input Field with Buttons */}
    <Box sx={{ position: 'relative' }}>
      <TextField
        label="Setup Code"
        value={setupCode}
        onChange={handleCodeChange}
        fullWidth
        variant="outlined"
        placeholder="Enter 6-character code"
        inputProps={{ maxLength: 6 }}
        error={codeStatus === 'invalid'}
        helperText={codeValidation.message}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {setupCode && (
                <>
                  {codeStatus === 'loading' && (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  )}
                  {codeStatus === 'valid' && (
                    <IconButton
                      size="small"
                      sx={{ color: 'green', mr: 1 }}
                      disabled
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    sx={{ color: 'red' }}
                    onClick={handleClearCode}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </>
              )}
            </InputAdornment>
          )
        }}
      />
    </Box>
    
    <TextField
      label="Course"
      value={requestForm.course}
      onChange={(e) => setRequestForm({ ...requestForm, course: e.target.value })}
      fullWidth
      variant="outlined"
      disabled={codeStatus === 'valid'}
    />
    <TextField
      label="Instructor"
      value={requestForm.instructor}
      onChange={(e) => setRequestForm({ ...requestForm, instructor: e.target.value })}
      fullWidth
      disabled={codeStatus === 'valid'}
    />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        label="Subject"
        value={requestForm.subject}
        onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
        fullWidth
        disabled={codeStatus === 'valid'}
      />
      <TextField
        label="Schedule"
        value={requestForm.schedule}
        onChange={(e) => setRequestForm({ ...requestForm, schedule: e.target.value })}
        fullWidth
        disabled={codeStatus === 'valid'}
      />
    </Stack>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        label="Group Number"
        value={requestForm.group_number}
        onChange={(e) => setRequestForm({ ...requestForm, group_number: e.target.value })}
        fullWidth
      />
      <TextField
        label="Leader ID"
        value={requestForm.group_leader_id}
        onChange={(e) => setRequestForm({ ...requestForm, group_leader_id: e.target.value })}
        fullWidth
      />
      <TextField
        label="Group Leader"
        value={requestForm.group_leader}
        onChange={(e) => setRequestForm({ ...requestForm, group_leader: e.target.value })}
        fullWidth
      />
    </Stack>
  </Stack>
)}

          {/* Step 2: Item Selection */}
          {activeStep === 1 && (
            <Box>
              <Stack direction="row" spacing={2} mb={3} alignItems="center">
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Filter Items</InputLabel>
                  <Select
                    value={itemType}
                    label="Filter Items"
                    onChange={(e) => setItemType(e.target.value as any)}
                  >
                    <MenuItem value="all">All Items</MenuItem>
                    <MenuItem value="non-consumable">Non-Consumable</MenuItem>
                    <MenuItem value="consumable">Consumable</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              {/* Shopping Cart Summary */}
              {selectedItems.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <ShoppingCartIcon color="primary" />
                    <Typography variant="h6">Selected Items</Typography>
                    <Chip label={selectedItems.length} color="primary" size="small" />
                  </Stack>
                  
                  <Stack spacing={1}>
                    {selectedItems.map((item) => (
                      <Box key={item.num} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.name}
                            {item.selected_identifiers && ` (${item.selected_identifiers.join(", ")})`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.is_consumable ? "Consumable" : "Non-Consumable"}
                          </Typography>
                        </Box>
                        
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">Qty: {item.qty}</Typography>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => removeFromCart(item.num)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Items List */}
              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                {itemsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : filteredItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                    No items found
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {filteredItems.map((item) => {
                      const cartItem = selectedItems.find(i => i.num === item.num);
                      const currentQty = cartItem ? cartItem.qty : 0;
                      
                      return (
                        <Paper key={item.num} sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" fontWeight="medium">
                                {item.equipment_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.brand_model && `${item.brand_model} • `}
                                {item.location && `Location: ${item.location} • `}
                                Available: {item.available}
                                {item.is_consumable && " • Consumable"}
                              </Typography>
                              
                              {item.identifiers && item.identifiers.length > 0 && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Identifiers: {item.identifiers.join(", ")}
                                </Typography>
                              )}
                            </Box>
                            
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconButton
                                size="small"
                                onClick={() => updateItemQty(
                                  item.num, 
                                  -1, 
                                  item.available, 
                                  item.equipment_name,
                                  item.is_consumable
                                )}
                                disabled={currentQty === 0}
                              >
                                -
                              </IconButton>
                              
                              <Typography>{currentQty}</Typography>
                              
                              <IconButton
                                size="small"
                                onClick={() => updateItemQty(
                                  item.num, 
                                  1, 
                                  item.available, 
                                  item.equipment_name,
                                  item.is_consumable
                                )}
                                disabled={currentQty >= item.available}
                              >
                                +
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Box>
          )}

          {/* Step 3: Confirmation */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Borrow Request Summary
              </Typography>
              
              <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" gutterBottom>Borrower Information</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Course:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.course}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Group:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.group_number}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Leader:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.group_leader}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Leader ID:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.group_leader_id}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Instructor:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.instructor}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Subject:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.subject}</Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>Schedule:</Typography>
                    <Typography variant="body2" fontWeight="medium">{requestForm.schedule}</Typography>
                  </Box>
                </Stack>
              </Paper>
              
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" gutterBottom>Items to Borrow</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedItems.map((item) => (
                      <TableRow key={item.num}>
                        <TableCell>
                          {item.name}
                          {item.selected_identifiers && ` (${item.selected_identifiers.join(", ")})`}
                          {item.is_consumable && " (Consumable)"}
                        </TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          {/* Stepper Navigation */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ borderRadius: 2 }}
            >
              Back
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleConfirmBorrow}
                disabled={saving}
                sx={{
                  bgcolor: "#b91c1c",
                  "&:hover": { bgcolor: "#b91c1c.dark" },
                  borderRadius: 2,
                  minWidth: 120,
                }}
              >
                {saving ? <CircularProgress size={24} /> : "Confirm"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{
                  bgcolor: "#b91c1c",
                  "&:hover": { bgcolor: "#b91c1c.dark" },
                  borderRadius: 2,
                  minWidth: 120,
                }}
              >
                Next
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>
{/* Movable Items Modal */}
{showItemsModal && (
  <Paper
    elevation={8}
    sx={{
      position: 'fixed',
      left: modalPosition.x,
      top: modalPosition.y,
      width: 300,
      maxHeight: 400,
      zIndex: 9999,
      cursor: 'move',
      overflow: 'hidden',
      bgcolor: '#fff9c4', // Sticky note yellow background
      border: '2px solid #ffd54f',
      borderRadius: 2,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}
    onMouseDown={handleMouseDown}
  >
    {/* Modal Header */}
    <Box
      sx={{
        bgcolor: '#ffd54f',
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #ffb300'
      }}
    >
      <Typography variant="subtitle2" fontWeight="bold" color="#5d4037">
        📋 Setup Items
      </Typography>
      <IconButton size="small" onClick={handleCloseModal} sx={{ color: '#5d4037' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    {/* Modal Content */}
    <Box sx={{ p: 2, maxHeight: 350, overflow: 'auto' }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Items included in this setup:
      </Typography>
      
      <List dense sx={{ py: 0 }}>
        {modalItems.map((item, index) => (
          <ListItem key={index} sx={{ 
            py: 0.5,
            borderBottom: index < modalItems.length - 1 ? '1px dashed #ffd54f' : 'none'
          }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <FiberManualRecordIcon sx={{ fontSize: 8, color: '#ff6d00' }} />
            </ListItemIcon>
            <ListItemText
              primary={item}
              primaryTypographyProps={{ variant: 'body2', color: '#5d4037' }}
            />
          </ListItem>
        ))}
      </List>

      {modalItems.length === 0 && (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No items specified for this setup
        </Typography>
      )}
    </Box>

    {/* Modal Footer */}
    <Box
      sx={{
        bgcolor: '#ffecb3',
        p: 1,
        textAlign: 'center',
        borderTop: '2px solid #ffd54f'
      }}
    >
      <Typography variant="caption" color="#5d4037">
        Drag to move • Click X to close
      </Typography>
    </Box>
  </Paper>
)}
      {/* Identifier Selection Dialog */}
      <Dialog 
        open={identifierDialogOpen} 
        onClose={() => setIdentifierDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Select Identifiers for {currentItem?.equipment_name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Available identifiers (select up to {currentItem?.available}):
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2, maxHeight: 300, overflow: "auto" }}>
            {currentItem?.identifiers?.map((identifier) => (
              <Box 
                key={identifier} 
                sx={{ 
                  display: "flex", 
                  alignItems: "center",
                  p: 1,
                  borderRadius: 1,
                  bgcolor: selectedIdentifiers.includes(identifier) 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : "transparent",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
                onClick={() => {
                  if (selectedIdentifiers.includes(identifier)) {
                    setSelectedIdentifiers(prev => prev.filter(id => id !== identifier));
                  } else if (selectedIdentifiers.length < (currentItem?.available || 0)) {
                    setSelectedIdentifiers(prev => [...prev, identifier]);
                  }
                }}
              >
                <Checkbox
                  checked={selectedIdentifiers.includes(identifier)}
                  onChange={(e) => {
                    if (e.target.checked && selectedIdentifiers.length < (currentItem?.available || 0)) {
                      setSelectedIdentifiers(prev => [...prev, identifier]);
                    } else if (!e.target.checked) {
                      setSelectedIdentifiers(prev => prev.filter(id => id !== identifier));
                    }
                  }}
                />
                <Typography variant="body2">{identifier}</Typography>
              </Box>
            ))}
          </Stack>
          
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 1 }}>
            <Button onClick={() => setIdentifierDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleAddWithIdentifiers}
              disabled={selectedIdentifiers.length === 0}
            >
              Add {selectedIdentifiers.length} Item(s)
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* AI Dialog */}
      <Dialog 
  open={aiDialogOpen} 
  onClose={() => setAiDialogOpen(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>
    <Stack direction="row" spacing={1} alignItems="center">
      <AutoAwesomeIcon color="primary" />
      <Typography variant="h6">AI Report</Typography>
    </Stack>
  </DialogTitle>
  <DialogContent dividers>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Ask questions about borrow records, inventory status, or generate reports.
    </Typography>
    
    <Stack spacing={2} sx={{ mt: 2 }}>
      <TextField
        multiline
        rows={3}
        placeholder="e.g., Show me all borrow requests for ECE students this month"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        fullWidth
        variant="outlined"
      />
      
      <Button
        variant="contained"
        onClick={handleGenerateReport}
        disabled={loading || !question.trim()}
        startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
      >
        {loading ? "Generating..." : "Generate Report"}
      </Button>
    </Stack>
    
    {reportText && (
      <Paper sx={{ p: 2, mt: 3, bgcolor: "grey.50" }}>
        <Typography variant="body2" whiteSpace="pre-wrap">
          {reportText}
        </Typography>
      </Paper>
    )}
    
    {reportTable && (
      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleGeneratePDF}
          sx={{ mb: 2 }}
        >
          Generate PDF
        </Button>
        <Typography variant="subtitle2" gutterBottom>
          Report Results:
        </Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {reportTable.columns.map((col, index) => (
                  <TableCell key={index} sx={{ fontWeight: "bold" }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reportTable.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )}
  </DialogContent>
</Dialog>
    </Container>
  );
}