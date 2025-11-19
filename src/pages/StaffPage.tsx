// src/pages/StaffPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Backdrop,
  Alert,
  Snackbar,
  Chip,
  Card,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Loader from "../components/Loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";

const API_BASE_URL = "https://elams-server.onrender.com/api";

interface Staff {
  email: string;
  lastname: string;
  firstname: string;
  role: string;
}

interface User {
  email: string;
  role: string;
  firstname?: string;
  lastname?: string;
}

export default function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  // form now supports multiple emails (like Google sharing)
  const [form, setForm] = useState<{
    emails: string[];
    currentEmail: string;
    role: string;
  }>({
    emails: [],
    currentEmail: "",
    role: "Student Assistant",
  });
  const [user, setUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const navigate = useNavigate();

  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, {
        action: "read"
      });
      
      const result = response.data;
      if (result.success) {
        const staffData = result.data;
        
        // Filter out the current user's account
        const filteredStaffs = staffData.filter((staff: Staff) => 
          staff.email !== user?.email
        );
        setStaffs(filteredStaffs);
      }
    } catch (err) {
      console.error("Failed to fetch staffs", err);
      setSnackbar({ open: true, message: "Failed to fetch staff data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // flush currentEmail into emails if present
    const emailsToCreate = form.currentEmail.trim()
      ? Array.from(new Set([...form.emails, form.currentEmail.trim()]))
      : Array.from(new Set(form.emails));
    
    if (emailsToCreate.length === 0) {
      setSnackbar({ open: true, message: "At least one email is required", severity: "error" });
      return;
    }

    setProcessing(true);
    try {
      const promises = emailsToCreate.map(email =>
        axios.post(`${API_BASE_URL}/users`, {
          action: "create",
          email,
          firstname: "",
          lastname: "",
          role: form.role
        }).then(() => ({ email, status: "fulfilled" })).catch((err) => ({ email, status: "rejected", error: err }))
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r: any) => r.status === "fulfilled").map((r: any) => r.email);
      const failures = results.filter((r: any) => r.status === "rejected").map((r: any) => ({
        email: r.email,
        error: r.error?.response?.data?.error || r.error?.message || "Failed"
      }));

      let message = "";
      if (successes.length) message += `${successes.length} account(s) added. `;
      if (failures.length) message += `${failures.length} failed.`;

      setSnackbar({ open: true, message: message || "Operation completed", severity: failures.length ? "error" : "success" });
      setOpen(false);
      setForm({ emails: [], currentEmail: "", role: getAvailableRoles()[0] || "Student Assistant" });
      fetchStaffs();
    } catch (err: any) {
      console.error("Failed to create staff(s)", err);
      setSnackbar({ open: true, message: "Failed to add staff member(s)", severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  // helper: basic email validation
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addCurrentEmail = () => {
    const val = form.currentEmail.trim().replace(/,+$/,"");
    if (!val) return;
    if (!isValidEmail(val)) {
      setSnackbar({ open: true, message: `Invalid email: ${val}`, severity: "error" });
      return;
    }
    if (form.emails.includes(val)) {
      setForm(prev => ({ ...prev, currentEmail: "" }));
      return;
    }
    setForm(prev => ({ ...prev, emails: [...prev.emails, val], currentEmail: "" }));
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrentEmail();
    }
  };

  const removeEmailAt = (index: number) => {
    setForm(prev => ({ ...prev, emails: prev.emails.filter((_, i) => i !== index) }));
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    setProcessing(true);
    try {
      await axios.post(`${API_BASE_URL}/users`, {
        action: "delete",
        email: email
      });
      setSnackbar({ open: true, message: "Staff member deleted successfully", severity: "success" });
      fetchStaffs();
    } catch (err: any) {
      console.error("Failed to delete staff", err);
      const errorMessage = err.response?.data?.error || "Failed to delete staff member";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Are you sure you want to delete selected staff members?")) return;
    setProcessing(true);
    try {
      await Promise.all(
        selectedStaffs.map(email =>
          axios.post(`${API_BASE_URL}/users`, { 
            action: "delete", 
            email: email 
          })
        )
      );
      setSelectedStaffs([]);
      setSnackbar({ open: true, message: "Selected staff members deleted successfully", severity: "success" });
      fetchStaffs();
    } catch (err: any) {
      console.error("Failed to delete selected staff", err);
      const errorMessage = err.response?.data?.error || "Failed to delete selected staff members";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    if (!user) return ["Student Assistant"];
    
    switch (user.role) {
      case "Admin":
        // Admin can create any role including Instructor
        return ["Custodian", "Student Assistant", "Program Chair", "Instructor"];
      case "Program Chair":
        // Program Chair may create Student Assistants and Instructor
        return ["Student Assistant", "Instructor"];
      case "Custodian":
        return ["Student Assistant"];
      default:
        return ["Student Assistant"];
    }
  };

  // Check if current user can see a specific role in the table
  const canSeeRole = (role: string) => {
    if (!user) return false;
    
    const availableRoles = getAvailableRoles();
    return availableRoles.includes(role);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // redirect to login if not logged in
    } else {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      if (userData.role !== "Custodian" && userData.role !== "Admin") {
        navigate("/dashboard");
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStaffs();
    }
  }, [user]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={processing}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} thickness={4} sx={{ color: "#f8a41a" }} />
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Processing...
          </Typography>
        </Stack>
      </Backdrop>

      {/* Page header + summary cards */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#B71C1C" }}>
          Account Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage user accounts and roles
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={3}>
        <Card sx={{ flex: 1, p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, background: `linear-gradient(135deg, rgba(185,28,28,0.06) 0%, rgba(185,28,28,0.12) 100%)` }}>
          <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(185,28,28,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 28, color: "#B71C1C" }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Accounts</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#B71C1C" }}>{staffs.length}</Typography>
          </Box>
        </Card>

        <Card sx={{ flex: 1, p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, background: `linear-gradient(135deg, rgba(248,164,26,0.06) 0%, rgba(248,164,26,0.12) 100%)` }}>
          <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(248,164,26,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: "bold", color: "#f8a41a" }}>SA</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Student Assistants</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#f8a41a" }}>{staffs.filter(s => s.role === "Student Assistant").length}</Typography>
          </Box>
        </Card>

        {/* Program Chair card */}
        <Card sx={{ flex: 1, p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, background: `linear-gradient(135deg, rgba(46,125,50,0.06) 0%, rgba(46,125,50,0.12) 100%)` }}>
          <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(46,125,50,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: "bold", color: "#2E7D32" }}>PC</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Program Chairs</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#2E7D32" }}>{staffs.filter(s => s.role === "Program Chair").length}</Typography>
          </Box>
        </Card>

        {/* Instructor card */}
        <Card sx={{ flex: 1, p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, background: `linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.12) 100%)` }}>
          <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: "bold", color: "#3B82F6" }}>I</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Instructor</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#3B82F6" }}>{staffs.filter(s => s.role === "Instructor").length}</Typography>
          </Box>
        </Card>

      </Stack>

      {/* Action bar inside a card for visual consistency */}
      <Card sx={{ p: 2, mb: 3, borderRadius: 3, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 2, justifyContent: "space-between" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flex: 1, alignItems: "center" }}>
          <Box sx={{ maxWidth: 420, width: "100%" }}>
            <TextField
              placeholder="Search name or email..."
              size="small"
              onChange={() => { /* keep existing search behaviour if needed */ }}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              }}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => { setForm({ emails: [], currentEmail: "", role: getAvailableRoles()[0] }); setOpen(true); }} sx={{ bgcolor: "#B71C1C", "&:hover": { bgcolor: "#9f1515" }, textTransform: "none" }}>
            + Add Account
          </Button>
          <Button variant="contained" color="error" disabled={selectedStaffs.length === 0} onClick={handleBulkDelete} sx={{ textTransform: "none" }}>
            Delete Selected ({selectedStaffs.length})
          </Button>
        </Stack>
      </Card>

      {/* Main table in a consistent card */}
      <Card sx={{ p: 0, borderRadius: 3, boxShadow: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280 }}><Loader /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 620 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "#B71C1C" }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedStaffs.length > 0 && selectedStaffs.length < staffs.length
                      }
                      checked={staffs.length > 0 && selectedStaffs.length === staffs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffs(staffs.map(staff => staff.email));
                        } else {
                          setSelectedStaffs([]);
                        }
                      }}
                      sx={{ color: "white", "&.Mui-checked": { color: "white" } }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "white" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffs
                  .filter(staff => canSeeRole(staff.role)) // Filter staff based on visible roles
                  .map((staff) => (
                  <TableRow key={staff.email} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedStaffs.includes(staff.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStaffs([...selectedStaffs, staff.email]);
                          } else {
                            setSelectedStaffs(selectedStaffs.filter((email) => email !== staff.email));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {staff.firstname && staff.lastname 
                          ? `${staff.firstname} ${staff.lastname}`
                          : "Not yet logged in"
                        }
                      </Typography>
                      {!(staff.firstname && staff.lastname) && (
                        <Typography variant="caption" color="text.secondary">
                          Name will be filled after first login
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          px: 2,
                          py: 1,
                          borderRadius: 3,
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          bgcolor: staff.role === "Custodian" ? "#B71C1C" :
                                   staff.role === "Program Chair" ? "#2E7D32" :
                                   staff.role === "Instructor" ? "#3B82F6" : "#f8a41a",
                          color: "white",
                        }}
                      >
                        {staff.role}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleDelete(staff.email)}
                        startIcon={<DeleteIcon />}
                        sx={{ 
                          textTransform: "none", 
                          color: "error.main",
                          fontWeight: "bold"
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={open} onClose={() => !processing && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C", bgcolor: "#f5f5f5" }}>
         Account Details
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: "#fafafa" }}>
          <Stack spacing={2} mt={1}>
            <Box>
              <TextField
                label="Add email (press Enter)"
                value={form.currentEmail}
                onChange={(e) => setForm({ ...form, currentEmail: e.target.value })}
                onKeyDown={handleEmailInputKeyDown}
                fullWidth
                variant="outlined"
                disabled={processing}
                placeholder="user@s.ubaguio.edu"
                helperText="Type an email and press Enter. Add multiple emails before confirming."
              />

              {/* chips for pending emails */}
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {form.emails.map((email, idx) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => removeEmailAt(idx)}
                    sx={{ bgcolor: alpha("#B71C1C", 0.06), color: "#B71C1C", fontWeight: 'medium' }}
                    size="medium"
                  />
                ))}
              </Box>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                First name and last name will be automatically filled when the user logs in for the first time.
              </Typography>
            </Box>
            
            {/* Role Selection based on user role */}
            <ToggleButtonGroup
              value={form.role}
              exclusive
              onChange={(_, value) => value && setForm({ ...form, role: value })}
              fullWidth
              disabled={processing}
            >
              {getAvailableRoles().map((role) => (
                <ToggleButton
                  key={role}
                  value={role}
                  sx={{ 
                    flex: 1, 
                    "&.Mui-selected": { 
                      bgcolor: role === "Custodian" ? "#B71C1C" : 
                               role === "Program Chair" ? "#2E7D32" : 
                               role === "Instructor" ? "#3B82F6" : "#f8a41a", 
                      color: "#FFF",
                      "&:hover": { 
                        bgcolor: role === "Custodian" ? "#D32F2F" : 
                                 role === "Program Chair" ? "#388E3C" : 
                                 role === "Instructor" ? "#2563EB" : "#e5940e" 
                      }
                    },
                    fontWeight: "bold"
                  }}
                >
                  {role}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button
            onClick={() => setOpen(false)}
            disabled={processing}
            sx={{ 
              textTransform: "none", 
              color: "#B71C1C", 
              fontWeight: "bold",
              borderRadius: 2,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={processing || (form.emails.length === 0 && !form.currentEmail.trim())}
            sx={{
              bgcolor: "#B71C1C",
              "&:hover": { bgcolor: "#D32F2F" },
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              fontWeight: "bold"
            }}
          >
            {processing ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Add Account"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          icon={snackbar.severity === "success" ? <CheckCircleIcon /> : undefined}
          sx={{ 
            width: '100%',
            borderRadius: 2,
            fontWeight: "medium"
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}