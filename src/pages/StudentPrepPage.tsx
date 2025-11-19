import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

interface Reservation {
  _id: string;
  reservation_code: string;
  subject?: string;
  course?: string;
  instructor?: string;
  schedule?: string;
  group_count?: number;
  notes?: string;
  // ...other optional fields
}

export default function StudentPrepPage() {
  const [code, setCode] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupNumber, setGroupNumber] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [members, setMembers] = useState<{ name: string; id: string }[]>([]);
  const [memberDraft, setMemberDraft] = useState({ name: "", id: "" });
  const [barcode, setBarcode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadReservation = async () => {
    if (!code.trim()) return alert("Enter reservation code");
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE_URL}/reservations/code/${encodeURIComponent(code.trim())}`);
      setReservation(resp.data);
      // prefill nothing sensitive — students provide group details
      setDialogOpen(true);
    } catch (err: any) {
      console.error("Load reservation error:", err);
      alert(err.response?.data?.error || "Reservation not found");
      setReservation(null);
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    if (!memberDraft.name.trim() && !memberDraft.id.trim()) return;
    setMembers(prev => [...prev, { ...memberDraft }]);
    setMemberDraft({ name: "", id: "" });
  };

  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const generateBarcode = (): string => {
    // Always return a string (never undefined) so callers can safely use it
    if (!reservation) {
      const fallback = `UNKNOWN-${(Date.now()).toString(36).slice(-5)}`.toUpperCase();
      setBarcode(fallback);
      return fallback;
    }
    const g = groupNumber.trim() || "G";
    const suffix = Date.now().toString(36).slice(-5);
    const b = `${reservation.reservation_code}-${g}-${suffix}`.toUpperCase();
    setBarcode(b);
    return b;
  };

  const copyBarcode = async () => {
    if (!barcode) return;
    try {
      await navigator.clipboard.writeText(barcode);
      alert("Barcode copied to clipboard");
    } catch {
      // fallback
      alert(`Barcode: ${barcode}`);
    }
  };

  const savePrep = async () => {
    if (!reservation) return;
    if (!leaderName.trim() || !leaderId.trim() || !groupNumber.trim()) {
      return alert("Please fill Group Number, Leader Name and Leader ID");
    }
    setSaving(true);
    try {
      // ensure barcode
      const generated: string = barcode || generateBarcode();
      const updatedNotes = (reservation.notes || "") + (reservation.notes ? "\n" : "") + `Group Barcode: ${generated}`;

      // Build payload for StudentPrep model (stored separately)
      const prepPayload = {
        reservation_ref: reservation._id,
        reservation_code: reservation.reservation_code,
        group_barcode: generated,
        user_type: "Group",
        borrower_name: "", // not used for group flow
        group_number: groupNumber,
        group_leader: leaderName,
        group_leader_id: leaderId,
        group_members: members.map(m => ({ name: m.name || "", id: m.id || "" })),
        notes: updatedNotes
      };

      // Save student-prep record to new endpoint
      await axios.post(`${API_BASE_URL}/student-prep`, { action: 'create', ...prepPayload });

      // Optionally still update reservation.notes locally (but not required)
      // If you want staff to see group_barcode via reservation endpoint too, you could PUT reservation here.
      setBarcode(generated);
      alert("Group prep saved. Show the barcode to staff at pickup.");
      setDialogOpen(false);
    } catch (err) {
      console.error("Save prep error:", err);
      alert("Failed to save group prep");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Student Reservation Prep
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your reservation code and fill your group details. A group barcode will be generated — show it
          to staff when picking up equipment so they can pre-fill borrower info.
        </Typography>

        <Stack direction="row" spacing={2} mb={2}>
          <TextField
            fullWidth
            label="Reservation Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadReservation(); }}
          />
          <Button variant="contained" onClick={loadReservation} disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </Button>
        </Stack>

        {reservation && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Reservation found:</Typography>
            <Typography variant="body2">{reservation.subject} — {reservation.course} — {reservation.instructor}</Typography>
          </Box>
        )}

        {barcode && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="caption">Generated Group Barcode</Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>{barcode}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <IconButton onClick={copyBarcode}><ContentCopyIcon /></IconButton>
                <Button variant="outlined" onClick={() => setBarcode(null)}>Clear</Button>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Scan or type this code into the Borrow page's Reservation Code field to auto-populate borrower info.
            </Typography>
          </Paper>
        )}

        <Box>
          <Button
            disabled={!reservation}
            onClick={() => setDialogOpen(true)}
            variant="outlined"
          >
            Open Group Prep Form
          </Button>
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Group Preparation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Group Number"
              value={groupNumber}
              onChange={(e) => setGroupNumber(e.target.value)}
            />
            <TextField
              label="Group Leader Name"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
            />
            <TextField
              label="Group Leader ID"
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Group Members</Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  label="Member Name"
                  value={memberDraft.name}
                  onChange={(e) => setMemberDraft(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Member ID"
                  value={memberDraft.id}
                  onChange={(e) => setMemberDraft(prev => ({ ...prev, id: e.target.value }))}
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={addMember}>Add</Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {members.map((m, i) => (
                  <Chip
                    key={i}
                    label={`${m.name || "Unnamed"} ${m.id ? `(${m.id})` : ""}`}
                    onDelete={() => removeMember(i)}
                    sx={{ m: 0.5 }}
                  />
                ))}
                {members.length === 0 && <Typography variant="caption" color="text.secondary">No members added</Typography>}
              </Stack>
            </Box>

            <TextField
              label="Optional Notes"
              multiline
              rows={3}
              InputProps={{ startAdornment: <InputAdornment position="start">✎</InputAdornment> }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { generateBarcode(); }} variant="outlined">Generate Barcode</Button>
          <Button onClick={savePrep} variant="contained" disabled={saving}>{saving ? "Saving..." : "Save & Publish Barcode"}</Button>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
