// src/pages/InventoryPage.tsx
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { keyframes } from "@mui/system";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Checkbox,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableContainer,
  DialogActions,
  TableRow,
  TextField,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Chip,
  alpha,
  useTheme,
  InputAdornment,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role || "";

interface InventoryItem {
  num: string;
  identifier_type: string;
  identifiers: string[]; 
  statuses: string[];    // array for per-quantity identifiers
  equipment_name: string;
  facility: string;
  brand_model: string;
  total_qty: string;
  borrowed: string;
  location: string;
  soft_hard: string;
  e_location: string;
  bat_type: string;
  bat_qty: string;
  bat_total: string;
  yes_or_no: string;
  preventive_or_calibration: string;
  inhouse_outsourced:string;
  month: string;
}

interface CInventoryItem {
  num: string;
  location: string;
  description: string;
  quantity_opened: string;
  quantity_unopened: string;
  quantity_on_order: string;
  remarks: string;
  experiment: string;
  subject: string;
  date_issued: string;
  issuance_no: string;
  stock_alert: string;
}

const InventoryPage = () => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cinventory, setCInventory] = useState<CInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryType = searchParams.get("stock"); 
  // Add these state variables near your other useState declarations
const [aiDialogOpen, setAiDialogOpen] = useState(false);
const [question, setQuestion] = useState("");
const [loading2, setLoading2] = useState(false);
const [reportText, setReportText] = useState("");
const [reportTable, setReportTable] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const blink = keyframes`
    0% { box-shadow: 0 0 0px ${alpha(theme.palette.warning.main, 0.5)}; }
    50% { box-shadow: 0 0 16px ${alpha(theme.palette.warning.main, 0.8)}; }
    100% { box-shadow: 0 0 0px ${alpha(theme.palette.warning.main, 0.5)}; }
  `;

  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [itemType, setItemType] = useState("Non-Consumable");
  const [battery, setBattery] = useState("Without Battery");
  
  const [form, setForm] = useState<InventoryItem>({
    num: "",
    identifier_type: "None",
    identifiers: [],       
    statuses: [],
    equipment_name: "",
    facility: "",
    brand_model: "",
    total_qty: "1",
    borrowed: "0",
    location: "",
    soft_hard: "N/A",
    e_location: "",
    bat_type: "",
    bat_qty: "",
    bat_total: "",
    yes_or_no: "NO",
    preventive_or_calibration: "",
    inhouse_outsourced: "",
    month: ""
  });

  const [form2, setForm2] = useState<CInventoryItem>({
    num: "",
    location: "",
    description: "",
    quantity_opened: "0",
    quantity_unopened: "0",
    quantity_on_order: "0",
    remarks: "",
    experiment: "",
    subject: "",
    date_issued: "",
    issuance_no: "",
    stock_alert: "5"
  });

  const initialFormNC: InventoryItem = {
    num: "",
    identifier_type: "Control Number",
    identifiers: [],
    statuses: [],
    equipment_name: "",
    facility: "",
    brand_model: "",
    total_qty: "1",
    borrowed: "0",
    location: "",
    soft_hard: "N/A",
    e_location: "",
    bat_type: "",
    bat_qty: "",
    bat_total: "",
    yes_or_no: "NO",
    preventive_or_calibration: "",
    inhouse_outsourced: "",
    month: ""
  };

  const initialFormC = {
    num: "",
    description: "",
    location: "",
    quantity_opened: "0",
    quantity_unopened: "0",
    quantity_on_order: "0",
    remarks: "",
    experiment: "",
    subject: "",
    date_issued: "",
    issuance_no: "",
    stock_alert: "5"
  };
