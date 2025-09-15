// src/pages/MaintenancePage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import {
  Box,
  Card,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Button
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface MaintenanceItem {
  num: string;
  equipment_num: string;
  equipment_name: string;
  brand_model: string;
  identifier_type: string;
  identifier_number: string;
  month: string;
  date_accomplished: string;
  accomplished_by: string;
}

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const MaintenancePage = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    num: "",
    accomplished_by: ""
  });

  // Get current month abbreviation (e.g., "SEP")
  const getCurrentMonth = () => {
    const date = new Date();
    return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  };

  // Get current year
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return "-";
  
  try {
    // Handle ISO format (2024-09-15T16:00:00.000Z)
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Handle other formats if needed
    return dateString;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Return original string if formatting fails
  }
};
  // Get current month number (0-11)
  const getCurrentMonthNumber = () => {
    return new Date().getMonth();
  };

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const currentMonthNumber = getCurrentMonthNumber();

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: { sheet: "maintenance", action: "read" },
      });

      const result = response.data;
      if (result.success) {
        const rows = result.data;
        const headers = rows[1];
        const idx = (key: string) => headers.indexOf(key);

        const parsed: MaintenanceItem[] = rows.slice(2).map((row: any[]) => ({
          num: row[idx("NO.")] || "",
          equipment_num: row[idx("EQUIPMENT_NO")] || "",
          equipment_name: row[idx("EQUIPMENT_NAME")] || "",
          brand_model: row[idx("BRAND_MODEL")] || "",
          identifier_type: row[idx("IDENTIFIER_TYPE")] || "",
          identifier_number: row[idx("IDENTIFIER_NUMBER")] || "",
          month: row[idx("MONTH")] || "",
          date_accomplished: row[idx("DATE_ACCOMPLISHED")] || "",
          accomplished_by: row[idx("ACCOMPLISHED_BY")] || "",
        }));

        setMaintenance(parsed);
      }
    } catch (err) {
      console.error("Failed to fetch maintenance records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleUpdateItem = async () => {
    try {
      await axios.get(API_URL, {
        params: {
          sheet: "maintenance",
          action: "update",
          num: form.num,
          accomplished_by: form.accomplished_by
        },
      });

      setForm({
        num: "",
        accomplished_by: ""
      });

      fetchMaintenance();
      setOpen(false);
    } catch (err) {
      console.error("Failed to update maintenance record", err);
    }
  };

  const handleEditClick = (item: MaintenanceItem) => {
    setForm({ 
      num: item.num,
      accomplished_by: item.accomplished_by || ""
    });
    setOpen(true);
  };

  const resetForm = () => {
    setForm({
      num: "",
      accomplished_by: ""
    });
  };

  // Check if maintenance is done for current year
  const isDoneThisYear = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getFullYear() === currentYear;
  };

  // Check if maintenance is done for current month
  const checkDoneThisMonth = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonthNumber;
  };

  // Group maintenance items by month
  const maintenanceByMonth: Record<string, MaintenanceItem[]> = {};
  months.forEach(month => {
    maintenanceByMonth[month] = maintenance.filter(item => item.month === month);
  });

  // Calculate completed this month count
  const completedThisMonth = maintenance.filter(item => checkDoneThisMonth(item.date_accomplished)).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Summary cards */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
        <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <EventIcon sx={{ fontSize: 30, color: "#0D47A1" }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Current Month</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#0D47A1" }}>
              {maintenance.filter(i => i.month === currentMonth).length}
            </Typography>
          </Box>
        </Card>

        <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <CheckCircleIcon sx={{ fontSize: 30, color: "#1B5E20" }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Completed This Month</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#1B5E20" }}>
              {completedThisMonth}
            </Typography>
          </Box>
        </Card>

        <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Inventory2Icon sx={{ fontSize: 30, color: "#B71C1C" }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Completed This Year</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#B71C1C" }}>
              {maintenance.filter(i => isDoneThisYear(i.date_accomplished)).length}
            </Typography>
          </Box>
        </Card>
      </Stack>

      {/* Current Month Table */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, color: "#B71C1C" }}>
        {currentMonth} - Maintenance Schedule
      </Typography>
      
      <Card
        sx={{
          p: { xs: 1.5, sm: 3 },
          borderRadius: 3,
          backgroundColor: "#fff",
          marginBottom: 3,
        }}
      >
        {loading ? (
          <Loader />
        ) : maintenanceByMonth[currentMonth]?.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No maintenance records found for {currentMonth}.
          </Typography>
        ) : (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Table
              sx={{
                minWidth: 650,
                "& th": { bgcolor: "#f4f4f4", fontWeight: "bold", fontSize: { xs: "0.65rem", sm: "0.85rem" } },
                "& td": { fontSize: { xs: "0.65rem", sm: "0.85rem" } },
                "& tr:hover": { bgcolor: "#fbe9e7" },
              }}
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Equipment Name</TableCell>
                  <TableCell>Brand/Model</TableCell>
                  <TableCell>Identifier Type</TableCell>
                  <TableCell>Identifier Number</TableCell>
                  <TableCell>Last Date Accomplished</TableCell>
                  <TableCell>Accomplished By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceByMonth[currentMonth]?.map((item) => {
                  const isDone = isDoneThisYear(item.date_accomplished);
                  const doneThisMonth = checkDoneThisMonth(item.date_accomplished);
                  return (
                    <TableRow key={item.num}>
                      <TableCell>{item.equipment_name}</TableCell>
                      <TableCell>{item.brand_model}</TableCell>
                      <TableCell>{item.identifier_type}</TableCell>
                      <TableCell>{item.identifier_number}</TableCell>
                      <TableCell>{formatDateDisplay(item.date_accomplished) || "-"}</TableCell>
                      <TableCell>{item.accomplished_by || "-"}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: isDone ? 
                              (doneThisMonth ? '#4caf50' : '#e8f5e9') : '#fff3e0',
                            color: isDone ? 
                              (doneThisMonth ? '#ffffff' : '#2e7d32') : '#f57c00',
                            fontWeight: 'medium',
                            fontSize: '0.75rem'
                          }}
                        >
                          {doneThisMonth ? 'Completed This Month' : 
                           isDone ? 'Completed' : 'Calibrate'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title={isDone ? "View Details" : "Mark as Done"}>
                            <IconButton
                              color={isDone ? "success" : "primary"}
                              onClick={() => handleEditClick(item)}
                              sx={{
                                bgcolor: isDone ? "#e8f5e9" : "#e3f2fd",
                                "&:hover": { 
                                  bgcolor: isDone ? "#c8e6c9" : "#90caf9",
                                  color: isDone ? "#2e7d32" : "#1976d2"
                                },
                                p: 1,
                              }}
                            >
                              {isDone ? <Inventory2Icon fontSize="small" /> : <EditIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Monthly Tables for JAN to DEC */}
      {months.map((month) => (
        month !== currentMonth && (
          <Box key={month}>
            <Typography variant="h6" sx={{ mt: 3, mb: 2, color: "#0D47A1" }}>
              {month} - Maintenance Schedule
            </Typography>
            
            <Card
              sx={{
                p: { xs: 1.5, sm: 3 },
                borderRadius: 3,
                backgroundColor: "#fff",
                marginBottom: 3,
              }}
            >
              {maintenanceByMonth[month]?.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No maintenance records found for {month}.
                </Typography>
              ) : (
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                  <Table
                    sx={{
                      minWidth: 650,
                      "& th": { bgcolor: "#f4f4f4", fontWeight: "bold", fontSize: { xs: "0.65rem", sm: "0.85rem" } },
                      "& td": { fontSize: { xs: "0.65rem", sm: "0.85rem" } },
                      "& tr:hover": { bgcolor: "#fbe9e7" },
                    }}
                    size="small"
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>Equipment No.</TableCell>
                        <TableCell>Equipment Name</TableCell>
                        <TableCell>Brand/Model</TableCell>
                        <TableCell>Identifier Type</TableCell>
                        <TableCell>Identifier Number</TableCell>
                        <TableCell>Last Date Accomplished</TableCell>
                        <TableCell>Accomplished By</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {maintenanceByMonth[month]?.map((item) => {
                        const isDone = isDoneThisYear(item.date_accomplished);
                        const doneThisMonth = checkDoneThisMonth(item.date_accomplished);
                        return (
                          <TableRow key={item.num}>
                            <TableCell>{item.equipment_num}</TableCell>
                            <TableCell>{item.equipment_name}</TableCell>
                            <TableCell>{item.brand_model}</TableCell>
                            <TableCell>{item.identifier_type}</TableCell>
                            <TableCell>{item.identifier_number}</TableCell>
                            <TableCell>{item.date_accomplished || "-"}</TableCell>
                            <TableCell>{item.accomplished_by || "-"}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'inline-block',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  backgroundColor: isDone ? 
                                    (doneThisMonth ? '#4caf50' : '#e8f5e9') : '#fff3e0',
                                  color: isDone ? 
                                    (doneThisMonth ? '#ffffff' : '#2e7d32') : '#f57c00',
                                  fontWeight: 'medium',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {doneThisMonth ? 'Completed This Month' : 
                                 isDone ? 'Completed' : 'Pending'}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Tooltip title={isDone ? "View Details" : "Mark as Done"}>
                                  <IconButton
                                    color={isDone ? "success" : "primary"}
                                    onClick={() => handleEditClick(item)}
                                    sx={{
                                      bgcolor: isDone ? "#e8f5e9" : "#e3f2fd",
                                      "&:hover": { 
                                        bgcolor: isDone ? "#c8e6c9" : "#90caf9",
                                        color: isDone ? "#2e7d32" : "#1976d2"
                                      },
                                      p: 1,
                                    }}
                                  >
                                    {isDone ? <Inventory2Icon fontSize="small" /> : <EditIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Card>
          </Box>
        )
      ))}

      {/* Update Dialog */}
      <Dialog open={open} onClose={() => {
        setOpen(false);
        resetForm();
      }} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            color: "#B71C1C",
          }}
        >
          Mark Maintenance as Done
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
        </DialogTitle>
        
        <DialogContent>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will mark the maintenance as completed for the current year ({currentYear}) 
            and record today's date automatically.
          </Typography>
          
          <TextField
            label="Accomplished By"
            value={form.accomplished_by}
            onChange={(e) => setForm({ ...form, accomplished_by: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            placeholder="Enter your name"
          />
          
          <Button
            onClick={handleUpdateItem}
            variant="contained"
            disabled={!form.accomplished_by.trim()}
            fullWidth
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              bgcolor: "#f8a41a",
              "&:hover": { bgcolor: "#D32F2F" },
              "&:disabled": { bgcolor: "#cccccc" },
            }}
          >
            Confirm Completion
          </Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default MaintenancePage;