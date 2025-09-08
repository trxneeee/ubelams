// src/pages/StaffPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
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
} from "@mui/material";
import Loader from "../components/Loader";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface Staff {
  email: string;
  lastname: string;
  firstname: string;
  password: string;
  role: string;
}

const StaffPage = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<Staff>({
    email: "",
    lastname: "",
    firstname: "",
    password: "",
    role: "Student Assistant",
  });

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
        setStaffs(parsed);
      }
    } catch (err) {
      console.error("Failed to fetch staffs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.get(API_URL, {
        params: { sheet: "users", action: "create", ...form },
      });
      setOpen(false);
      setForm({ email: "", lastname: "", firstname: "", password: "", role: "Student Assistant" });
      fetchStaffs();
    } catch (err) {
      console.error("Failed to create staff", err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;
    try {
      await axios.get(API_URL, {
        params: { sheet: "users", action: "update", ...form },
      });
      setOpen(false);
      setForm({ email: "", lastname: "", firstname: "", password: "", role: "Student Assistant" });
      setEditing(false);
      setSelectedStaff(null);
      fetchStaffs();
    } catch (err) {
      console.error("Failed to update staff", err);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm("Are you sure you want to delete this staff?")) return;
    try {
      await axios.get(API_URL, {
        params: { sheet: "users", action: "delete", email },
      });
      fetchStaffs();
    } catch (err) {
      console.error("Failed to delete staff", err);
    }
  };

  const openEditModal = (staff: Staff) => {
    setEditing(true);
    setSelectedStaff(staff);
    setForm({ ...staff });
    setOpen(true);
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" mb={3} spacing={2} alignItems="center">
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          Staff Management
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setForm({ email: "", lastname: "", firstname: "", password: "", role: "Student Assistant" });
            setEditing(false);
            setOpen(true);
          }}
          sx={{ bgcolor: "#f8a41a", "&:hover": { bgcolor: "#D32F2F" }, textTransform: "none" }}
        >
          + Add Staff
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedStaffs.length === 0}
          onClick={async () => {
            if (!window.confirm("Are you sure you want to delete selected staff?")) return;
            try {
              await Promise.all(
                selectedStaffs.map(email =>
                  axios.get(API_URL, { params: { sheet: "users", action: "delete", email } })
                )
              );
              setSelectedStaffs([]);
              fetchStaffs();
            } catch (err) {
              console.error("Failed to delete selected staff", err);
            }
          }}
        >
          Delete Selected ({selectedStaffs.length})
        </Button>
      </Stack>

      {loading ? (
        <Loader />
      ) : (
        <Stack
          direction="row"
          flexWrap="wrap"
          spacing={2}
          useFlexGap
        >
          {staffs.map((staff) => (
            <Card
              key={staff.email}
              sx={{
                width: 250,
                p: 2,
                borderRadius: 3,
                boxShadow: 3,
                position: "relative",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Checkbox
                  checked={selectedStaffs.includes(staff.email)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStaffs([...selectedStaffs, staff.email]);
                    } else {
                      setSelectedStaffs(selectedStaffs.filter((email) => email !== staff.email));
                    }
                  }}
                  size="small"
                />
                <Typography variant="subtitle1" fontWeight="bold">
                  {staff.firstname} {staff.lastname}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {staff.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  display: "inline-block",
                  px: 1,
                  py: 0.3,
                  borderRadius: 2,
                  bgcolor: staff.role === "Custodian" ? "blue.100" : "red.100",
                }}
              >
                {staff.role}
              </Typography>

              <Stack direction="row" spacing={1} mt={2}>
                <Button
                  size="small"
                  onClick={() => openEditModal(staff)}
                  startIcon={<EditIcon />}
                  sx={{ textTransform: "none" }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDelete(staff.email)}
                  startIcon={<DeleteIcon />}
                  sx={{ textTransform: "none", color: "error.main" }}
                >
                  Delete
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C" }}>
          {editing ? "Update Staff" : "Add Staff"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Lastname"
              value={form.lastname}
              onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Firstname"
              value={form.firstname}
              onChange={(e) => setForm({ ...form, firstname: e.target.value })}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              variant="outlined"
            />

            <ToggleButtonGroup
              value={form.role}
              exclusive
              onChange={(_, value) => value && setForm({ ...form, role: value })}
              fullWidth
            >
              <ToggleButton
                value="Student Assistant"
                sx={{ flex: 1, "&.Mui-selected": { bgcolor: "#B71C1C", color: "#FFF" } }}
              >
                Student Assistant
              </ToggleButton>
              <ToggleButton
                value="Custodian"
                sx={{ flex: 1, "&.Mui-selected": { bgcolor: "#B71C1C", color: "#FFF" } }}
              >
                Custodian
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{ textTransform: "none", color: "#B71C1C", fontWeight: "bold" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editing ? handleUpdate : handleCreate}
            sx={{
              bgcolor: "#B71C1C",
              "&:hover": { bgcolor: "#D32F2F" },
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            {editing ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StaffPage;
