import { useEffect, useState } from "react";
import { Container, Card, Typography, Stack, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Paper } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const API_BASE_URL = "https://elams-server.onrender.com/api";
const user = JSON.parse(localStorage.getItem("user") || "{}");
const userRole = user?.role || "Custodian";

export default function SubjectCoursePage() {
  const [subjects, setSubjects] = useState<{ _id: string; name: string; code?: string }[]>([]);
  const [courses, setCourses] = useState<{ _id: string; name: string; code?: string }[]>([]);
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [newCourse, setNewCourse] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(false);

  const fetchLists = async () => {
    try {
      const [sRes, cRes] = await Promise.all([axios.get(`${API_BASE_URL}/subjects`), axios.get(`${API_BASE_URL}/courses`)]);
      setSubjects(Array.isArray(sRes.data) ? sRes.data : []);
      setCourses(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      console.error("Failed to fetch subjects/courses", err);
    }
  };

  useEffect(() => { fetchLists(); }, []);

  const createSubject = async () => {
    if (!newSubject.name.trim()) return alert("Subject name required");
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/subjects`, { name: newSubject.name.trim(), code: newSubject.code.trim() });
      setNewSubject({ name: "", code: "" });
      await fetchLists();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create subject");
    } finally { setLoading(false); }
  };

  const createCourse = async () => {
    if (!newCourse.name.trim()) return alert("Course name required");
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/courses`, { name: newCourse.name.trim(), code: newCourse.code.trim() });
      setNewCourse({ name: "", code: "" });
      await fetchLists();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create course");
    } finally { setLoading(false); }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm("Delete subject?")) return;
    try { await axios.delete(`${API_BASE_URL}/subjects/${id}`); await fetchLists(); } catch (err) { console.error(err); alert("Failed to delete"); }
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm("Delete course?")) return;
    try { await axios.delete(`${API_BASE_URL}/courses/${id}`); await fetchLists(); } catch (err) { console.error(err); alert("Failed to delete"); }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" color="#b91c1c" fontWeight="bold" gutterBottom>Subjects & Courses</Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Card sx={{ flex: 1, p: 2 }}>
          <Typography variant="h6" mb={1}>Subjects</Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField label="Subject name" value={newSubject.name} onChange={(e) => setNewSubject(s => ({ ...s, name: e.target.value }))} size="small" fullWidth />
            <TextField label="Code (optional)" value={newSubject.code} onChange={(e) => setNewSubject(s => ({ ...s, code: e.target.value }))} size="small" sx={{ width: 140 }} />
            <Button variant="contained" onClick={createSubject} disabled={!(userRole === "Custodian" || userRole === "Admin") || loading}>Add</Button>
          </Stack>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {subjects.map(s => (
                  <TableRow key={s._id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.code || "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => deleteSubject(s._id)} disabled={!(userRole === "Custodian" || userRole === "Admin")}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Card>

        <Card sx={{ flex: 1, p: 2 }}>
          <Typography variant="h6" mb={1}>Courses</Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField label="Course name" value={newCourse.name} onChange={(e) => setNewCourse(c => ({ ...c, name: e.target.value }))} size="small" fullWidth />
            <TextField label="Code (optional)" value={newCourse.code} onChange={(e) => setNewCourse(c => ({ ...c, code: e.target.value }))} size="small" sx={{ width: 140 }} />
            <Button variant="contained" onClick={createCourse} disabled={!(userRole === "Custodian" || userRole === "Admin") || loading}>Add</Button>
          </Stack>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {courses.map(c => (
                  <TableRow key={c._id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.code || "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => deleteCourse(c._id)} disabled={!(userRole === "Custodian" || userRole === "Admin")}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Card>
      </Stack>
    </Container>
  );
}
