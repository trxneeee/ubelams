// src/pages/InventoryPage.tsx
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
  DialogActions,
  TextField,
  Stack,
  TablePagination
} from "@mui/material";
import Loader from "../components/Loader";
import { Box } from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";

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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
const [page, setPage] = useState(0);
const rowsPerPage = 10;
const handleChangePage = (_: unknown, newPage: number) => {
  setPage(newPage);
};

  // modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InventoryItem>({
    item_id: Date.now().toString(),
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
    // generate unique ID
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

// Add these handlers above the return statement
const handleDelete = async (item_id: string) => {
  if (!window.confirm("Are you sure you want to delete this item?")) return;
  try {
    await axios.get(API_URL, {
      params: {
        sheet: "inventory",
        action: "delete",
        item_id,
      },
    });
    fetchInventory();
  } catch (err) {
    console.error("Failed to delete item", err);
  }
};

const handleUpdate = async (item: InventoryItem) => {
  const updatedName = window.prompt("Update Name:", item.name);
  if (updatedName === null) return; // Cancelled
  try {
    await axios.get(API_URL, {
      params: {
        sheet: "inventory",
        action: "update",
        item_id: item.item_id,
        name: updatedName,
        location: item.location,
        brand_model: item.brand_model,
        total_quantity: item.total_quantity,
        borrowed: item.borrowed,
        barcode: item.barcode,
        serial_number: item.serial_number,
      },
    });
    fetchInventory();
  } catch (err) {
    console.error("Failed to update item", err);
  }
};


  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div>
<Container maxWidth="lg" sx={{ mt: 4 }}>
  {/* Fixed summary cards */}
<Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
  {/* Summary Cards */}
  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, boxShadow: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
    <Inventory2Icon sx={{ fontSize: 30, color: "#B71C1C" }} />
    <Box>
      <Typography variant="caption" color="text.secondary">Total Items</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#B71C1C" }}>{inventory.length}</Typography>
    </Box>
  </Card>

  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, boxShadow: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
    <WarningAmberIcon sx={{ fontSize: 30, color: "#FF8F00" }} />
    <Box>
      <Typography variant="caption" color="text.secondary">Low Stock</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#FF8F00" }}>
        {inventory.filter(i => parseInt(i.total_quantity) <= 5).length}
      </Typography>
    </Box>
  </Card>

  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, boxShadow: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
    <AssignmentTurnedInIcon sx={{ fontSize: 30, color: "#1B5E20" }} />
    <Box>
      <Typography variant="caption" color="text.secondary">Borrowed</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#1B5E20" }}>
        {inventory.reduce((acc, i) => acc + parseInt(i.borrowed), 0)}
      </Typography>
    </Box>
  </Card>

  {/* Buttons */}
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={0.5}>
    <Button
      variant="contained"
      onClick={() => setOpen(true)}
      sx={{
        bgcolor: "#B71C1C",
        "&:hover": { bgcolor: "#D32F2F" },
        borderRadius: 1.5,
        textTransform: "none",
        minWidth: 120,
        height: 48,
        fontSize: "0.8rem"
      }}
    >
      ➕ Add Item
    </Button>

    <Button
      variant="contained"
      color="error"
      sx={{
        borderRadius: 1.5,
        textTransform: "none",
        minWidth: 120,
        height: 48,
        fontSize: "0.8rem"
      }}
      disabled={selectedItems.length === 0}
      onClick={async () => {
        if (!window.confirm("Are you sure you want to delete selected items?")) return;
        try {
          await Promise.all(selectedItems.map(item_id =>
            axios.get(API_URL, { params: { sheet: "inventory", action: "delete", item_id } })
          ));
          setSelectedItems([]);
          fetchInventory();
        } catch (err) {
          console.error("Failed to delete selected items", err);
        }
      }}
    >
      Delete Selected ({selectedItems.length})
    </Button>
  </Stack>
</Stack>

  {/* Scrollable table card */}
<Card
  sx={{
    p: { xs: 1.5, sm: 3 },
    borderRadius: 3,
    boxShadow: 4,
    backgroundColor: "#fff",
    height: "100%",
    minHeight:'60vh',
    marginBottom:10,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: loading ? "center" : "flex-start",
    alignItems: loading ? "center" : "flex-start",
  }}
>
  {loading ? (
    <Loader />
  ) : inventory.length === 0 ? (
    <Typography variant="body2" color="text.secondary">
      No inventory items found.
    </Typography>
  ) : (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Table
        sx={{
          minWidth: 650,
          "& th": { bgcolor: "#f4f4f4", fontWeight: "bold", fontSize: { xs: "0.65rem", sm: "0.85rem" } },
          "& td": { fontSize: { xs: "0.65rem", sm: "0.85rem" } },
          "& tr:hover": { bgcolor: "#fbe9e7" },
        }}
        size="small"
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}> </TableCell>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Brand/Model</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Borrowed</TableCell>
            <TableCell>Barcode</TableCell>
            <TableCell>Serial #</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {inventory
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((item) => (
              <TableRow key={item.item_id}>
                <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.item_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.item_id]);
                      } else {
                        setSelectedItems(selectedItems.filter((id) => id !== item.item_id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{item.item_id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.brand_model}</TableCell>
                <TableCell>{item.total_quantity}</TableCell>
                <TableCell>{item.borrowed}</TableCell>
                <TableCell>{item.barcode}</TableCell>
                <TableCell>{item.serial_number}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
  <Tooltip title="Update">
    <IconButton
      color="primary"
      onClick={() => handleUpdate(item)}
      sx={{
        bgcolor: "#e3f2fd",
        "&:hover": { bgcolor: "#90caf9" },
        p: 1,
      }}
    >
      <EditIcon fontSize="small" />
    </IconButton>
  </Tooltip>

  <Tooltip title="Delete">
    <IconButton
      color="error"
      onClick={() => handleDelete(item.item_id)}
      sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#f44336", color: "#fff" },
        p: 1,
      }}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Tooltip>
</Stack>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={inventory.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10]}
      />
    </Box>
  )}
</Card>

</Container>


      {/* Add Item Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#B71C1C" }}>
          ➕ Add Inventory Item
        </DialogTitle>
<DialogContent dividers>
  <Stack spacing={2} mt={1}>
    {/* Removed Item ID field */}
    <TextField
      label="Name"
      value={form.name}
      onChange={(e) => setForm({ ...form, name: e.target.value })}
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Location"
      value={form.location}
      onChange={(e) => setForm({ ...form, location: e.target.value })}
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Brand/Model"
      value={form.brand_model}
      onChange={(e) => setForm({ ...form, brand_model: e.target.value })}
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Total Quantity"
      type="number"
      value={form.total_quantity}
      onChange={(e) =>
        setForm({ ...form, total_quantity: e.target.value })
      }
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Barcode"
      value={form.barcode}
      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
      fullWidth
      variant="outlined"
    />
    <TextField
      label="Serial Number"
      value={form.serial_number}
      onChange={(e) =>
        setForm({ ...form, serial_number: e.target.value })
      }
      fullWidth
      variant="outlined"
    />
  </Stack>
</DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{
              textTransform: "none",
              color: "#B71C1C",
              fontWeight: "bold",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{
              bgcolor: "#B71C1C",
              "&:hover": { bgcolor: "#D32F2F" },
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