// Add this function near your other handler functions
// Update the handleGenerateReport function to handle responses with additional text:
const handleGenerateReport = async () => {
  setLoading(true);
  setReportText("");
  setReportTable(null);

  try {
    // Add "in json" to the question if it's not already there
    const formattedQuestion = question.toLowerCase().includes("json") 
      ? question 
      : `${question} in json`;

    const res = await axios.get(API_URL, {
      params: {
        sheet: "report",
        targetSheet: "non_consumable_inventory",
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
    } 
  } catch (err) {
    console.error(err);
  }

  setLoading(false);
};
const handleGeneratePDF = () => {
  if (!reportTable) return;
  
  // Create a printable version of the table
  const printContent = `
    <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1 { color: #b91c1c; }
        </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
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

  const handleEditClick = (item: InventoryItem | CInventoryItem) => {
    if (itemType === "Non-Consumable") {
      const nc = item as InventoryItem;
      setForm({ ...nc });

      if (nc.bat_type || nc.bat_qty) {
        setBattery("With Battery");
      } else {
        setBattery("Without Battery");
      }
    } else {
      const c = item as CInventoryItem;
      setForm2({ ...c });
    }

    setEditing(true);
    setViewing(false);
    setOpen(true);
  };

  const fieldStyle = {
    mt: 2,
    "& .MuiInputBase-input.Mui-disabled": {
      WebkitTextFillColor: "#333",
      color: "#333",
    },
    "& .MuiOutlinedInput-root.Mui-disabled": {
      backgroundColor: "#f5f5f5",
    },
  };

  const filteredInventory = inventory.filter((item) =>
    [item.equipment_name, item.location, item.brand_model]
      .some((field) =>
        String(field || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const filteredCInventory = cinventory.filter((item) =>
    [item.description, item.location, item.remarks]
      .some((field) =>
        String(field || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (itemType === "Non-Consumable") {
      if (!form.equipment_name?.trim()) newErrors.equipment_name = "Name is required";
    } else {
      if (!form2.description?.trim()) newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleViewClick = (item: InventoryItem | CInventoryItem) => {
    if (itemType === "Non-Consumable") {
      setForm(item as InventoryItem);

      if ((item as InventoryItem).bat_type || (item as InventoryItem).bat_qty) {
        setBattery("With Battery");
      } else {
        setBattery("Without Battery");
      }
    } else {
      setForm2(item as CInventoryItem);
    }

    setViewing(true);
    setEditing(false);
    setOpen(true);
  };

  const resetForm = () => {
    setEditing(false);
    setViewing(false);
    if (itemType === "Non-Consumable") {
      setForm(initialFormNC);
    } else {
      setForm2(initialFormC);
    }
  };

  useEffect(() => {
    const qty = Number(form.total_qty) || 0;
    const newStatuses = Array.from({ length: qty }, (_, i) => 
      form.statuses?.[i] || "working"
    );
    setForm((prev) => ({ ...prev, statuses: newStatuses }));
  }, [form.total_qty]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const sheet = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";
      const response = await axios.get(API_URL, {
        params: { sheet, action: "read" },
      });

      const result = response.data;
      if (result.success) {
        const rows = result.data;
        const headers = rows[1];
        const idx = (key: string) => headers.indexOf(key);

        if (itemType === "Non-Consumable") {
          const parsed: InventoryItem[] = rows.slice(2).map((row: any[]) => {
            const identifiersRaw = row[idx("IDENTIFIER_NUMBER")] || "";
            const identifiers = identifiersRaw
              ? String(identifiersRaw)
                  .split(",")
                  .map((id: string) =>
                    id.trim().replace(/^\{|\}$/g, "")
                  )
              : [];

            const statusesRaw = row[idx("STATUS")] || "";
            const statuses = statusesRaw
              ? String(statusesRaw)
                  .split(",")
                  .map((s: string) => s.trim().toLowerCase())
              : [];

            return {
              num: row[idx("NO.")],
              equipment_name: row[idx("EQUIPMENT_NAME")],
              facility: row[idx("FACILITY")],
              brand_model: row[idx("BRAND_MODEL")],
              total_qty: row[idx("TOTAL_QTY")],
              borrowed: row[idx("BORROWED")],
              identifier_type: row[idx("IDENTIFIER_TYPE")],
              identifiers,
              statuses,
              location: row[idx("LOCATION")],
              soft_hard: row[idx("SOFT_HARD")],
              e_location: row[idx("E_LOCATION")],
              bat_type: row[idx("BAT_TYPE")],
              bat_qty: row[idx("BAT_QTY")],
              bat_total: row[idx("BAT_TOTAL")],
              yes_or_no: row[idx("YES_OR_NO")],
              preventive_or_calibration: row[idx("PREVENTIVE_OR_CALIBRATION")],
              inhouse_outsourced: row[idx("INHOUSE/OUTSOURCED")],
              month: row[idx("MONTH")],
            };
          });
          setInventory(parsed);
        } else {
          const parsed: CInventoryItem[] = rows.slice(2).map((row: any[]) => ({
            num: row[idx("NO.")],
            location: row[idx("LOCATION")],
            description: row[idx("DESCRIPTION")],
            quantity_opened: row[idx("QUANTITY_OPENED")],
            quantity_unopened: row[idx("QUANTITY_UNOPENED")],
            quantity_on_order: row[idx("QUANTITY_ON_ORDER")],
            remarks: row[idx("REMARKS")],
            experiment: row[idx("EXPERIMENT")],
            subject: row[idx("SUBJECT")],
            date_issued: row[idx("DATE_ISSUED")],
            issuance_no: row[idx("ISSUANCE_NO")],
            stock_alert: row[idx("STOCK_ALERT")],
          }));
          setCInventory(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [itemType]);

  const handleCreate = async () => {
    setProcessing(true);
    try {
      if (itemType === "Non-Consumable") {
        const totalQty = Number(form.total_qty) || 0;
        const identifiers = form.identifiers.slice(0, totalQty);

        const res = await axios.get(API_URL, {
          params: {
            sheet: "nc_inventory",
            action: "create",
            ...form,
            identifiers: identifiers.map(id => `{${id}}`).join(","),
            statuses: form.statuses.join(","),
          },
        });

        const inventoryNum = res.data.data.equipment_num; 

        if (form.month && form.month.trim() !== "") {
          for (let id of identifiers) {
            await axios.get(API_URL, {
              params: {
                sheet: "maintenance",
                action: "create",
                ...form,
                equipment_num: inventoryNum,
                identifier_number: id,
              },
            });
          }
        }

        setForm(initialFormNC);
        fetchInventory();
      } else {
        await axios.get(API_URL, {
          params: {
            sheet: "c_inventory",
            action: "create",
            ...form2,
          },
        });

        setForm2(initialFormC);
        fetchInventory();
      }

      setOpen(false);
    } catch (err) {
      console.error("Failed to create item", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (item: any) => {
    const sheet = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";
    const name =
      itemType === "Non-Consumable"
        ? item.equipment_name
        : item.description;

    if (
      !window.confirm(
        `Are you sure you want to delete "${name}"`
      )
    )
      return;

    try {
      await axios.get(API_URL, {
        params: {
          sheet,
          action: "delete",
          num: item.num,
        },
      });

      fetchInventory();
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const handleUpdateItem = async () => {
    setProcessing(true);
    try {
      if (itemType === "Non-Consumable") {
        const totalQty = Number(form.total_qty) || 0;
        const trimmedIdentifiers = form.identifiers
          .slice(0, totalQty)
          .map(id => `{${id}}`);

        await axios.get(API_URL, {
          params: {
            sheet: "nc_inventory",
            action: "update",
            ...form,
            identifiers: trimmedIdentifiers.join(", "),
            statuses: form.statuses.join(","),
          },
        });

        setForm(initialFormNC);
        fetchInventory();
      } else {
        await axios.get(API_URL, {
          params: {
            sheet: "c_inventory",
            action: "update",
            ...form2,
          },
        });

        setForm2(initialFormC);
        fetchInventory();
      }

      setOpen(false);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update item", err);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const queryType = searchParams.get("stock");
    if (queryType === "Alert") {
      setItemType("Consumable");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={processing}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} thickness={4} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Processing...
          </Typography>
        </Stack>
      </Backdrop>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color="#b91c1c" gutterBottom>
          Inventory Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage equipment and consumable inventory
        </Typography>
      </Box>

      {/* Summary cards */}
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
    <Inventory2Icon sx={{ fontSize: 30, color: "#b91c1c" }} />
  </Box>
  <Box>
    <Typography variant="caption" color="text.secondary" fontWeight="medium">
      Total Items
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: "bold", color: "#b91c1c" }}>
      {itemType === "Consumable" ? cinventory.length : inventory.length}
    </Typography>
  </Box>
</Card>


        {itemType === "Consumable" && (
          <Card
            onClick={() => {
              setLowStockOpen(true);
              if (searchParams.get("stock") === "Alert") {
                searchParams.delete("stock");
              } else {
                searchParams.set("stock", "Alert");
              }
              setSearchParams(searchParams);
            }}
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.2)} 100%)`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              animation: queryType === "Alert" ? `${blink} 1.2s infinite ease-in-out` : "none",
              "&:hover": { boxShadow: 4 },
            }}
          >
            <Box sx={{ 
              p: 1.5, 
              borderRadius: "50%", 
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <WarningAmberIcon sx={{ fontSize: 30, color: theme.palette.warning.main }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Low Stock
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.warning.main }}>
                {cinventory.filter((i) => {
                  const alert = Number(i.stock_alert) || 5;
                  const qtyOpened = Number(i.quantity_opened) || 0;
                  return qtyOpened <= alert;
                }).length}
              </Typography>
            </Box>
          </Card>
        )}

        {itemType === "Non-Consumable" && (
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
              <AssignmentTurnedInIcon sx={{ fontSize: 30, color: theme.palette.success.main }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                Borrowed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.success.main }}>
                {inventory.reduce(
                  (acc, i) => acc + parseInt(i.borrowed || "0", 10),
                  0
                )}
              </Typography>
            </Box>
          </Card>
        )}
      </Stack>

      {/* Action Bar */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} justifyContent="space-between" alignItems="center">
        <Box sx={{ flex: 1, maxWidth: 400 }}>
          <TextField
            placeholder="Search name, description, location, brand/model..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                "& fieldset": {
                  borderRadius: 3,
                },
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
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
        </Box>
        
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
           {userRole === "Custodian" && (
          <Button
            variant="contained"
            onClick={() => {
              setOpen(true);
              resetForm();
            }}
            sx={{
              bgcolor: "#b91c1c",
              "&:hover": { bgcolor: "#b91c1c" },
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            + Add Item
          </Button>
           )}

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
            disabled={selectedItems.length === 0}
            onClick={async () => {
              const sheetName = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";
              const names = selectedItems
                .map((num) => {
                  const item = itemType === "Non-Consumable"
                    ? inventory.find((i) => i.num === num)
                    : cinventory.find((i) => i.num === num);
                  return item
                    ? itemType === "Non-Consumable"
                      ? (item as InventoryItem).equipment_name
                      : (item as CInventoryItem).description
                    : null;
                })
                .filter(Boolean);

              if (!window.confirm(`Are you sure you want to delete the following items?\n\n${names.join("\n")}`))
                return;

              try {
                await Promise.all(
                  selectedItems.map((num) =>
                    axios.get(API_URL, {
                      params: { sheet: sheetName, action: "delete", num },
                    })
                  )
                );
                setSelectedItems([]);
                fetchInventory();
              } catch (err) {
                console.error("Failed to delete selected items", err);
              }
            }}
          >
            Delete Selected ({selectedItems.length})
          </Button> )}
           {/* Add this AI Button */}
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
    startIcon={<AutoAwesomeIcon />} // You'll need to import this icon
  >
    AI Report
  </Button> )}
        </Stack>
      </Stack>

      {/* Item Type Toggle */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
        <ToggleButtonGroup
          value={itemType}
          exclusive
          fullWidth
          sx={{
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <ToggleButton
            value="Non-Consumable"
            selected={itemType === "Non-Consumable"}
            onClick={() => setItemType("Non-Consumable")}
            sx={{
              flex: 1,
              height: 48,
              textTransform: "none",
              fontSize: "0.9rem",
              fontWeight: "bold",
              "&.Mui-selected": {
                bgcolor: "#b91c1c",
                color: "#fff",
                "&:hover": { bgcolor: "#b91c1c" },
              },
            }}
          >
            Non-Consumable
          </ToggleButton>

          <ToggleButton
            value="Consumable"
            selected={itemType === "Consumable"}
            onClick={() => setItemType("Consumable")}
            sx={{
              flex: 1,
              height: 48,
              textTransform: "none",
              fontSize: "0.9rem",
              fontWeight: "bold",
              "&.Mui-selected": {
                bgcolor: "#b91c1c",
                color: "#fff",
                "&:hover": { bgcolor: "#b91c1c" },
              },
            }}
          >
            Consumable
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Inventory Table */}
      <Card
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader />
          </Box>
        ) : (itemType === "Non-Consumable" ? inventory : cinventory).length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Typography variant="body2" color="text.secondary">
              No inventory items found.
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
                          selectedItems.length > 0 &&
                          selectedItems.length < (itemType === "Non-Consumable" ? inventory.length : cinventory.length)
                        }
                        checked={
                          (itemType === "Non-Consumable" ? inventory.length : cinventory.length) > 0 &&
                          selectedItems.length === (itemType === "Non-Consumable" ? inventory.length : cinventory.length)
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems((itemType === "Non-Consumable" ? inventory : cinventory).map((item) => item.num));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        sx={{ color: "#b91c1c" }}
                      />
                    </TableCell>
                    {itemType === "Non-Consumable" ? (
                      <>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Name</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Location</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Brand/Model</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Quantity</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Borrowed</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Facility</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Action</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Description</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Location</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Quantity Opened</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Quantity Unopened</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Remarks</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Action</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(itemType === "Non-Consumable" ? filteredInventory : filteredCInventory)
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow key={item.num} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.includes(item.num)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems((prev) => [...prev, item.num]);
                              } else {
                                setSelectedItems((prev) => prev.filter((id) => id !== item.num));
                              }
                            }}
                            sx={{ color: "#b91c1c" }}
                          />
                        </TableCell>
                        {itemType === "Non-Consumable" ? (
                          <>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {(item as InventoryItem).equipment_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{(item as InventoryItem).location}</TableCell>
                            <TableCell>{(item as InventoryItem).brand_model}</TableCell>
                            <TableCell align="center">{(item as InventoryItem).total_qty}</TableCell>
                            <TableCell align="center">{(item as InventoryItem).borrowed}</TableCell>
                            <TableCell>{(item as InventoryItem).facility}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {(item as CInventoryItem).description}
                              </Typography>
                            </TableCell>
                            <TableCell>{(item as CInventoryItem).location}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={(item as CInventoryItem).quantity_opened} 
                                size="small" 
                                color={Number((item as CInventoryItem).quantity_opened) <= Number((item as CInventoryItem).stock_alert) ? "error" : "success"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">{(item as CInventoryItem).quantity_unopened}</TableCell>
                            <TableCell>{(item as CInventoryItem).remarks}</TableCell>
                          </>
                        )}
                        <TableCell>
                          <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="View">
  <IconButton
    color="default"
    onClick={() => handleViewClick(item)}
   sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#484848ff", color: "#fff" },
        p: 1,
      }}
  >
    <Inventory2Icon fontSize="small" />
  </IconButton>
