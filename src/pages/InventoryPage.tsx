// src/pages/InventoryPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from "@mui/material";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface InventoryItem {
  item_id: string;
  name: string;
  location: string;
  brand_model: string;
  total_quantity: string;
  borrowed: string;
  barcode: string;
  serial_number: string;
}

const InventoryPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InventoryItem>({
    item_id: "",
    name: "",
    location: "",
    brand_model: "",
    total_quantity: "",
    borrowed: "0",
    barcode: "",
    serial_number: "",
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: { sheet: "inventory", action: "read" },
      });

      const result = response.data;
      if (result.success) {
        const rows = result.data;
        const headers = rows[0];
        const idx = (key: string) => headers.indexOf(key);

        const parsed = rows.slice(1).map((row: any[]) => ({
          item_id: row[idx("item_id")],
          name: row[idx("name")],
          location: row[idx("location")],
          brand_model: row[idx("brand_model")],
          total_quantity: row[idx("total_quantity")],
          borrowed: row[idx("borrowed")],
          barcode: row[idx("barcode")],
          serial_number: row[idx("serial_number")],
        }));

        setInventory(parsed);
      }
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    } finally {
      setLoading(false);
    }
  };

const handleCreate = async () => {
  try {
    await axios.get(API_URL, {
      params: {
        sheet: "inventory",
        action: "create",
        ...form,
      },
    });

    setOpen(false);
    setForm({
      item_id: "",
      name: "",
      location: "",
      brand_model: "",
      total_quantity: "",
      borrowed: "0",
      barcode: "",
      serial_number: "",
    });

    fetchInventory();
  } catch (err) {
    console.error("Failed to create item", err);
  }
};

useEffect(() => {
  fetchInventory();
}, []);


  return (
    <div>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h5">📦 Inventory</Typography>
              <Button variant="contained" onClick={() => setOpen(true)}>
                ➕ Add Item
              </Button>
            </Stack>

            {loading ? (
              <CircularProgress />
            ) : inventory.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                No inventory items found.
              </Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Location</strong></TableCell>
                    <TableCell><strong>Brand/Model</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Borrowed</strong></TableCell>
                    <TableCell><strong>Barcode</strong></TableCell>
                    <TableCell><strong>Serial #</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell>{item.item_id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{item.brand_model}</TableCell>
                      <TableCell>{item.total_quantity}</TableCell>
                      <TableCell>{item.borrowed}</TableCell>
                      <TableCell>{item.barcode}</TableCell>
                      <TableCell>{item.serial_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Add Item Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Item ID"
              value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Brand/Model"
              value={form.brand_model}
              onChange={(e) => setForm({ ...form, brand_model: e.target.value })}
              fullWidth
            />
            <TextField
              label="Total Quantity"
              type="number"
              value={form.total_quantity}
              onChange={(e) =>
                setForm({ ...form, total_quantity: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Barcode"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              fullWidth
            />
            <TextField
              label="Serial Number"
              value={form.serial_number}
              onChange={(e) =>
                setForm({ ...form, serial_number: e.target.value })
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
