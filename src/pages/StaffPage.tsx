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
  Tabs,
  Tab,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Loader from "../components/Loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useTheme } from "@mui/material/styles";

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
  const [selectedTab, setSelectedTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState(""); // Add search state
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [viewUser, setViewUser] = useState<Staff | null>(null);
  const [userBorrowRecords, setUserBorrowRecords] = useState<any[]>([]);
  const [userReservationRecords, setUserReservationRecords] = useState<any[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();

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

  // Tab role options based on user role, now includes "All"
  const getTabRoles = () => {
    if (!user) return [];
    if (user.role === "Admin") {
      return ["All", "Custodian", "Program Chair", "Instructor", "Student Assistant", "Student"];
    }
    if (user.role === "Custodian") {
      return ["All", "Program Chair", "Instructor", "Student Assistant", "Student"];
    }
    return [];
  };

  // Filtered staffs for current tab, with search
  const filteredStaffs = staffs
    .filter(staff => selectedTab === "All" ? true : staff.role === selectedTab)
    .filter(staff =>
      searchQuery.trim() === "" ||
      (staff.firstname && staff.firstname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (staff.lastname && staff.lastname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Fetch borrow records for student
  const fetchBorrowRecords = async (user: Staff) => {
    setUserBorrowRecords([]);
    if (!user) return;
    try {
      const res = await axios.get("https://elams-server.onrender.com/api/borrow-records");
      if (res.data && Array.isArray(res.data)) {
        // Match group_leader or borrow_user by name or email
        const name = `${user.firstname || ""} ${user.lastname || ""}`.trim();
        const email = user.email;
        const filtered = res.data.filter(
          (b: any) =>
            (b.group_leader && (b.group_leader === name || b.group_leader === email)) ||
            (b.borrow_user && (b.borrow_user === name || b.borrow_user === email))
        );
        setUserBorrowRecords(filtered);
      }
    } catch (err) {
      setUserBorrowRecords([]);
    }
  };

  // Fetch reservation records for faculty
  const fetchReservationRecords = async (user: Staff) => {
    setUserReservationRecords([]);
    if (!user) return;
    try {
      const res = await axios.get("https://elams-server.onrender.com/api/reservations");
      if (Array.isArray(res.data)) {
        const filtered = res.data.filter(
          (r: any) =>
            r.instructor_email === user.email ||
            r.instructor === `${user.firstname || ""} ${user.lastname || ""}`.trim()
        );
        setUserReservationRecords(filtered);
      }
    } catch (err) {
      setUserReservationRecords([]);
    }
  };

  // Add fetchManagedBorrowRecords for Student Assistant
  const fetchManagedBorrowRecords = async (user: Staff) => {
    setUserBorrowRecords([]);
    if (!user) return;
    try {
      const res = await axios.get("https://elams-server.onrender.com/api/borrow-records");
      if (res.data && Array.isArray(res.data)) {
        // Match managed_by by email or managed_name by name
        const name = `${user.firstname || ""} ${user.lastname || ""}`.trim();
        const email = user.email;
        const filtered = res.data.filter(
          (b: any) =>
            (b.managed_by && b.managed_by === email) ||
            (b.managed_name && b.managed_name === name)
        );
        setUserBorrowRecords(filtered);
      }
    } catch (err) {
      setUserBorrowRecords([]);
    }
  };

  // Open view user modal and fetch records
  const handleViewUser = async (user: Staff) => {
    setViewUser(user);
    setViewUserOpen(true);
    setUserBorrowRecords([]);
    setUserReservationRecords([]);
    if (user.role === "Student") {
      await fetchBorrowRecords(user);
    } else if (user.role === "Instructor" || user.role === "Program Chair" || user.role === "Faculty") {
      await fetchReservationRecords(user);
    } else if (user.role === "Student Assistant") {
      await fetchManagedBorrowRecords(user);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // redirect to login if not logged in
    } else {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Default tab is "All" for all users
      setSelectedTab("All");
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

        {/* Student card */}
        <Card sx={{ flex: 1, p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, background: `linear-gradient(135deg, rgba(33,150,243,0.06) 0%, rgba(33,150,243,0.12) 100%)` }}>
          <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(33,150,243,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: "bold", color: "#2196F3" }}>S</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Students</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#2196F3" }}>{staffs.filter(s => s.role === "Student").length}</Typography>
          </Box>
        </Card>
      </Stack>

      {/* Tabs for roles - moved below summary cards */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, val) => setSelectedTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ bgcolor: "#f5f5f5", borderRadius: 2 }}
        >
          {getTabRoles().map(role => (
            <Tab
              key={role}
              value={role}
              label={role}
              sx={{
                fontWeight: "bold",
                color: selectedTab === role ? "#B71C1C" : "inherit",
                "&.Mui-selected": { color: "#B71C1C" }
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Action bar inside a card for visual consistency */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} justifyContent="space-between" alignItems="center">
  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <Box sx={{ maxWidth: 420, width: "100%" }}>
            <TextField
              placeholder="Search name or email..."
              size="small"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              fullWidth
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
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              }}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={() => { setForm({ emails: [], currentEmail: "", role: getAvailableRoles()[0] }); setOpen(true); }}
            sx={{
              bgcolor: "#B71C1C",
              "&:hover": { bgcolor: "#9f1515" },
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              fontWeight: "bold"
            }}
          >
            + Add Account
          </Button>
          <Button variant="contained" color="error" disabled={selectedStaffs.length === 0} onClick={handleBulkDelete} sx={{ textTransform: "none" }}>
            Delete Selected ({selectedStaffs.length})
          </Button>
        </Stack>
      </Stack>

      {/* Main table in a consistent card */}
      <Card sx={{ p: 0, borderRadius: 3, boxShadow: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280 }}>
            <Loader />
          </Box>
        ) : filteredStaffs.length === 0 ? (
          // ...existing no data design...
          <Box
            sx={{
              minHeight: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "grey.50",
              borderRadius: 3,
              border: "2px dashed #b91c1c",
              boxShadow: "0 4px 24px rgba(185,28,28,0.08)",
              py: 6,
              px: 2,
              mt: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 64, color: "#b91c1c", mb: 2 }} />
            <Typography variant="h5" sx={{ color: "#b91c1c", fontWeight: "bold", mb: 1 }}>
              No accounts found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              There are no accounts for <b>{selectedTab}</b> at the moment.
            </Typography>
            <Button
              variant="contained"
              sx={{
                bgcolor: "#b91c1c",
                color: "#fff",
                borderRadius: 2,
                textTransform: "none",
                fontWeight: "bold",
                px: 4,
                boxShadow: "0 2px 8px rgba(185,28,28,0.12)"
              }}
              onClick={() => setOpen(true)}
            >
              + Add Account
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 620 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {/* ...existing header cells... */}
                  <TableCell
                    padding="checkbox"
                    sx={{
                      bgcolor: "grey.50",
                      borderBottom: "2px solid #b91c1c",
                    }}
                  >
                    <Checkbox
                      indeterminate={
                        selectedStaffs.length > 0 && selectedStaffs.length < filteredStaffs.length
                      }
                      checked={filteredStaffs.length > 0 && selectedStaffs.length === filteredStaffs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffs(filteredStaffs.map(staff => staff.email));
                        } else {
                          setSelectedStaffs([]);
                        }
                      }}
                      sx={{
                        color: "#b91c1c",
                        "&.Mui-checked": { color: "#b91c1c" },
                        "&.MuiCheckbox-indeterminate": { color: "#b91c1c" }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{
                    bgcolor: "grey.50",
                    fontWeight: "bold",
                    color: "#b91c1c",
                    borderBottom: "2px solid #b91c1c"
                  }}>
                    Name
                  </TableCell>
                  <TableCell sx={{
                    bgcolor: "grey.50",
                    fontWeight: "bold",
                    color: "#b91c1c",
                    borderBottom: "2px solid #b91c1c"
                  }}>
                    Email
                  </TableCell>
                  <TableCell sx={{
                    bgcolor: "grey.50",
                    fontWeight: "bold",
                    color: "#b91c1c",
                    borderBottom: "2px solid #b91c1c"
                  }}>
                    Role
                  </TableCell>
                  <TableCell sx={{
                    bgcolor: "grey.50",
                    fontWeight: "bold",
                    color: "#b91c1c",
                    borderBottom: "2px solid #b91c1c"
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStaffs.map((staff) => (
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
                                   staff.role === "Instructor" ? "#3B82F6" :
                                   staff.role === "Student Assistant" ? "#f8a41a" : "#757575",
                          color: "white",
                        }}
                      >
                        {staff.role}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {/* Only show Records/View icon for non-Custodian roles */}
                        {staff.role !== "Custodian" && (
                          <Button
                            size="small"
                            sx={{
                              minWidth: 0,
                              bgcolor: "#e3f2fd",
                              color: "#1976d2",
                              borderRadius: 2,
                              p: 1,
                              boxShadow: "0 2px 8px rgba(25,118,210,0.08)",
                              "&:hover": { bgcolor: "#90caf9", color: "#1565c0" }
                            }}
                            onClick={() => handleViewUser(staff)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </Button>
                        )}
                        <Button
                          size="small"
                          sx={{
                            minWidth: 0,
                            bgcolor: "#ffebee",
                            color: "#d32f2f",
                            borderRadius: 2,
                            p: 1,
                            boxShadow: "0 2px 8px rgba(183,28,28,0.08)",
                            "&:hover": { bgcolor: "#f44336", color: "#fff" }
                          }}
                          onClick={() => handleDelete(staff.email)}
                        >
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* View User Modal */}
      <Dialog
        open={viewUserOpen}
        onClose={() => setViewUserOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C", bgcolor: "#f5f5f5" }}>
          User Information
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#fafafa", maxHeight: 600 }}>
          {viewUser && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Name:</Typography>
                    <Typography variant="body2">{viewUser.firstname && viewUser.lastname ? `${viewUser.firstname} ${viewUser.lastname}` : "Not yet logged in"}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Email:</Typography>
                    <Typography variant="body2">{viewUser.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Role:</Typography>
                    <Typography variant="body2">{viewUser.role}</Typography>
                  </Box>
                </Stack>
              </Box>
              {/* Student: Borrow Records */}
              {viewUser.role === "Student" && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Borrow Records
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), maxHeight: 250, overflowY: 'auto' }}>
                    {userBorrowRecords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No borrow records found for this student.
                      </Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: "bold" }}>Borrow ID</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Group Leader</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Date Borrowed</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userBorrowRecords.map((rec, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rec.borrow_id}</TableCell>
                              <TableCell>{rec.course}</TableCell>
                              <TableCell>{rec.group_leader}</TableCell>
                              <TableCell>{rec.date_borrowed ? new Date(rec.date_borrowed).toLocaleDateString() : ""}</TableCell>
                              <TableCell>
                                <Chip
                                  label={rec.status}
                                  size="small"
                                  sx={{
                                    bgcolor: rec.status === "Returned" ? alpha(theme.palette.success.main, 0.08) :
                                            rec.status === "Borrowed" ? alpha(theme.palette.warning.main, 0.08) :
                                            alpha(theme.palette.error.main, 0.08),
                                    color: rec.status === "Returned" ? theme.palette.success.main :
                                           rec.status === "Borrowed" ? theme.palette.warning.main :
                                           theme.palette.error.main,
                                    fontWeight: 'bold'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                </Box>
              )}
              {/* Student Assistant: Managed Borrow Records */}
              {viewUser.role === "Student Assistant" && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Managed Borrow Records
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), maxHeight: 250, overflowY: 'auto' }}>
                    {userBorrowRecords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No borrow records managed by this Student Assistant.
                      </Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: "bold" }}>Borrow ID</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Borrower</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Date Borrowed</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userBorrowRecords.map((rec, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rec.borrow_id}</TableCell>
                              <TableCell>{rec.course}</TableCell>
                              <TableCell>{rec.borrow_user}</TableCell>
                              <TableCell>{rec.date_borrowed ? new Date(rec.date_borrowed).toLocaleDateString() : ""}</TableCell>
                              <TableCell>
                                <Chip
                                  label={rec.status}
                                  size="small"
                                  sx={{
                                    bgcolor: rec.status === "Returned" ? alpha(theme.palette.success.main, 0.08) :
                                            rec.status === "Borrowed" ? alpha(theme.palette.warning.main, 0.08) :
                                            alpha(theme.palette.error.main, 0.08),
                                    color: rec.status === "Returned" ? theme.palette.success.main :
                                           rec.status === "Borrowed" ? theme.palette.warning.main :
                                           theme.palette.error.main,
                                    fontWeight: 'bold'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                </Box>
              )}
              {/* Faculty: Reservation Records */}
              {(viewUser.role === "Instructor" || viewUser.role === "Program Chair" || viewUser.role === "Faculty") && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Reservation Records
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), maxHeight: 250, overflowY: 'auto' }}>
                    {userReservationRecords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No reservation records found for this faculty.
                      </Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: "bold" }}>Reservation Code</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Course</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Date Created</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userReservationRecords.map((rec, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rec.reservation_code}</TableCell>
                              <TableCell>{rec.subject}</TableCell>
                              <TableCell>{rec.course}</TableCell>
                              <TableCell>{rec.date_created ? new Date(rec.date_created).toLocaleDateString() : ""}</TableCell>
                              <TableCell>
                                <Chip
                                  label={rec.status}
                                  size="small"
                                  sx={{
                                    bgcolor: rec.status === "Rejected" ? alpha(theme.palette.error.main, 0.08) :
                                            rec.status === "Pending" ? alpha(theme.palette.warning.main, 0.08) :
                                            alpha(theme.palette.success.main, 0.08),
                                    color: rec.status === "Rejected" ? theme.palette.error.main :
                                           rec.status === "Pending" ? theme.palette.warning.main :
                                           theme.palette.success.main,
                                    fontWeight: 'bold'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button
            onClick={() => setViewUserOpen(false)}
            sx={{
              textTransform: "none",
              color: "#B71C1C",
              fontWeight: "bold",
              borderRadius: 2,
              px: 3
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

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