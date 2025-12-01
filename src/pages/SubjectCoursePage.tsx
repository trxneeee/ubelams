import { useEffect, useState } from "react";
import { Container, Card, Typography, Stack, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Paper, Box, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UBLogo from "../assets/ublogo.png"; // UB logo
import axios from "axios";

const API_BASE_URL = "https://elams-server.onrender.com/api";
const user = JSON.parse(localStorage.getItem("user") || "{}");
const userRole = user?.role || "Custodian";

// --- NEW: subject-course mapping ---
interface Subject {
  _id: string;
  name: string;
  code?: string;
  courses?: string[]; // course IDs
}
interface Course {
  _id: string;
  name: string;
  code?: string;
}

export default function SubjectCoursePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [newCourse, setNewCourse] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(false);

  // --- NEW: subject to course mapping ---
  const [subjectCourses, setSubjectCourses] = useState<Record<string, string[]>>({});

  // Pagination states
  const [subjectPage, setSubjectPage] = useState(0);
  const [coursePage, setCoursePage] = useState(0);
  const rowsPerPage = 5;

  const fetchLists = async () => {
    try {
      const [sRes, cRes] = await Promise.all([axios.get(`${API_BASE_URL}/subjects`), axios.get(`${API_BASE_URL}/courses`)]);
      setSubjects(Array.isArray(sRes.data) ? sRes.data : []);
      setCourses(Array.isArray(cRes.data) ? cRes.data : []);
      // --- NEW: fetch subject-course mapping if available ---
      // If your backend supports subject.courses, use it; otherwise, keep empty
      const subjMap: Record<string, string[]> = {};
      (Array.isArray(sRes.data) ? sRes.data : []).forEach((s: any) => {
        if (Array.isArray(s.courses)) subjMap[s._id] = s.courses;
      });
      setSubjectCourses(subjMap);
    } catch (err) {
      console.error("Failed to fetch subjects/courses", err);
    }
  };

  useEffect(() => { fetchLists(); }, []);

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Helper for confirmation modal
  const showConfirm = (title: string, message: string, onYes: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirm(() => onYes);
    setConfirmOpen(true);
  };

  const createSubject = async () => {
    if (!newSubject.name.trim()) {
      setSnackbar({ open: true, message: "Subject name required", severity: "error" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/subjects`, { name: newSubject.name.trim(), code: newSubject.code.trim() });
      setNewSubject({ name: "", code: "" });
      await fetchLists();
      setSnackbar({ open: true, message: "Subject added", severity: "success" });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || "Failed to create subject", severity: "error" });
    } finally { setLoading(false); }
  };

  const createCourse = async () => {
    if (!newCourse.name.trim()) {
      setSnackbar({ open: true, message: "Course name required", severity: "error" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/courses`, { name: newCourse.name.trim(), code: newCourse.code.trim() });
      setNewCourse({ name: "", code: "" });
      await fetchLists();
      setSnackbar({ open: true, message: "Program added", severity: "success" });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || "Failed to create program", severity: "error" });
    } finally { setLoading(false); }
  };

  const deleteSubject = async (id: string) => {
    showConfirm(
      "Delete Subject",
      "Are you sure you want to delete this subject?",
      async () => {
        setConfirmOpen(false);
        try {
          await axios.delete(`${API_BASE_URL}/subjects/${id}`);
          await fetchLists();
          setSnackbar({ open: true, message: "Subject deleted", severity: "success" });
        } catch (err) {
          setSnackbar({ open: true, message: "Failed to delete subject", severity: "error" });
        }
      }
    );
  };

  const deleteCourse = async (id: string) => {
    showConfirm(
      "Delete Program",
      "Are you sure you want to delete this program?",
      async () => {
        setConfirmOpen(false);
        try {
          await axios.delete(`${API_BASE_URL}/courses/${id}`);
          await fetchLists();
          setSnackbar({ open: true, message: "Program deleted", severity: "success" });
        } catch (err) {
          setSnackbar({ open: true, message: "Failed to delete program", severity: "error" });
        }
      }
    );
  };

  // --- NEW: add course to subject ---
  const addCourseToSubject = async (subjectId: string, courseId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/subjects/${subjectId}`, { addCourse: courseId });
      await fetchLists();
      setSnackbar({ open: true, message: "Course linked to subject", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to link course to subject", severity: "error" });
    }
  };

  // --- NEW: remove course from subject ---
  const removeCourseFromSubject = async (subjectId: string, courseId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/subjects/${subjectId}`, { removeCourse: courseId });
      await fetchLists();
      setSnackbar({ open: true, message: "Program unlinked from subject", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to unlink program from subject", severity: "error" });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* UB Branding Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <img src={UBLogo} alt="University of Baguio" style={{ height: 56, borderRadius: 12, background: "#fff", boxShadow: "0 2px 8px rgba(183,28,28,0.08)" }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#B71C1C" }}>
            Subjects & Programs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            University of Baguio
          </Typography>
        </Box>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        {/* Subjects Card */}
        <Card sx={{
          flex: 1,
          p: 3,
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          background: `linear-gradient(135deg, #B71C1C11 0%, #B71C1C22 100%)`
        }}>
          <Typography variant="h6" mb={1} sx={{ color: "#B71C1C", fontWeight: "bold" }}>Subjects</Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField label="Subject name" value={newSubject.name} onChange={(e) => setNewSubject(s => ({ ...s, name: e.target.value }))} size="small" fullWidth />
            <Button variant="contained" onClick={createSubject} disabled={!(userRole === "Custodian" || userRole === "Admin") || loading} sx={{ bgcolor: "#B71C1C", color: "#fff", fontWeight: "bold" }}>Add</Button>
          </Stack>

          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  {/* REMOVED <TableCell>Code</TableCell> */}
                  <TableCell>Programs</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.slice(subjectPage * rowsPerPage, subjectPage * rowsPerPage + rowsPerPage).map(s => (
                  <TableRow key={s._id}>
                    <TableCell>{s.name}</TableCell>
                    {/* REMOVED Code cell */}
                    <TableCell>
                      {/* List courses linked to this subject */}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {(subjectCourses[s._id] || []).map(cid => {
                          const course = courses.find(c => c._id === cid);
                          return course ? (
                            <Box key={cid} sx={{ bgcolor: "#F8A41A22", px: 1.5, py: 0.5, borderRadius: 2, fontSize: 13, fontWeight: 500, color: "#B71C1C", display: "flex", alignItems: "center", gap: 0.5 }}>
                              {course.name}
                              <IconButton size="small" color="error" sx={{ ml: 0.5 }} onClick={() => removeCourseFromSubject(s._id, cid)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : null;
                        })}
                        {/* Add course dropdown */}
                        {(userRole === "Custodian" || userRole === "Admin") && (
                          <TextField
                            select
                            size="small"
                            value=""
                            onChange={e => addCourseToSubject(s._id, e.target.value)}
                            sx={{ minWidth: 120, bgcolor: "#fff", borderRadius: 2 }}
                            SelectProps={{ native: true }}
                          >
                            <option value="">Select</option>
                            {courses.filter(c => !(subjectCourses[s._id] || []).includes(c._id)).map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </TextField>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => deleteSubject(s._id)} disabled={!(userRole === "Custodian" || userRole === "Admin")}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5]}
              component="div"
              count={subjects.length}
              rowsPerPage={rowsPerPage}
              page={subjectPage}
              onPageChange={(_, newPage) => setSubjectPage(newPage)}
              onRowsPerPageChange={() => {}}
            />
          </Paper>
        </Card>

        {/* Courses Card */}
        <Card sx={{
          flex: 1,
          p: 3,
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          background: `linear-gradient(135deg, #75757511 0%, #75757522 100%)`
        }}>
          <Typography variant="h6" mb={1} sx={{ color: "#757575", fontWeight: "bold" }}>Programs</Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField label="Program name" value={newCourse.name} onChange={(e) => setNewCourse(c => ({ ...c, name: e.target.value }))} size="small" fullWidth />
            <Button variant="contained" onClick={createCourse} disabled={!(userRole === "Custodian" || userRole === "Admin") || loading} sx={{ bgcolor: "#757575", color: "#fff", fontWeight: "bold" }}>Add</Button>
          </Stack>

          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  {/* REMOVED <TableCell>Code</TableCell> */}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.slice(coursePage * rowsPerPage, coursePage * rowsPerPage + rowsPerPage).map(c => (
                  <TableRow key={c._id}>
                    <TableCell>{c.name}</TableCell>
                    {/* REMOVED Code cell */}
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => deleteCourse(c._id)} disabled={!(userRole === "Custodian" || userRole === "Admin")}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5]}
              component="div"
              count={courses.length}
              rowsPerPage={rowsPerPage}
              page={coursePage}
              onPageChange={(_, newPage) => setCoursePage(newPage)}
              onRowsPerPageChange={() => {}}
            />
          </Paper>
        </Card>
      </Stack>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
            color="error"
            variant="contained"
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2, fontWeight: "medium" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
