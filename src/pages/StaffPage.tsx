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
} from "@mui/material";
import Loader from "../components/Loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface Staff {
  email: string;
  lastname: string;
  firstname: string;
  password: string;
  role: string;
}

interface User {
  email: string;
  // Add other user properties as needed
}

const StaffPage = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [form, setForm] = useState<Staff>({
    email: "",
    lastname: "",
    firstname: "",
    password: "",
    role: "Student Assistant",
  });
  const [user, setUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const navigate = useNavigate();

  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: { sheet: "users", action: "read" },
      });
      const result = response.data;
      if (result.success) {
        const rows = result.data;
        const headers = rows[0];
        const idx = (key: string) => headers.indexOf(key);
        const parsed = rows.slice(1).map((row: any[]) => ({
          email: row[idx("email")],
          lastname: row[idx("lastname")],
          firstname: row[idx("firstname")],
          password: row[idx("password")],
          role: row[idx("role")],
        }));
        
        // Filter out the current user's account
        const filteredStaffs = parsed.filter((staff: Staff) => 
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
    setProcessing(true);
    try {
      await axios.get(API_URL, {
        params: { sheet: "users", action: "create", ...form },
      });
      setOpen(false);
      setForm({ email: "", lastname: "", firstname: "", password: "", role: "Student Assistant" });
      setSnackbar({ open: true, message: "Staff member added successfully", severity: "success" });
      fetchStaffs();
    } catch (err) {
      console.error("Failed to create staff", err);
      setSnackbar({ open: true, message: "Failed to add staff member", severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm("Are you sure you want to delete this staff?")) return;
    setProcessing(true);
    try {
      await axios.get(API_URL, {
        params: { sheet: "users", action: "delete", email },
      });
      setSnackbar({ open: true, message: "Staff member deleted successfully", severity: "success" });
      fetchStaffs();
    } catch (err) {
      console.error("Failed to delete staff", err);
      setSnackbar({ open: true, message: "Failed to delete staff member", severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Are you sure you want to delete selected staff?")) return;
    setProcessing(true);
    try {
      await Promise.all(
        selectedStaffs.map(email =>
          axios.get(API_URL, { params: { sheet: "users", action: "delete", email } })
        )
      );
      setSelectedStaffs([]);
      setSnackbar({ open: true, message: "Selected staff members deleted successfully", severity: "success" });
      fetchStaffs();
    } catch (err) {
      console.error("Failed to delete selected staff", err);
      setSnackbar({ open: true, message: "Failed to delete selected staff members", severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // redirect to login if not logged in
    } else {
      const userData = JSON.parse(storedUser);
      setUser(userData);
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

      <Stack direction="row" mb={3} spacing={2} alignItems="center">
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#B71C1C" }}>
          Staff Management
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setForm({ email: "", lastname: "", firstname: "", password: "", role: "Student Assistant" });
            setOpen(true);
          }}
          sx={{ 
            bgcolor: "#f8a41a", 
            "&:hover": { bgcolor: "#e5940e" }, 
            textTransform: "none",
            borderRadius: 2,
            px: 3,
            fontWeight: "bold"
          }}
        >
          + Add Staff
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedStaffs.length === 0}
          onClick={handleBulkDelete}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            px: 3,
            fontWeight: "bold"
          }}
        >
          Delete Selected ({selectedStaffs.length})
        </Button>
      </Stack>

      {loading ? (
        <Loader />
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 3, 
            boxShadow: 3,
            overflow: "hidden"
          }}
        >
          <Table>
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
              {staffs.map((staff) => (
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
                      {staff.firstname} {staff.lastname}
                    </Typography>
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
                        bgcolor: staff.role === "Custodian" ? "primary.main" : "secondary.main",
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

      {/* Add Staff Dialog */}
      <Dialog open={open} onClose={() => !processing && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C", bgcolor: "#f5f5f5" }}>
          Add Staff
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: "#fafafa" }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
              variant="outlined"
              disabled={processing}
            />
            <TextField
              label="Lastname"
              value={form.lastname}
              onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              fullWidth
              variant="outlined"
              disabled={processing}
            />
            <TextField
              label="Firstname"
              value={form.firstname}
              onChange={(e) => setForm({ ...form, firstname: e.target.value })}
              fullWidth
              variant="outlined"
              disabled={processing}
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              variant="outlined"
              disabled={processing}
            />

            <ToggleButtonGroup
              value={form.role}
              exclusive
              onChange={(_, value) => value && setForm({ ...form, role: value })}
              fullWidth
              disabled={processing}
            >
              <ToggleButton
                value="Student Assistant"
                sx={{ 
                  flex: 1, 
                  "&.Mui-selected": { 
                    bgcolor: "#B71C1C", 
                    color: "#FFF",
                    "&:hover": { bgcolor: "#D32F2F" }
                  },
                  fontWeight: "bold"
                }}
              >
                Student Assistant
              </ToggleButton>
              <ToggleButton
                value="Custodian"
                sx={{ 
                  flex: 1, 
                  "&.Mui-selected": { 
                    bgcolor: "#B71C1C", 
                    color: "#FFF",
                    "&:hover": { bgcolor: "#D32F2F" }
                  },
                  fontWeight: "bold"
                }}
              >
                Custodian
              </ToggleButton>
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
            disabled={processing}
            sx={{
              bgcolor: "#B71C1C",
              "&:hover": { bgcolor: "#D32F2F" },
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              fontWeight: "bold"
            }}
          >
            {processing ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Save"}
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
};

export default StaffPage;