// src/pages/MaintenancePage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Card,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  TableContainer,
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
  Button,
  Chip,
  alpha,
  useTheme,
  InputAdornment,
  CircularProgress,
  Backdrop,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup
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

const MaintenancePage = () => {
  const theme = useTheme();
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"current" | "all">("current");

  const [form, setForm] = useState({
    num: "",
    accomplished_by: ""
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return dateString;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
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
    setProcessing(true);
    try {
      await axios.get(API_URL, {
        params: {
          sheet: "maintenance",
          action: "update",
          num: form.num,
          accomplished_by: form.accomplished_by,
          date_accomplished: new Date().toISOString().split('T')[0]
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
    } finally {
      setProcessing(false);
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

  // Filter maintenance items based on search query
  const filteredMaintenance = maintenance.filter(item =>
    [item.equipment_name, item.brand_model, item.identifier_number, item.accomplished_by]
      .some(field => String(field || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter for current month items
  const currentMonthItems = filteredMaintenance.filter(item => item.month === currentMonth);

  // Calculate statistics
  const completedThisMonth = maintenance.filter(item => checkDoneThisMonth(item.date_accomplished)).length;
  const pendingThisMonth = currentMonthItems.filter(item => !checkDoneThisMonth(item.date_accomplished)).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={processing}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} thickness={4} sx={{ color: "#b91c1c"}} />
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Processing...
          </Typography>
        </Stack>
      </Backdrop>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color="#b91c1c" gutterBottom>
          Maintenance Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage equipment maintenance schedules
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
            <EventIcon sx={{ fontSize: 30, color: "#b91c1c" }} />
          </Box>
          <Box>
            <Typography variant="caption" color="#b91c1c" fontWeight="medium">Current Month</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#b91c1c" }}>
              {currentMonthItems.length}
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
            <Typography variant="caption" color="text.secondary" fontWeight="medium">Completed This Month</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.success.main }}>
              {completedThisMonth}
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
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.2)} 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Inventory2Icon sx={{ fontSize: 30, color: theme.palette.warning.main }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">Pending This Month</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.warning.main }}>
              {pendingThisMonth}
            </Typography>
          </Box>
        </Card>
      </Stack>

      {/* Action Bar */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} justifyContent="space-between" alignItems="center">
        <Box sx={{ flex: 1, maxWidth: 400 }}>
          <TextField
            placeholder="Search equipment, model, identifier..."
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
        </Box>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <ToggleButton
            value="current"
            sx={{
              height: 40,
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
            Current Month
          </ToggleButton>

          <ToggleButton
            value="all"
            sx={{
              height: 40,
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
            All Records
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Current Month Table */}
      <Typography variant="h5" sx={{ mt: 3, mb: 2, color: "#b91c1c" }}>
        {currentMonth} {currentYear} - Maintenance Schedule
      </Typography>
      
      <Card
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          marginBottom: 3,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Loader />
          </Box>
        ) : currentMonthItems.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
            <Typography variant="body2" color="text.secondary">
              No maintenance records found for {currentMonth}.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600, borderRadius: 2 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Equipment Name</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Brand/Model</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Identifier Type</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Identifier Number</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Last Date Accomplished</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Accomplished By</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Status</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentMonthItems
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => {
                      const isDone = isDoneThisYear(item.date_accomplished);
                      const doneThisMonth = checkDoneThisMonth(item.date_accomplished);
                      return (
                        <TableRow key={item.num} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.equipment_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.brand_model}</TableCell>
                          <TableCell>{item.identifier_type}</TableCell>
                          <TableCell>{item.identifier_number}</TableCell>
                          <TableCell>{formatDateDisplay(item.date_accomplished) || "-"}</TableCell>
                          <TableCell>{item.accomplished_by || "-"}</TableCell>
                          <TableCell>
                            <Chip 
                              label={doneThisMonth ? 'Completed This Month' : 
                                     isDone ? 'Completed' : 'Calibrate'} 
                              size="small"
                              color={doneThisMonth ? "success" : isDone ? "primary" : "warning"}
                              variant={doneThisMonth ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title={isDone ? "View Details" : "Mark as Done"}>
                                <IconButton
                                  onClick={() => handleEditClick(item)}
                                  sx={{
                                    bgcolor: isDone ? "success.light" : "#b91c1c",
                                    "&:hover": { 
                                      bgcolor: isDone ? "success.main" : "#b91c1c",
                                      color: "#fff"
                                    },
                                    color:'white'
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
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={currentMonthItems.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          </>
        )}
      </Card>

      {/* All Records Table (when viewMode is "all") */}
      {viewMode === "all" && (
        <>
          <Typography variant="h5" sx={{ mt: 3, mb: 2, color: "#b91c1c" }}>
            All Maintenance Records
          </Typography>
          
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: "background.paper",
              marginBottom: 3,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            {filteredMaintenance.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <Typography variant="body2" color="text.secondary">
                  No maintenance records found.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 600, borderRadius: 2 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Month</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Equipment Name</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Brand/Model</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Identifier Type</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Identifier Number</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Last Date Accomplished</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Accomplished By</TableCell>
                        <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Status</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMaintenance
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((item) => {
                          const isDone = isDoneThisYear(item.date_accomplished);
                          const doneThisMonth = checkDoneThisMonth(item.date_accomplished);
                          return (
                            <TableRow key={item.num} hover>
                              <TableCell>
                                <Chip label={item.month} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.equipment_name}
                                </Typography>
                              </TableCell>
                              <TableCell>{item.brand_model}</TableCell>
                              <TableCell>{item.identifier_type}</TableCell>
                              <TableCell>{item.identifier_number}</TableCell>
                              <TableCell>{formatDateDisplay(item.date_accomplished) || "-"}</TableCell>
                              <TableCell>{item.accomplished_by || "-"}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={doneThisMonth ? 'Completed This Month' : 
                                         isDone ? 'Completed' : 'Calibrate'} 
                                  size="small"
                                  color={doneThisMonth ? "success" : isDone ? "primary" : "warning"}
                                  variant={doneThisMonth ? "filled" : "outlined"}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <Tooltip title={isDone ? "View Details" : "Mark as Done"}>
                                    <IconButton
                                      color={isDone ? "success" : "primary"}
                                      onClick={() => handleEditClick(item)}
                                      sx={{
                                        bgcolor: isDone ? "success.light" : "primary.light",
                                        "&:hover": { 
                                          bgcolor: isDone ? "success.main" : "primary.main",
                                          color: "#fff"
                                        },
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
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredMaintenance.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{ borderTop: "1px solid", borderColor: "divider" }}
                />
              </>
            )}
          </Card>
        </>
      )}

      {/* Update Dialog */}
      <Dialog open={open} onClose={() => {
        setOpen(false);
        resetForm();
      }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
          Mark Maintenance as Done
          <Button
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              color: "#b91c1c",
              "&:hover": { bgcolor: "rgba(25,118,210,0.08)" },
            }}
          >
            Cancel
          </Button>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will mark the maintenance as completed for {currentYear} and record today's date.
          </Typography>
          
          <TextField
            label="Accomplished By"
            value={form.accomplished_by}
            onChange={(e) => setForm({ ...form, accomplished_by: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            placeholder="Enter your name"
            disabled={processing}
          />
          
          <Button
            onClick={handleUpdateItem}
            variant="contained"
            disabled={!form.accomplished_by.trim() || processing}
            fullWidth
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              bgcolor: "#b91c1c",
              "&:hover": { bgcolor: "#b91c1c" },
              "&:disabled": { bgcolor: "grey.300" },
            }}
          >
            {processing ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Confirm Completion"}
          </Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default MaintenancePage;