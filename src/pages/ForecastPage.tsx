import { useEffect, useState } from "react";
import {
  Container, Box, Typography, Card, Stack, TextField, Select, MenuItem, InputLabel, FormControl,
  Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, Chip, IconButton,
  Snackbar, Alert, CircularProgress, Backdrop, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

const API_BASE_URL = "https://elams-server.onrender.com/api";

type ForecastItem = {
  id: string;
  item_name: string;
  quantity: number;
  notes?: string;
};

type ForecastRequest = {
  _id?: string;
  requester_email: string;
  requester_name: string;
  school?: string;
  school_year?: string;
  semester?: string;
  items: ForecastItem[];
  status?: string;
  date_requested?: string;
};

export default function ForecastPage() {
  const brandRed = "#b91c1c";
  const ubRed = "#B71C1C";

  // --- ADD: unified action button styles (neutral grey, UB red on hover) ---
  const actionBtnSx = {
    minWidth: 0,
    bgcolor: "grey.100",
    color: "text.primary",
    borderRadius: 2,
    p: 1,
    transition: "all 180ms ease",
    boxShadow: "none",
    "&:hover": {
      bgcolor: ubRed,
      color: "#fff",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 20px rgba(183,28,28,0.12)",
    },
  };
  const actionIconBtnSx = {
    ...actionBtnSx,
    width: 40,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  // --- END ADD ---

  const [school, setSchool] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [semester, setSemester] = useState<"1st" | "2nd">("1st");
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState<number>(1);
  const [newNotes, setNewNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<ForecastRequest[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success"
  });

  // --- ADD: tab state + view dialog state ---
  const [tabIndex, setTabIndex] = useState(0);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<ForecastRequest | null>(null);
  // --- END ADD ---

  // -- EDIT flow state --
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // -- end edit flow --

  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const userEmail = currentUser?.email || "";
  const userName = currentUser?.firstname ? `${currentUser.firstname} ${currentUser.lastname || ""}`.trim() : currentUser.name || "";

  useEffect(() => { fetchMyRequests(); /* eslint-disable-next-line */ }, []);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/forecast-request`, { action: "read", user: { email: userEmail } });
      if (res.data && res.data.success) setRequests(res.data.data || []);
      else if (Array.isArray(res.data)) setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch forecast requests", err);
    } finally { setLoading(false); }
  };

  const addItem = () => {
    if (!newName.trim() || newQty <= 0) {
      setSnackbar({ open: true, message: "Item name and positive quantity required", severity: "error" });
      return;
    }
    setItems(prev => [...prev, { id: String(Date.now()) + Math.random().toString(36).slice(2,6), item_name: newName.trim(), quantity: newQty, notes: newNotes }]);
    setNewName(""); setNewQty(1); setNewNotes("");
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // start editing an existing request: populate form and switch to Create tab
  const startEditRequest = (r: ForecastRequest) => {
    setSchool(r.school || "");
    setSchoolYear(r.school_year || "");
    setSemester((r.semester as "1st" | "2nd") || "1st");
    // convert items into local ForecastItem shape (with temporary ids)
    setItems((r.items || []).map((it: any, idx: number) => ({ id: String(idx) + '-' + (Date.now()%1000), item_name: it.item_name, quantity: it.quantity || 1, notes: it.notes || "" })));
    setEditingRequestId(r._id || null);
    setIsEditing(true);
    setTabIndex(0); // switch to Create Forecast tab for editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRequestId(null);
    setIsEditing(false);
    setItems([]);
    setSchool("");
    setSchoolYear("");
    setSemester("1st");
  };

  const handleSubmit = async () => {
    if (!school.trim() || !schoolYear.trim() || !semester) {
      setSnackbar({ open: true, message: "School, school year and semester are required", severity: "error" }); return;
    }
    if (items.length === 0) { setSnackbar({ open: true, message: "Add at least one item", severity: "error" }); return; }

    setSubmitting(true);
    try {
      const itemsPayload = items.map(it => ({ item_name: it.item_name, quantity: it.quantity, notes: it.notes }));
      if (isEditing && editingRequestId) {
        // update existing
        const res = await axios.post(`${API_BASE_URL}/forecast-request`, {
          action: "update",
          id: editingRequestId,
          user: { email: userEmail, name: userName },
          school, school_year: schoolYear, semester, items: itemsPayload
        });
        if (res.data && res.data.success) {
          setSnackbar({ open: true, message: "Forecast updated", severity: "success" });
          cancelEdit();
          fetchMyRequests();
        } else {
          setSnackbar({ open: true, message: res.data?.error || "Failed to update", severity: "error" });
        }
      } else {
        // create new
        const res = await axios.post(`${API_BASE_URL}/forecast-request`, {
          action: "create",
          user: { email: userEmail, name: userName },
          school, school_year: schoolYear, semester, items: itemsPayload
        });
        if (res.data && res.data.success) {
          setSnackbar({ open: true, message: "Forecast request submitted", severity: "success" });
          setItems([]); setSchool(""); setSchoolYear(""); setSemester("1st");
          fetchMyRequests();
        } else {
          setSnackbar({ open: true, message: "Failed to submit forecast", severity: "error" });
        }
      }
    } catch (err) {
      console.error("Submit forecast error", err);
      setSnackbar({ open: true, message: "Submission failed", severity: "error" });
    } finally { setSubmitting(false); }
  };

  const handleDeleteRequest = async (r: ForecastRequest) => {
    if (!r._id) return;
    if (!window.confirm(`Delete forecast request for ${r.school || 'unknown'} (${r.school_year || ''})?`)) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/forecast-request`, { action: "delete", id: r._id, user: { email: userEmail, name: userName } });
      if (res.data && res.data.success) {
        setSnackbar({ open: true, message: "Forecast request deleted", severity: "success" });
        fetchMyRequests();
      } else {
        setSnackbar({ open: true, message: res.data?.error || "Failed to delete", severity: "error" });
      }
    } catch (e) {
      console.error("Delete forecast error", e);
      setSnackbar({ open: true, message: "Deletion failed", severity: "error" });
    }
  };

  // add small helper to open view dialog
  const openViewRequest = (r: ForecastRequest) => {
    setViewRequest(r);
    setViewDialogOpen(true);
  };

  // --- NEW: allowed schools and automatic academic year options ---
  const SCHOOLS = [
    "School of Information Technology",
    "School of Engineering and Architecture"
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  // academic year strings: e.g. "2025-2026" and previous "2024-2025"
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`
  ];
  // set sensible defaults if not provided
  useEffect(() => {
    if (!school && SCHOOLS.length) setSchool(SCHOOLS[0]);
    if (!schoolYear && academicYears.length) setSchoolYear(academicYears[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // --- END NEW ---

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Backdrop sx={{ color: "#fff", zIndex: (t) => t.zIndex.modal + 1 }} open={loading || submitting}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color={brandRed}>Forecast Requests</Typography>
        <Typography variant="body2" color="text.secondary">Create and manage forecast requests for semester stock planning</Typography>
      </Box>

      {/* Tabs: Create Forecast | My Forecasts */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="inherit" indicatorColor="primary">
          <Tab label="Create Forecast" />
          <Tab label="My Forecast Requests" />
        </Tabs>
      </Box>

      {/* TabPanel: Create Forecast */}
      {tabIndex === 0 && (
        <Box>
          <Card sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: brandRed }}>Create Forecast</Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>School / College</InputLabel>
                  <Select
                    value={school}
                    label="School / College"
                    onChange={(e) => setSchool(e.target.value as string)}
                    size="small"
                  >
                    {SCHOOLS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ width: 220 }}>
                  <InputLabel>School Year</InputLabel>
                  <Select
                    value={schoolYear}
                    label="School Year"
                    onChange={(e) => setSchoolYear(e.target.value as string)}
                    size="small"
                  >
                    {academicYears.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                 <FormControl sx={{ width: 220 }}>
                  <InputLabel>Semester</InputLabel>
                  <Select value={semester} label="Semester" onChange={(e) => setSemester(e.target.value as any)} size="small">
                    <MenuItem value="1st">1st Semester</MenuItem>
                    <MenuItem value="2nd">2nd Semester</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <TextField label="Item name" value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Quantity" type="number" value={newQty} onChange={(e) => setNewQty(Number(e.target.value) || 1)} sx={{ width: 140 }} />
                <TextField label="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} sx={{ width: 260 }} />
                <Button startIcon={<AddIcon />} variant="outlined" onClick={addItem} sx={{ whiteSpace: "nowrap" }}>Add</Button>
              </Box>

              {/* Items table */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Items to Forecast</Typography>
                {items.length === 0 ? <Typography variant="body2" color="text.secondary">No items added yet</Typography> : (
                  <TableContainer component={Paper} sx={{ maxHeight: 260 }}>
                    <Table size="small" stickyHeader>
                      <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="center">Quantity</TableCell><TableCell>Notes</TableCell><TableCell align="center">Action</TableCell></TableRow></TableHead>
                      <TableBody>
                        {items.map(it => (
                          <TableRow key={it.id}>
                            <TableCell>{it.item_name}</TableCell>
                            <TableCell align="center"><Chip label={it.quantity} /></TableCell>
                            <TableCell>{it.notes || "-"}</TableCell>
                            <TableCell align="center"><IconButton size="small" color="error" onClick={() => removeItem(it.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Action bar (styled) */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                {isEditing ? (
                  <>
                    <Button onClick={cancelEdit} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: brandRed, color: '#fff', textTransform: 'none', "&:hover": { bgcolor: "#9f1515" } }}>
                      Update Forecast
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: brandRed, color: '#fff', textTransform: 'none', "&:hover": { bgcolor: "#9f1515" } }}>
                    Submit Forecast
                  </Button>
                )}
              </Box>
            </Stack>
          </Card>
        </Box>
      )}

      {/* TabPanel: My Forecast Requests */}
      {tabIndex === 1 && (
        <Box>
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: brandRed }}>My Forecast Requests</Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160 }}>
                <CircularProgress />
              </Box>
            ) : requests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No forecast requests yet.</Typography>
            ) : (
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Requested</TableCell>
                      <TableCell>School</TableCell>
                      <TableCell>School Year</TableCell>
                      <TableCell>Semester</TableCell>
                      <TableCell># Items</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>{r.date_requested ? new Date(r.date_requested).toLocaleString() : "-"}</TableCell>
                        <TableCell>{r.school || "-"}</TableCell>
                        <TableCell>{r.school_year || "-"}</TableCell>
                        <TableCell>{r.semester || "-"}</TableCell>
                        <TableCell>{(r.items || []).length}</TableCell>
                        <TableCell>
                          <Chip label={r.status || "Pending"} color={r.status === "Approved" ? "success" : r.status === "Rejected" ? "error" : "warning"} />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="View">
                              <IconButton onClick={() => openViewRequest(r)} sx={actionIconBtnSx}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit">
                              <IconButton onClick={() => startEditRequest(r)} sx={actionIconBtnSx}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete">
                              <IconButton onClick={() => handleDeleteRequest(r)} sx={actionIconBtnSx}>
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
            )}
          </Card>
        </Box>
      )}

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon sx={{ color: brandRed }} />
            <Typography variant="h6" sx={{ color: brandRed }}>Forecast Request Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewRequest && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">School</Typography>
                <Typography>{viewRequest.school || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">School Year / Semester</Typography>
                <Typography>{viewRequest.school_year || '-'} • {viewRequest.semester || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">Requested Items</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewRequest.items || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{it.item_name}</TableCell>
                        <TableCell align="center">{it.quantity}</TableCell>
                        <TableCell>{it.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                <Chip label={viewRequest.status || "Pending"} color={viewRequest.status === "Approved" ? "success" : viewRequest.status === "Rejected" ? "error" : "warning"} />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}
