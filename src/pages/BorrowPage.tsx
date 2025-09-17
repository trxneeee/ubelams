// src/pages/BorrowPage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
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
  useTheme
} from "@mui/material";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

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
}

export default function BorrowPage() {
  const theme = useTheme();
  // records & inventory
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
// Add these state variables near your other useState declarations
const [aiDialogOpen, setAiDialogOpen] = useState(false);
const [question, setQuestion] = useState("");
const [loading, setLoading] = useState(false);
const [reportText, setReportText] = useState("");
const [reportTable, setReportTable] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  // selected items
  const [selectedItems, setSelectedItems] = useState<
    { num: string; name: string; qty: number; available: number }[]
  >([]);

  // dialog + stepper
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Borrower Info", "Select Item(s)", "Confirmation"];

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
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
// Add this function near your other handler functions
const handleGenerateReport = async () => {
  setLoading(true);
  setReportText("");
  setReportTable(null);

  try {
    const res = await axios.get(WEB_APP_URL, {
      params: {
        sheet: "report", // or whatever sheet you want to query
        targetSheet: "group_borrow", // adjust as needed
        q: question,
      },
    });

    const json = res.data;

    if (json.success && json.data) {
      try {
        const parsed = JSON.parse(json.data);
        if (parsed.columns && parsed.rows) {
          setReportTable(parsed);
        } else {
          setReportText(json.data);
        }
      } catch {
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

  // fetch inventory
  const fetchItems = async () => {
    setItemsLoading(true);
    try {
      const res = await axios.get(WEB_APP_URL, {
        params: { action: "read", sheet: "nc_inventory" },
      });
      const raw = res.data?.data;
      if (!raw || raw.length <= 2) {
        setItems([]);
        return;
      }

      const headers = raw[1];
      const idx = (key: string) => headers.indexOf(key);

      const parsed = raw.slice(2).map((row: any[]) => {
        const totalQty = parseInt(row[idx("TOTAL_QTY")] ?? "0") || 0;
        const borrowed = parseInt(row[idx("BORROWED")] ?? "0") || 0;
        return {
          num: String(row[idx("NO.")] ?? row[0] ?? ""),
          equipment_name: String(row[idx("EQUIPMENT_NAME")] ?? row[1] ?? ""),
          total_qty: totalQty,
          borrowed,
          available: Math.max(0, totalQty - borrowed),
          brand_model: String(row[idx("BRAND_MODEL")] ?? ""),
          location: String(row[idx("LOCATION")] ?? ""),
        } as BorrowItem;
      });

      setItems(parsed);
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
      items.filter(
        (it) =>
          it.equipment_name.toLowerCase().includes(search.toLowerCase()) ||
          (it.brand_model ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (it.location ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  // filter records
  const filteredRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          r.course?.toLowerCase().includes(search.toLowerCase()) ||
          r.group_leader?.toLowerCase().includes(search.toLowerCase()) ||
          r.instructor?.toLowerCase().includes(search.toLowerCase()) ||
          r.subject?.toLowerCase().includes(search.toLowerCase())
      ),
    [records, search]
  );

  // update item qty
  const updateItemQty = (
    num: string,
    delta: number,
    available: number,
    name: string
  ) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.num === num);
      if (!existing) {
        if (delta > 0) return [...prev, { num, name, qty: 1, available }];
        return prev;
      }
      const newQty = Math.max(0, Math.min(existing.qty + delta, available));
      if (newQty === 0) {
        return prev.filter((i) => i.num !== num);
      }
      return prev.map((i) => (i.num === num ? { ...i, qty: newQty } : i));
    });
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

    const itemsArr = (record.item?.split(",") || []).map((itm, idx) => ({
      num: `view-${idx}`,
      name: itm.replace(/[()]/g, "").trim(),
      qty: parseInt((record.quantity?.split(",")[idx] || "0").replace(/[()]/g, "")) || 0,
      available: 0,
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

    const itemsArr = (record.item?.split(",") || []).map((itm, idx) => ({
      num: `edit-${idx}`,
      name: itm.replace(/[()]/g, "").trim(),
      qty: parseInt((record.quantity?.split(",")[idx] || "0").replace(/[()]/g, "")) || 0,
      available: 999, // allow editing
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

  // save borrow
  const handleConfirmBorrow = async () => {
    if (selectedItems.length === 0) return;
    setSaving(true);
    try {
      const itemStr = selectedItems.map((s) => `(${s.name})`).join(",");
      const qtyStr = selectedItems.map((s) => `(${s.qty})`).join(",");

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
    const sum = String(r.quantity)
      .split(",")
      .map((s) => Number(s.replace(/[()]/g, "").trim() || 0))
      .reduce((a, b) => a + b, 0);
    return acc + sum;
  }, 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Summary cards */}      {/* Header */}
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
        <Box sx={{ flex: 1, maxWidth: 400 }}>
          <TextField
            placeholder="Search course, leader, instructor, subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
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

            {/* Add this AI Button */}
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
    AI
  </Button>
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
              <TextField
                label="Course"
                value={requestForm.course}
                onChange={(e) => setRequestForm({ ...requestForm, course: e.target.value })}
                fullWidth
                variant="outlined"
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Group Number"
                  value={requestForm.group_number}
                  onChange={(e) => setRequestForm({ ...requestForm, group_number: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Group Leader"
                  value={requestForm.group_leader}
                  onChange={(e) => setRequestForm({ ...requestForm, group_leader: e.target.value })}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Leader ID"
                  value={requestForm.group_leader_id}
                  onChange={(e) => setRequestForm({ ...requestForm, group_leader_id: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Instructor"
                  value={requestForm.instructor}
                  onChange={(e) => setRequestForm({ ...requestForm, instructor: e.target.value })}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Subject"
                value={requestForm.subject}
                onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                fullWidth
              />
              <TextField
                label="Schedule"
                value={requestForm.schedule}
                onChange={(e) => setRequestForm({ ...requestForm, schedule: e.target.value })}
                fullWidth
              />

              {/* Status: only editable if updating */}
              {requestForm.borrow_id && (
                <TextField
                  select
                  label="Status"
                  value={requestForm.status}
                  onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value })}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="Borrowed">Borrowed</option>
                  <option value="Returned">Returned</option>
                </TextField>
              )}
            </Stack>
          )}

          {/* Step 2: Select Items */}
          {activeStep === 1 && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  placeholder="Search item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="outlined" onClick={() => setSearch("")}>
                  Clear
                </Button>
              </Stack>

              {itemsLoading ? (
                <LinearProgress />
              ) : (
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Brand</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Available</TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>Quantity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((it) => {
                          const sel = selectedItems.find((s) => s.num === it.num);
                          return (
                            <TableRow key={it.num} hover>
                              <TableCell>{it.equipment_name}</TableCell>
                              <TableCell>{it.brand_model}</TableCell>
                              <TableCell>{it.location}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={it.available} 
                                  size="small" 
                                  color={it.available > 0 ? "success" : "error"}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => updateItemQty(it.num, -1, it.available, it.equipment_name)}
                                    disabled={!sel}
                                    sx={{ minWidth: 30 }}
                                  >
                                    –
                                  </Button>
                                  <Typography sx={{ minWidth: 28, textAlign: "center" }}>{sel?.qty ?? 0}</Typography>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => updateItemQty(it.num, +1, it.available, it.equipment_name)}
                                    disabled={it.available <= 0}
                                    sx={{ minWidth: 30 }}
                                  >
                                    +
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Stack>
          )}

          {/* Step 3: Confirmation */}
          {activeStep === 2 && (
            <Stack spacing={2}>
              <Card sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography fontWeight={700} color="#b91c1c" gutterBottom>
                  {requestForm.course} — {requestForm.subject}
                </Typography>
                <Typography variant="body2" color="#b91c1c">
                  Group {requestForm.group_number} • Leader: {requestForm.group_leader} ({requestForm.group_leader_id})
                </Typography>
                <Typography variant="caption" color="#b91c1c" display="block">
                  Instructor: {requestForm.instructor}
                </Typography>
                <Typography variant="caption" color="#b91c1c" display="block">
                  Schedule: {requestForm.schedule}
                </Typography>
                <Typography variant="caption" color="#b91c1c" display="block">
                  Date Borrowed: {requestForm.date_borrowed
                    ? new Date(requestForm.date_borrowed).toLocaleString()
                    : "-"}
                </Typography>
              </Card>

              <Card sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography fontWeight={700} mb={1} color="#b91c1c">
                  Selected Items
                </Typography>
                {selectedItems.length === 0 ? (
                  <Typography color="text.secondary">No items selected</Typography>
                ) : (
                  selectedItems.map((s) => (
                    <Box key={s.num} mb={1} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight="medium">{s.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Qty: {s.qty}
                        </Typography>
                      </Box>
                      <Chip label={`x${s.qty}`} size="small" color="error" />
                    </Box>
                  ))
                )}
              </Card>

              {/* Status Selection */}
              {requestForm.borrow_id && (
                <TextField
                  select
                  label="Status"
                  value={requestForm.status}
                  onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value })}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="Borrowed">Borrowed</option>
                  <option value="Returned">Returned</option>
                </TextField>
              )}
            </Stack>
          )}

          {error && (
            <Box mt={2} p={1.5} bgcolor="error.light" borderRadius={2}>
              <Typography color="white">{error}</Typography>
            </Box>
          )}

          <Stack direction="row" justifyContent="space-between" mt={3}>
            <Button 
              disabled={activeStep === 0} 
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                sx={{ 
                  bgcolor: "#b91c1c", 
                  "&:hover": { bgcolor: "#b91c1c.dark" },
                  px: 3
                }}
                onClick={handleNext}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                sx={{ 
                  bgcolor: "#b91c1c", 
                  "&:hover": { bgcolor: "#b91c1c" },
                  px: 3
                }}
                                onClick={handleConfirmBorrow}
                disabled={saving}
              >
                {saving ? "Saving..." : "Confirm"}
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
<Dialog
  open={aiDialogOpen}
  onClose={() => setAiDialogOpen(false)}
  maxWidth="lg"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    }
  }}
  // Make dialog draggable
  onMouseDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.MuiDialogTitle-root')) {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      if (dialog) {
        dialog.style.cursor = 'move';
      }
    }
  }}
  onMouseUp={() => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    if (dialog) {
      dialog.style.cursor = '';
    }
  }}
>
  <DialogTitle 
    sx={{ 
      bgcolor: "#b91c1c", 
      color: "white", 
      fontWeight: "bold",
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      gap: 1
    }}
  >
    <AutoAwesomeIcon />
    Ask AI
  </DialogTitle>
  
  <DialogContent sx={{ p: 3, bgcolor: 'background.default' }}>
    <Stack spacing={3}>
      <TextField
        multiline
        rows={4}
        placeholder='Ask: e.g. "List all students who borrowed an oscilloscope this month"'
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        variant="outlined"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'white'
          }
        }}
      />
      
      <Button
        variant="contained"
        onClick={handleGenerateReport}
        disabled={loading || !question.trim()}
        sx={{
          bgcolor: "#b91c1c",
          "&:hover": { bgcolor: "#b91c1c.dark" },
          borderRadius: 2,
          py: 1.5,
          fontWeight: "bold",
          textTransform: "none"
        }}
      >
        {loading ? <CircularProgress size={24} /> : "Ask"}
      </Button>

      {/* Results */}
      {reportText && (
        <Card sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" color="#b91c1c" gutterBottom>
            AI Answer Preview:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {reportText}
            </Typography>
          </Paper>
        </Card>
      )}

      {reportTable && (
        <Card sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" color="#b91c1c" gutterBottom>
            AI Answer (Table):
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  {reportTable.columns.map((col, idx) => (
                    <TableCell key={idx} sx={{ fontWeight: 'bold' }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {reportTable.rows.map((row, rIdx) => (
                  <TableRow key={rIdx} hover>
                    {row.map((cell, cIdx) => (
                      <TableCell key={cIdx}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Stack>
  </DialogContent>
</Dialog>
    </Container>
  );
}