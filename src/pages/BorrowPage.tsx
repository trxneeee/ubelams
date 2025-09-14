// src/pages/BorrowPage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

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
  // records & inventory
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

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
    status: "Pending",
    date_borrowed: "",
  });

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR Scanner
  const [scanning, setScanning] = useState(false);

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
      status: "Pending",
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
    <Container sx={{ py: 4 }}>
      {/* Summary cards */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={3}>
        <Card sx={{ flex: 1, p: 2, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: "#B71C1C" }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2">Borrow</Typography>
              <Typography variant="h6" fontWeight={700}>
                {records.length}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card sx={{ flex: 1, p: 2, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: "success.main" }}>
              <CheckCircleIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2">Total Items Borrowed</Typography>
              <Typography variant="h6" fontWeight={700}>
                {totalRequestedCount}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Stack>

      {/* Borrow Requests Table */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Borrow Records</Typography>
            <Button
              variant="contained"
              sx={{ bgcolor: "#B71C1C", "&:hover": { bgcolor: "#D32F2F" } }}
              onClick={() => setOpen(true)}
            >
              + New Borrow
            </Button>
          </Stack>

          {recordsLoading ? (
            <LinearProgress />
          ) : records.length === 0 ? (
            <Typography color="text.secondary">No records yet.</Typography>
          ) : (
            <Box sx={{ width: "100%", overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Leader</TableCell>
                    <TableCell>Instructor</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={`${r.borrow_id}-${r.item}`} hover>
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
                      <TableCell>{r.course}</TableCell>
                      <TableCell>{r.group_number}</TableCell>
                      <TableCell>
                        {r.group_leader} ({r.group_leader_id})
                      </TableCell>
                      <TableCell>{r.instructor}</TableCell>
                      <TableCell>{r.schedule}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined">
                            View
                          </Button>
                          <Button size="small" variant="contained" color="primary">
                            Update
                          </Button>
                          <Button size="small" variant="contained" color="error">
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog (Stepper Form) */}
      <Dialog open={open} onClose={resetDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ color: "#B71C1C", fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {requestForm.borrow_id ? "Update Borrow Request" : "New Borrow Request"}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EventIcon color="error" />
              <Typography variant="caption" color="text.secondary">
                Step {activeStep + 1} of {steps.length}
              </Typography>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Box mb={2}>
            <Stepper activeStep={activeStep}>
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
                <Button
                  variant="outlined"
                  onClick={() => setScanning((s) => !s)}
                >
                  {scanning ? "Close Scanner" : "Scan QR"}
                </Button>
              </Stack>

              {/* QR Scanner */}
{scanning && (
  <Box sx={{ mt: 2 }}>
    <BarcodeScannerComponent
      width={400}
      height={300}
      onUpdate={(err, result) => {
        if (result) {
          // cast to 'any' to bypass TS private property issue
          const code = (result as any).text;
          setRequestForm({ ...requestForm, group_leader_id: code });
          setScanning(false);
        }
      }}
    />
  </Box>
)}


              <TextField
                label="Instructor"
                value={requestForm.instructor}
                onChange={(e) => setRequestForm({ ...requestForm, instructor: e.target.value })}
                fullWidth
              />
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

              {requestForm.borrow_id && (
                <TextField
                  select
                  label="Status"
                  value={requestForm.status}
                  onChange={(e) => setRequestForm({ ...requestForm, status: e.target.value })}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Returned">Returned</option>
                </TextField>
              )}

              <TextField
                label="Date Borrowed"
                type="datetime-local"
                value={requestForm.date_borrowed}
                onChange={(e) => setRequestForm({ ...requestForm, date_borrowed: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          )}

          {/* Step 2 and Step 3 omitted for brevity — same as before */}

        </DialogContent>
      </Dialog>
    </Container>
  );
}