</Tooltip>
{userRole === "Custodian" && (
  <Tooltip title="Update">
    <IconButton
      color="primary"
       onClick={() => handleEditClick(item)}
      sx={{
        bgcolor: "#e3f2fd",
        "&:hover": { bgcolor: "#90caf9" },
        p: 1,
      }}
    >
      <EditIcon fontSize="small" />
    </IconButton>
  </Tooltip>
)}

{userRole === "Custodian" && (

  <Tooltip title="Delete">
    <IconButton
      color="error"
      onClick={() => handleDelete(item)}
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
              count={itemType === "Non-Consumable" ? filteredInventory.length : filteredCInventory.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          </>
        )}
      </Card>

<Dialog open={open} onClose={() => {
    setOpen(false);
    resetForm();
  }} maxWidth="lg" fullWidth>
<DialogTitle
  sx={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    color: "#B71C1C",
  }}
>
  {editing ? "Edit Item" : viewing ? "View Item" : "Add Item"}

  {/* Buttons on the same row */}
  <Box sx={{ display: "flex", gap: 1 }}>
    {viewing ? (
      <Button
        onClick={() => {
          setOpen(false);
          setViewing(false);
          resetForm();
        }}
        sx={{
          textTransform: "none",
          fontWeight: "bold",
          color: "#B71C1C",
          "&:hover": { bgcolor: "rgba(183,28,28,0.08)" },
        }}
      >
        Close
      </Button>
    ) : (
      <>
        <Button
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          sx={{
            textTransform: "none",
            fontWeight: "bold",
            color: "#B71C1C",
            "&:hover": { bgcolor: "rgba(183,28,28,0.08)" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
         onClick={() => {
    if (!validateForm()) return; // show errors instead of saving
    editing ? handleUpdateItem() : handleCreate();
  }}
          sx={{
            bgcolor: "#B71C1C",
            color: "#FFF",
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: "8px",
            "&:hover": { bgcolor: "#D32F2F" },
          }}
        >
          {editing ? "Update" : "Save"}
        </Button>
      </>
    )}
  </Box>
</DialogTitle>
<DialogContent dividers>
  {itemType === "Non-Consumable" ? (// ==================================================
// NON-CONSUMABLE FORM (with Identifier Section)
// ==================================================
<Box sx={{ display: "flex", gap: 2 }}>
  {/* LEFT BOX */}
  <Box sx={{ flex: 1 }}>
    <Stack spacing={2}>
      {/* Item Type Selection */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Item Type
        </Typography>
        <ToggleButtonGroup
          value={itemType}
          exclusive
          onChange={(_, value) => value && setItemType(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Non-Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Non-Consumable
          </ToggleButton>
          <ToggleButton
            value="Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Consumable
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* === Non-Consumable Fields === */}
      <TextField
        label="Name"
        value={form.equipment_name}
        onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
        error={!!errors.equipment_name}
  helperText={errors.equipment_name}
      />
      <TextField
        label="Brand/Model"
        value={form.brand_model}
        onChange={(e) => setForm({ ...form, brand_model: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />

      <Stack spacing={2} direction="row">
        <TextField
          label="Facility"
          value={form.facility}
          onChange={(e) => setForm({ ...form, facility: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Location (Room & Shelf No.)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>

      <Stack spacing={2} direction="row">
        <TextField
          label="Total Quantity"
          type="number"
          value={form.total_qty}
          onChange={(e) =>
            setForm({ ...form, total_qty: e.target.value})
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Battery Information
        </Typography>
        <ToggleButtonGroup
          value={battery}
          exclusive
          onChange={(_, value) => value && setBattery(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Without Battery"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Without Battery
          </ToggleButton>
          <ToggleButton
            value="With Battery"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            With Battery
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {battery === "With Battery" && (
        <Stack spacing={2} direction="row">
          <TextField
            label="Battery Type"
            value={form.bat_type}
            onChange={(e) => setForm({ ...form, bat_type: e.target.value })}
            fullWidth
            variant="outlined"
            sx={fieldStyle}
            disabled={viewing}
          />
          <TextField
            label="Battery Quantity"
            type="number"
            value={form.bat_qty}
            onChange={(e) => setForm({ ...form, bat_qty: e.target.value })}
            fullWidth
            variant="outlined"
            sx={fieldStyle}
            disabled={viewing}
          />
        </Stack>
      )}

      {/* Equipment Manual */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Equipment Manual
        </Typography>
        <ToggleButtonGroup
          value={form.soft_hard}
          exclusive
          onChange={(_, value) => value && setForm({ ...form, soft_hard: value })}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton value="Soft Copy" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            Soft Copy
          </ToggleButton>
          <ToggleButton value="Hard Copy" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            Hard Copy
          </ToggleButton>
          <ToggleButton value="N/A" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            None
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {form.soft_hard !== "N/A" && (
        <Stack spacing={2} direction="row">
          {viewing && form.soft_hard === "Soft Copy" ? (
            <Typography
              component="a"
              href={form.e_location}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                mt: 2,
                display: "block",
                color: "primary.main",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {form.e_location || "No link provided"}
            </Typography>
          ) : (
            <TextField
              label="Description"
              value={form.e_location}
              onChange={(e) => setForm({ ...form, e_location: e.target.value })}
              fullWidth
              variant="outlined"
              sx={fieldStyle}
              disabled={viewing}
            />
          )}
        </Stack>
      )}
    </Stack>
  </Box>

  {/* Divider between left and right */}
  <Divider orientation="vertical" flexItem />

  {/* RIGHT BOX */}
  <Box
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Stack spacing={2}>
      {/* Identifier Section */}
<Box>
  <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
    Maintenance Information
  </Typography>

  {/* Yes or No Maintenance */}
  <ToggleButtonGroup
    value={form.yes_or_no}
    exclusive
    onChange={(_, value) => {
      if (value) {
        setForm((prev) => ({ ...prev, yes_or_no: value }));
      }
    }}
    fullWidth
    disabled={viewing}
  >
    <ToggleButton
      value="NO"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Without Maintenance
    </ToggleButton>
    <ToggleButton
      value="YES"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      With Maintenance
    </ToggleButton>
  </ToggleButtonGroup>

  {/* Show only if maintenance = yes */}
  {form.yes_or_no === "YES" && (
    <Box mt={2}>
      {/* Preventive / Calibration / Both */}
      <ToggleButtonGroup
        value={form.preventive_or_calibration}
        exclusive
        onChange={(_, value) => {
          if (value) {
            setForm((prev) => ({ ...prev, preventive_or_calibration: value }));
          }
        }}
        fullWidth
        disabled={viewing}
      >
        <ToggleButton value="PREVENTIVE">Preventive</ToggleButton>
        <ToggleButton value="CALIBRATION">Calibration</ToggleButton>
        <ToggleButton value="BOTH">Both</ToggleButton>
      </ToggleButtonGroup>
       <Box mt={2}>
      <ToggleButtonGroup
        value={form.inhouse_outsourced}
        exclusive
        onChange={(_, value) => {
          if (value) {
            setForm((prev) => ({ ...prev, inhouse_outsourced: value }));
          }
        }}
        fullWidth
        disabled={viewing}
      >
        <ToggleButton value="IN-HOUSE">IN-HOUSE</ToggleButton>
        <ToggleButton value="OUTSOURCE">OUTSOURCE</ToggleButton>
      </ToggleButtonGroup>
      </Box>
      {/* Month Selection */}
      <Box mt={2}>
        <ToggleButtonGroup
        disabled={viewing}
          value={form.month}
          exclusive
          onChange={(_, value) => {
            if (value) {
              setForm((prev) => ({ ...prev, month: value }));
            }
          }}
          fullWidth
        >
          {[
            "JAN","FEB","MAR","APR","MAY","JUN",
            "JUL","AUG","SEP","OCT","NOV","DEC",
          ].map((m) => (
            <ToggleButton key={m} value={m} sx={{ flex: 1 }}>
              {m.toUpperCase()}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  )}
</Box>
    <Box>
  <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
    Identifier
  </Typography>

  {/* Toggle for type */}
  <ToggleButtonGroup
    value={form.identifier_type}
    exclusive
    onChange={(_, value) => {
      if (value) {
        setForm({
          ...form,
          identifier_type: value,
          identifiers: value === "None" ? [] : form.identifiers, // clear if None
        });
      }
    }}
    fullWidth
    disabled={viewing}
  >
    <ToggleButton
      value="Control Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Control
    </ToggleButton>
    <ToggleButton
      value="Serial Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Serial
    </ToggleButton>
    <ToggleButton
      value="Inventory Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Inventory
    </ToggleButton>
    <ToggleButton
      value="None"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#9E9E9E",
          color: "#FFF",
          "&:hover": { bgcolor: "#757575" },
        },
      }}
    >
      None
    </ToggleButton>
  </ToggleButtonGroup>

  {/* Input fields for numbers */}
{form.identifier_type !== "None" && (
  <Stack spacing={2} sx={{ mt: 2 }}>
    {/* Header row */}
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1, fontWeight: "bold", color: "text.secondary" }}>
        {form.identifier_type || "Identifier"}
      </Box>
      <Box sx={{ width: 80, textAlign: "center", fontWeight: "bold", color: "text.secondary" }}>
        Status
      </Box>
    </Stack>

    {/* Rows */}
  {Array.from({ length: Number(form.total_qty) || 0 }).map((_, i) => (
  <Stack key={i} direction="row" spacing={1} alignItems="center">
    <TextField
      label={`${form.identifier_type || "Identifier"} ${i + 1}`}
      value={form.identifiers?.[i] || ""}
      onChange={(e) => {
        const newIdentifiers = [...(form.identifiers || [])];
        newIdentifiers[i] = e.target.value;
        setForm({ ...form, identifiers: newIdentifiers });
      }}
      fullWidth
      disabled={viewing}
      sx={fieldStyle}
    />

    {/* Square status toggle */}
    <Box
      onClick={() => {
        if (viewing) return;
        const newStatuses = [...(form.statuses || [])];
        newStatuses[i] =
          form.statuses?.[i] === "working" ? "not working" : "working";
        setForm({ ...form, statuses: newStatuses });
      }}
      sx={{
        width: 24,
        height: 24,
        borderRadius: 1,
        bgcolor: form.statuses?.[i] === "not working" ? "red" : "green",
        cursor: viewing ? "default" : "pointer",
        border: "2px solid #333",
        ml: 1,
      }}
    />

    {/* Delete button */}
    {!viewing && (
      <IconButton
        onClick={() => {
          const newIdentifiers = [...(form.identifiers || [])];
          const newStatuses = [...(form.statuses || [])];
          newIdentifiers.splice(i, 1); // remove identifier at i
          newStatuses.splice(i, 1);   // remove status at i
          setForm({
            ...form,
            identifiers: newIdentifiers,
            statuses: newStatuses,
            total_qty: newIdentifiers.length.toString(),
          });
        }}
        size="small"
        sx={{ color: "#B71C1C" }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    )}
  </Stack>
))}
  </Stack>
)}

</Box>
    </Stack>
  </Box>
</Box>
) : (// ==================================================
// NON-CONSUMABLE FORM (cleaned with Stock Alert)
// ==================================================
<Box sx={{ display: "flex", gap: 2 }}>
  {/* LEFT BOX */}
  <Box sx={{ flex: 1 }}>
    <Stack spacing={2}>
      {/* Item Type Selection */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Item Type
        </Typography>
        <ToggleButtonGroup
          value={itemType}
          exclusive
          onChange={(_, value) => value && setItemType(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Non-Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Non-Consumable
          </ToggleButton>
          <ToggleButton
            value="Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Consumable
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* === Non-Consumable Fields === */}
      <TextField
        label="Description"
        value={form2.description}
        onChange={(e) => setForm2({ ...form2, description: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
        error={!!errors.description}
  helperText={errors.description}
      />

      <TextField
        label="Location"
        value={form2.location}
        onChange={(e) => setForm2({ ...form2, location: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />

      {/* Quantity Fields */}
      <Stack spacing={2} direction="row">
        <TextField
          label="Quantity (Opened)"
          type="number"
          value={form2.quantity_opened}
          onChange={(e) =>
            setForm2({ ...form2, quantity_opened: e.target.value })
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Quantity (Unopened)"
          type="number"
          value={form2.quantity_unopened}
          onChange={(e) =>
            setForm2({ ...form2, quantity_unopened: e.target.value })
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Quantity (On Order)"
          type="number"
          value={form2.quantity_on_order}
          onChange={(e) =>
            setForm2({ ...form2, quantity_on_order: e.target.value })
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>

      {/* Stock Alert */}
      <TextField
        label="Stock Alert"
        type="number"
        value={form2.stock_alert}
        onChange={(e) => setForm2({ ...form2, stock_alert: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={{ ...fieldStyle, mt: 1 }}
      />
    </Stack>
  </Box>

  {/* Divider */}
  <Divider orientation="vertical" flexItem />

  {/* RIGHT BOX */}
  <Box
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Stack spacing={2}>
      <TextField
        label="Date Issued"
        type="date"
        value={form2.date_issued}
        onChange={(e) =>
          setForm2({ ...form2, date_issued: e.target.value })
        }
        fullWidth
        disabled={viewing}
        InputLabelProps={{ shrink: true }}
        sx={fieldStyle}
      />
      <TextField
        label="Issuance No."
        value={form2.issuance_no}
        onChange={(e) =>
          setForm2({ ...form2, issuance_no: e.target.value })
        }
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
      <TextField
        label="Remarks"
        value={form2.remarks}
        onChange={(e) => setForm2({ ...form2, remarks: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
      <TextField
        label="Experiment"
        value={form2.experiment}
        onChange={(e) => setForm2({ ...form2, experiment: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
      <TextField
        label="Subject"
        value={form2.subject}
        onChange={(e) => setForm2({ ...form2, subject: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
    </Stack>
  </Box>
</Box>
)}
</DialogContent>

</Dialog>
<Dialog
  open={lowStockOpen}
  onClose={() => setLowStockOpen(false)}
  fullWidth
  maxWidth="lg"
>
  <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C" }}>
    Low Stock Items
  </DialogTitle>

  <DialogContent>
    {/* Search Bar */}
    <TextField
      placeholder="Search items..."
      value={lowStockSearch}
      onChange={(e) => setLowStockSearch(e.target.value)}
      fullWidth
      sx={{ mb: 2 }}
    />

    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><b>Description</b></TableCell>
            <TableCell align="center"><b>Quantity (Opened)</b></TableCell>
            <TableCell align="center"><b>Quantity (Unopened)</b></TableCell>
            <TableCell align="center"><b>Quantity (On-Order)</b></TableCell>
            <TableCell align="center"><b>Stock Alert</b></TableCell>
            <TableCell align="center"><b>Actions</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cinventory
            .filter(i => {
              const alert = Number(i.stock_alert) || 5;
              const qtyOpened = Number(i.quantity_opened) || 0;
              return qtyOpened <= alert;
            })
            .filter(i =>
              i.description?.toLowerCase().includes(lowStockSearch.toLowerCase()) ||
              i.location?.toLowerCase().includes(lowStockSearch.toLowerCase())
            )
            .map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.description}</TableCell>
                <TableCell align="center">{row.quantity_opened}</TableCell>
                <TableCell align="center">{row.quantity_unopened}</TableCell>
                <TableCell align="center">{row.quantity_on_order}</TableCell>
                <TableCell align="center">{row.stock_alert || 5}</TableCell>
                <TableCell align="center">
                  {/* same icons as your main table */}
    <Tooltip title="View">
  <IconButton
    color="default"
    onClick={() => handleViewClick(row)}
   sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#484848ff", color: "#fff" },
        p: 1,
      }}
  >
    <Inventory2Icon fontSize="small" />
  </IconButton>
</Tooltip>
                   <Tooltip title="Update">
    <IconButton
      color="primary"
       onClick={() => handleEditClick(row)}
      sx={{
        bgcolor: "#e3f2fd",
        "&:hover": { bgcolor: "#90caf9" },
        p: 1,
      }}
    >
      <EditIcon fontSize="small" />
    </IconButton>
  </Tooltip>

                <Tooltip title="Delete">
    <IconButton
      color="error"
      onClick={() => handleDelete(row)}
      sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#f44336", color: "#fff" },
        p: 1,
      }}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setLowStockOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>

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
};

export default InventoryPage;