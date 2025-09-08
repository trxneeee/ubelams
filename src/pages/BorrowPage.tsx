// src/pages/BorrowPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Stack,
} from "@mui/material";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface BorrowRecord {
  borrow_id: string;
  item: string;
  quantity: string;
  borrower_email: string;
  dateBorrowed: string;
  returnDate: string;
  status: string;
}

export default function BorrowPage() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BorrowRecord>  ({
    borrow_id: "",
    item: "",
    quantity: "",
    borrower_email: "",
    dateBorrowed: "",
    returnDate: "",
    status: "",
  });

  // Fetch records
  const fetchRecords = async () => {
    try {
      const res = await axios.get(WEB_APP_URL, { params: { action: "read", sheet: "borrow" } });
      // skip headers row
      const rows = res.data.data.slice(1).map((row: string[]) => ({
        borrow_id: row[0],
        item: row[1],
        quantity: row[2],
        borrower_email: row[3],
        dateBorrowed: row[4],
        returnDate: row[5],
        status: row[6],
      }));
      setRecords(rows);
    } catch (err) {
      console.error(err);
    }
  };

  // Create record
  const handleCreate = async () => {
    try {
      await axios.get(WEB_APP_URL, {
        params: {
          action: "create",
          sheet: "borrow",
          item: form.item,
          quantity: form.quantity,
          borrower_email: form.borrower_email,
          dateBorrowed: form.dateBorrowed,
          returnDate: form.returnDate,
          status: form.status,
        },
      });
      setOpen(false);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <Container>
      <Card sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Borrow Records</Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            New Borrow
          </Button>
        </Stack>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Borrower</TableCell>
              <TableCell>Date Borrowed</TableCell>
              <TableCell>Return Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.item}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.borrower_email}</TableCell>
                <TableCell>{row.dateBorrowed}</TableCell>
                <TableCell>{row.returnDate}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Borrow</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Item"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
            />
            <TextField
              label="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <TextField
              label="Borrower Email"
              value={form.borrower_email}
              onChange={(e) =>
                setForm({ ...form, borrower_email: e.target.value })
              }
            />
            <TextField
              label="Date Borrowed"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.dateBorrowed}
              onChange={(e) =>
                setForm({ ...form, dateBorrowed: e.target.value })
              }
            />
            <TextField
              label="Return Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.returnDate}
              onChange={(e) =>
                setForm({ ...form, returnDate: e.target.value })
              }
            />
            <TextField
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
            <Button variant="contained" onClick={handleCreate}>
              Save
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
