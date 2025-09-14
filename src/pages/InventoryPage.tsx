// src/pages/InventoryPage.tsx
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

interface InventoryItem {
  num: string;
  identifier_type: string;
  identifiers: string[]; 
  statuses: string[];    // array for per-quantity identifiers
  equipment_name: string;
  facility: string;
  brand_model: string;
  total_qty: string;
  borrowed: string;
  location: string;
  soft_hard: string;
  e_location: string;
  bat_type: string;
  bat_qty: string;
  bat_total: string;
}

interface CInventoryItem {
  num: string;
  location: string;
  description: string;
  quantity_opened: string;
  quantity_unopened: string;
  quantity_on_order: string;
  remarks: string;
  experiment: string;
  subject: string;
  date_issued: string;
  issuance_no: string;
}



const InventoryPage = () => {
    const [editing, setEditing] = useState(false);
const [viewing, setViewing] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [cinventory, setCInventory] = useState<CInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
const [page, setPage] = useState(0);
const rowsPerPage = 10;
const handleChangePage = (_: unknown, newPage: number) => {
  setPage(newPage);
};
const [searchQuery, setSearchQuery] = useState("");
  // modal state
  const [open, setOpen] = useState(false);
  const [itemType, setItemType] = useState("Non-Consumable");
  const [battery, setBattery] = useState("Without Battery");
const [form, setForm] = useState<InventoryItem>({
  num: "",
  identifier_type: "None", // default option
  identifiers: [],       
  statuses: [],                 // ✅ added for per-quantity identifiers
  equipment_name: "",
  facility: "",
  brand_model: "",
  total_qty: "1",
  borrowed: "0",
  location: "",
  soft_hard: "N/A",
  e_location: "",
  bat_type: "",
  bat_qty: "",
  bat_total: "",
});


const [form2, setForm2] = useState<CInventoryItem>({
  num: "",
  location: "",
  description: "",
  quantity_opened: "",
  quantity_unopened: "",
  quantity_on_order: "",
  remarks: "",
  experiment: "",
  subject: "",
  date_issued: "",
  issuance_no: "",
});

const initialFormNC: InventoryItem = {
  num: "",
  identifier_type: "Control Number",
  identifiers: [],
  statuses: [], // ✅ add this
  equipment_name: "",
  facility: "",
  brand_model: "",
  total_qty: "1",
  borrowed: "0",
  location: "",
  soft_hard: "N/A",
  e_location: "",
  bat_type: "",
  bat_qty: "",
  bat_total: "",
};


const initialFormC = {
  num: "",
  description: "",
  location: "",
  quantity_opened: "",
  quantity_unopened: "",
  quantity_on_order: "",
  remarks: "",
  experiment: "",
  subject: "",
  date_issued: "",
  issuance_no: "",
};

const handleEditClick = (item: InventoryItem | CInventoryItem) => {
  if (itemType === "Non-Consumable") {
    // assert to InventoryItem so setForm accepts it
    const nc = item as InventoryItem;
    setForm({ ...nc });

    // Battery check only for NC
    if (nc.bat_type || nc.bat_qty) {
      setBattery("With Battery");
    } else {
      setBattery("Without Battery");
    }
  } else {
    // assert to CInventoryItem so setForm2 accepts it
    const c = item as CInventoryItem;
    setForm2({ ...c });
  }

  setEditing(true);
  setViewing(false);
  setOpen(true);
};

const fieldStyle = {
  mt: 2,
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#333",
    color: "#333",
  },
  "& .MuiOutlinedInput-root.Mui-disabled": {
    backgroundColor: "#f5f5f5",
  },
};

const filteredInventory = inventory.filter((item) =>
  [item.equipment_name, item.location, item.brand_model]
    .some((field) =>
      String(field || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
);

const filteredCInventory = cinventory.filter((item) =>
  [item.description, item.location, item.remarks]
    .some((field) =>
      String(field || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
);


const handleViewClick = (item: InventoryItem | CInventoryItem) => {
  if (itemType === "Non-Consumable") {
    setForm(item as InventoryItem);

    if ((item as InventoryItem).bat_type || (item as InventoryItem).bat_qty) {
      setBattery("With Battery");
    } else {
      setBattery("Without Battery");
    }
  } else {
    setForm2(item as CInventoryItem);
  }

  setViewing(true);
  setEditing(false);
  setOpen(true);
};



const resetForm = () => {
  setEditing(false);
  setViewing(false);
 if (itemType === "Non-Consumable") {
  setForm(initialFormNC);
} else {
  setForm2(initialFormC);
}

};

useEffect(() => {
  const qty = Number(form.total_qty) || 0;

  // Fill statuses with "working" by default
  const newStatuses = Array.from({ length: qty }, (_, i) => 
    form.statuses?.[i] || "working"
  );

  setForm((prev) => ({ ...prev, statuses: newStatuses }));
}, [form.total_qty]);


// 🔹 Replace your useEffect + fetchInventory logic with this:

const fetchInventory = async () => {
  setLoading(true);
  try {
    const sheet = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";
    const response = await axios.get(API_URL, {
      params: { sheet, action: "read" },
    });

    const result = response.data;
    if (result.success) {
      const rows = result.data;
      const headers = rows[1];
      const idx = (key: string) => headers.indexOf(key);

      if (itemType === "Non-Consumable") {
        const parsed: InventoryItem[] = rows.slice(2).map((row: any[]) => {
          // === Identifiers ===
          const identifiersRaw = row[idx("IDENTIFIER_NUMBER")] || "";
          const identifiers = identifiersRaw
            ? String(identifiersRaw)
                .split(",")
                .map((id: string) =>
                  id.trim().replace(/^\{|\}$/g, "") // remove { }
                )
            : [];

          // === Statuses ===
          const statusesRaw = row[idx("STATUS")] || "";
          const statuses = statusesRaw
            ? String(statusesRaw)
                .split(",")
                .map((s: string) => s.trim().toLowerCase()) // "working" / "not working"
            : [];

          return {
            num: row[idx("NO.")],
            equipment_name: row[idx("EQUIPMENT_NAME")],
            facility: row[idx("FACILITY")],
            brand_model: row[idx("BRAND_MODEL")],
            total_qty: row[idx("TOTAL_QTY")],
            borrowed: row[idx("BORROWED")],
            identifier_type: row[idx("IDENTIFIER_TYPE")],
            identifiers,
            statuses, // ✅ new field
            location: row[idx("LOCATION")],
            soft_hard: row[idx("SOFT_HARD")],
            e_location: row[idx("E_LOCATION")],
            bat_type: row[idx("BAT_TYPE")],
            bat_qty: row[idx("BAT_QTY")],
            bat_total: row[idx("BAT_TOTAL")],
          };
        });
        setInventory(parsed);
      } else {
        const parsed: CInventoryItem[] = rows.slice(2).map((row: any[]) => ({
          num: row[idx("NO.")],
          location: row[idx("LOCATION")],
          description: row[idx("DESCRIPTION")],
          quantity_opened: row[idx("QUANTITY_OPENED")],
          quantity_unopened: row[idx("QUANTITY_UNOPENED")],
          quantity_on_order: row[idx("QUANTITY_ON_ORDER")],
          remarks: row[idx("REMARKS")],
          experiment: row[idx("EXPERIMENT")],
          subject: row[idx("SUBJECT")],
          date_issued: row[idx("DATE_ISSUED")],
          issuance_no: row[idx("ISSUANCE_NO")],
        }));
        setCInventory(parsed);
      }
    }
  } catch (err) {
    console.error("Failed to fetch inventory", err);
  } finally {
    setLoading(false);
  }
};


// 🔹 Make sure it re-fetches whenever `itemType` changes
useEffect(() => {
  fetchInventory();
}, [itemType]);

const handleCreate = async () => {
  try {
    if (itemType === "Non-Consumable") {
      const totalQty = Number(form.total_qty) || 0;

      // ✅ keep only identifiers up to total_qty
      const identifiers = form.identifiers
        .slice(0, totalQty)
        .map(id => `{${id}}`)
        .join(",");

      await axios.get(API_URL, {
        params: {
          sheet: "nc_inventory",
          action: "create",
          ...form,
          identifiers,
          statuses: form.statuses.join(","),
        },
      });

      setForm(initialFormNC);
      fetchInventory();
    } else {
      await axios.get(API_URL, {
        params: {
          sheet: "c_inventory",
          action: "create",
          ...form2,
        },
      });

      setForm2(initialFormC);
      fetchInventory();
    }

    setOpen(false);
  } catch (err) {
    console.error("Failed to create item", err);
  }
};


// Add these handlers above the return statement
const handleDelete = async (item: any) => {
  const sheet = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";
  const name =
    itemType === "Non-Consumable"
      ? item.equipment_name
      : item.description;

  if (
    !window.confirm(
      `Are you sure you want to delete "${name}"`
    )
  )
    return;

  try {
    await axios.get(API_URL, {
      params: {
        sheet,
        action: "delete",
        num: item.num, // still need num to identify row
      },
    });

    fetchInventory();
  } catch (err) {
    console.error("Failed to delete item", err);
  }
};


const handleUpdateItem = async () => {
  try {
    if (itemType === "Non-Consumable") {
      // ✅ adjust identifiers based on total_qty
      const totalQty = Number(form.total_qty) || 0;
      const trimmedIdentifiers = form.identifiers
        .slice(0, totalQty) // cut off extras if qty decreased
        .map(id => `{${id}}`);

      await axios.get(API_URL, {
        params: {
          sheet: "nc_inventory",
          action: "update",
          ...form,
          identifiers: trimmedIdentifiers.join(", "),
          statuses: form.statuses.join(","),
        },
      });

      setForm(initialFormNC);
      fetchInventory();
    } else {
      await axios.get(API_URL, {
        params: {
          sheet: "c_inventory",
          action: "update",
          ...form2,
        },
      });

      setForm2(initialFormC);
      fetchInventory();
    }

    setOpen(false);
    setEditing(false);
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
  {/* Search Bar */}
  {/* Summary Cards */}
  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
    <Inventory2Icon sx={{ fontSize: 30, color: "#B71C1C" }} />
    <Box>
      <Typography variant="caption" color="text.secondary">Total Items</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#B71C1C" }}>{inventory.length}</Typography>
    </Box>
  </Card>

  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
    <WarningAmberIcon sx={{ fontSize: 30, color: "#FF8F00" }} />
    <Box>
      <Typography variant="caption" color="text.secondary">Low Stock</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#FF8F00" }}>
        {inventory.filter(i => parseInt(i.total_qty) <= 5).length}
      </Typography>
    </Box>
  </Card>

  <Card sx={{ flex: 1, p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
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
       onClick={() => {
    setOpen(true);
    resetForm();
  }}
      sx={{
        bgcolor: "#f8a41a",
        "&:hover": { bgcolor: "#D32F2F" },
        borderRadius: 1.5,
        textTransform: "none",
        minWidth: 120,
        height: 48,
        fontSize: "0.8rem"
      }}
    >
      + Add Item
    </Button>

  <Button
  variant="contained"
  color="error"
  sx={{
    borderRadius: 1.5,
    textTransform: "none",
    minWidth: 120,
    height: 48,
    fontSize: "0.8rem",
  }}
  disabled={selectedItems.length === 0}
  onClick={async () => {
  // Get names of selected items
  const sheetName = itemType === "Non-Consumable" ? "nc_inventory" : "c_inventory";

  const names = selectedItems
    .map((num) => {
      const item =
  itemType === "Non-Consumable"
    ? inventory.find((i) => i.num === num)
    : cinventory.find((i) => i.num === num);

return item
  ? itemType === "Non-Consumable"
    ? (item as InventoryItem).equipment_name
    : (item as CInventoryItem).description
  : null;

    })
    .filter(Boolean);

  // Confirmation message with list
  if (
    !window.confirm(
      `Are you sure you want to delete the following items?\n\n${names.join(
        "\n"
      )}`
    )
  )
    return;

  try {
    await Promise.all(
      selectedItems.map((num) =>
        axios.get(API_URL, {
          params: { sheet: sheetName, action: "delete", num },
        })
      )
    );

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
<Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
     <ToggleButtonGroup
      value={itemType}
      exclusive
      fullWidth
      sx={{
        mb: 2,
        borderRadius: 2,
        overflow: "hidden", // nice rounded edges
      }}
    >
      <ToggleButton
        value="non-consumable"
        selected={itemType === "Non-Consumable"}
        onClick={() => setItemType("Non-Consumable")}
        sx={{
          flex: 1,
          height: 48,
          textTransform: "none",
          fontSize: "0.9rem",
          fontWeight: "bold",
          "&.Mui-selected": {
            bgcolor: "#d32f2f",
            color: "#fff",
            "&:hover": { bgcolor: "#d32f2f" },
          },
        }}
      >
        Non-Consumable
      </ToggleButton>

      <ToggleButton
        value="consumable"
        selected={itemType === "Consumable"}
        onClick={() => setItemType("Consumable")}
        sx={{
          flex: 1,
          height: 48,
          textTransform: "none",
          fontSize: "0.9rem",
          fontWeight: "bold",
          "&.Mui-selected": {
            bgcolor: "#d32f2f",
            color: "#fff",
            "&:hover": { bgcolor: "#b71c1c" },
          },
        }}
      >
        Consumable
      </ToggleButton>
    </ToggleButtonGroup>
  </Stack>
<Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
  <TextField
     placeholder="Search name, description, location, brand/model..."
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value);
    setPage(0); // ✅ reset to first page on new search
  }}
    variant="outlined"
    size="small"
    sx={{
      width: '100%',
      bgcolor: "#fff",
      borderRadius: 3,
      "& .MuiOutlinedInput-root": {
        borderRadius: 3,
        "& fieldset": {
      borderRadius: 3,
        },
        "&:hover fieldset": {
          borderColor: "#D32F2F",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#B71C1C",
        },
      },
    }}
  />
</Box>
  {/* Scrollable table card */}
<Card
  sx={{
    p: { xs: 1.5, sm: 3 },
    borderRadius: 3,
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

    {itemType === "Non-Consumable" ? (
      <>
        <TableCell>Name</TableCell>
        <TableCell>Location</TableCell>
        <TableCell>Brand/Model</TableCell>
        <TableCell>Quantity</TableCell>
        <TableCell>Borrowed</TableCell>
        <TableCell>Facility</TableCell>
        <TableCell align="center">Action</TableCell>
      </>
    ) : (
      <>
        <TableCell>Description</TableCell>
        <TableCell>Location</TableCell>
        <TableCell>Quantity Opened</TableCell>
         <TableCell>Quantity Unopened</TableCell>
           <TableCell>Remarks</TableCell>
        <TableCell align="center">Action</TableCell>
      </>
    )}
  </TableRow>
</TableHead>

        {itemType === "Non-Consumable" ? (
        <TableBody>
          {filteredInventory
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((item) => (
              <TableRow key={item.num}>
                <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.num)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.num]);
                      } else {
                        setSelectedItems(selectedItems.filter((id) => id !== item.num));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{item.equipment_name}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.brand_model}</TableCell>
                <TableCell align="center">{item.total_qty}</TableCell>
                <TableCell align="center">{item.borrowed}</TableCell>
                <TableCell>{item.facility}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View">
  <IconButton
    color="default"
    onClick={() => handleViewClick(item)}
   sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#484848ff", color: "#fff" },
        p: 1,
      }}
  >
    <Inventory2Icon fontSize="small" />
  </IconButton>
</Tooltip>

  <Tooltip title="Update">
    <IconButton
      color="primary"
       onClick={() => handleEditClick(item)}
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
      onClick={() => handleDelete(item)}
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
        ):(
 <TableBody>
    {filteredCInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .map((item) => (
        <TableRow key={item.num}>
          <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.num)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.num]);
                      } else {
                        setSelectedItems(selectedItems.filter((id) => id !== item.num));
                      }
                    }}
                  /></TableCell>
          <TableCell>{item.description}</TableCell>
          <TableCell>{item.location}</TableCell>
          <TableCell align="center">{item.quantity_opened}</TableCell>
          <TableCell align="center">{item.quantity_unopened}</TableCell>
          <TableCell align="center">{item.remarks}</TableCell>
                          <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View">
  <IconButton
    color="default"
    onClick={() => handleViewClick(item)}
   sx={{
        bgcolor: "#ffebee",
        "&:hover": { bgcolor: "#484848ff", color: "#fff" },
        p: 1,
      }}
  >
    <Inventory2Icon fontSize="small" />
  </IconButton>
</Tooltip>

  <Tooltip title="Update">
    <IconButton
      color="primary"
       onClick={() => handleEditClick(item)}
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
      onClick={() => handleDelete(item)}
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
        )
      }
      </Table>

      {/* Pagination */}
<TablePagination
  component="div"
  count={
    itemType === "Non-Consumable"
      ? filteredInventory.length
      : filteredCInventory.length
  } // ✅ switch count depending on type
  page={page}
  onPageChange={handleChangePage}
  rowsPerPage={rowsPerPage}
  rowsPerPageOptions={[10]} // fixed 10 per page
/>

    </Box>
  )}
</Card>

</Container>

<Dialog open={open} onClose={() => {
    setOpen(false);
    resetForm();
  }} maxWidth="lg" fullWidth>
<DialogTitle
  sx={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    color: "#B71C1C",
  }}
>
  {editing ? "Edit Item" : viewing ? "View Item" : "Add Item"}

  {/* Buttons on the same row */}
  <Box sx={{ display: "flex", gap: 1 }}>
    {viewing ? (
      <Button
        onClick={() => {
          setOpen(false);
          setViewing(false);
          resetForm();
        }}
        sx={{
          textTransform: "none",
          fontWeight: "bold",
          color: "#B71C1C",
          "&:hover": { bgcolor: "rgba(183,28,28,0.08)" },
        }}
      >
        Close
      </Button>
    ) : (
      <>
        <Button
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          sx={{
            textTransform: "none",
            fontWeight: "bold",
            color: "#B71C1C",
            "&:hover": { bgcolor: "rgba(183,28,28,0.08)" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={editing ? handleUpdateItem : handleCreate}
          sx={{
            bgcolor: "#B71C1C",
            color: "#FFF",
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: "8px",
            "&:hover": { bgcolor: "#D32F2F" },
          }}
        >
          {editing ? "Update" : "Save"}
        </Button>
      </>
    )}
  </Box>
</DialogTitle>
<DialogContent dividers>
  {itemType === "Non-Consumable" ? (// ==================================================
// NON-CONSUMABLE FORM (with Identifier Section)
// ==================================================
<Box sx={{ display: "flex", gap: 2 }}>
  {/* LEFT BOX */}
  <Box sx={{ flex: 1 }}>
    <Stack spacing={2}>
      {/* Item Type Selection */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Item Type
        </Typography>
        <ToggleButtonGroup
          value={itemType}
          exclusive
          onChange={(_, value) => value && setItemType(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Non-Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Non-Consumable
          </ToggleButton>
          <ToggleButton
            value="Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Consumable
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* === Non-Consumable Fields === */}
      <TextField
        label="Name"
        value={form.equipment_name}
        onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
      <TextField
        label="Brand/Model"
        value={form.brand_model}
        onChange={(e) => setForm({ ...form, brand_model: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />

      <Stack spacing={2} direction="row">
        <TextField
          label="Facility"
          value={form.facility}
          onChange={(e) => setForm({ ...form, facility: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Location (Room & Shelf No.)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>

      <Stack spacing={2} direction="row">
        <TextField
          label="Total Quantity"
          type="number"
          value={form.total_qty}
          onChange={(e) =>
            setForm({ ...form, total_qty: e.target.value})
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Battery Information
        </Typography>
        <ToggleButtonGroup
          value={battery}
          exclusive
          onChange={(_, value) => value && setBattery(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Without Battery"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Without Battery
          </ToggleButton>
          <ToggleButton
            value="With Battery"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            With Battery
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {battery === "With Battery" && (
        <Stack spacing={2} direction="row">
          <TextField
            label="Battery Type"
            value={form.bat_type}
            onChange={(e) => setForm({ ...form, bat_type: e.target.value })}
            fullWidth
            variant="outlined"
            sx={fieldStyle}
            disabled={viewing}
          />
          <TextField
            label="Battery Quantity"
            type="number"
            value={form.bat_qty}
            onChange={(e) => setForm({ ...form, bat_qty: e.target.value })}
            fullWidth
            variant="outlined"
            sx={fieldStyle}
            disabled={viewing}
          />
        </Stack>
      )}

      {/* Equipment Manual */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Equipment Manual
        </Typography>
        <ToggleButtonGroup
          value={form.soft_hard}
          exclusive
          onChange={(_, value) => value && setForm({ ...form, soft_hard: value })}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton value="Soft Copy" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            Soft Copy
          </ToggleButton>
          <ToggleButton value="Hard Copy" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            Hard Copy
          </ToggleButton>
          <ToggleButton value="N/A" sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}>
            None
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {form.soft_hard !== "N/A" && (
        <Stack spacing={2} direction="row">
          {viewing && form.soft_hard === "Soft Copy" ? (
            <Typography
              component="a"
              href={form.e_location}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                mt: 2,
                display: "block",
                color: "primary.main",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {form.e_location || "No link provided"}
            </Typography>
          ) : (
            <TextField
              label="Description"
              value={form.e_location}
              onChange={(e) => setForm({ ...form, e_location: e.target.value })}
              fullWidth
              variant="outlined"
              sx={fieldStyle}
              disabled={viewing}
            />
          )}
        </Stack>
      )}
    </Stack>
  </Box>

  {/* Divider between left and right */}
  <Divider orientation="vertical" flexItem />

  {/* RIGHT BOX */}
  <Box
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Stack spacing={2}>
      {/* Identifier Section */}
    <Box>
  <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
    Identifier
  </Typography>

  {/* Toggle for type */}
  <ToggleButtonGroup
    value={form.identifier_type}
    exclusive
    onChange={(_, value) => {
      if (value) {
        setForm({
          ...form,
          identifier_type: value,
          identifiers: value === "None" ? [] : form.identifiers, // clear if None
        });
      }
    }}
    fullWidth
    disabled={viewing}
  >
    <ToggleButton
      value="Control Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Control
    </ToggleButton>
    <ToggleButton
      value="Serial Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Serial
    </ToggleButton>
    <ToggleButton
      value="Inventory Number"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#B71C1C",
          color: "#FFF",
          "&:hover": { bgcolor: "#D32F2F" },
        },
      }}
    >
      Inventory
    </ToggleButton>
    <ToggleButton
      value="None"
      sx={{
        flex: 1,
        "&.Mui-selected": {
          bgcolor: "#9E9E9E",
          color: "#FFF",
          "&:hover": { bgcolor: "#757575" },
        },
      }}
    >
      None
    </ToggleButton>
  </ToggleButtonGroup>

  {/* Input fields for numbers */}
{form.identifier_type !== "None" && (
  <Stack spacing={2} sx={{ mt: 2 }}>
    {/* Header row */}
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1, fontWeight: "bold", color: "text.secondary" }}>
        {form.identifier_type || "Identifier"}
      </Box>
      <Box sx={{ width: 80, textAlign: "center", fontWeight: "bold", color: "text.secondary" }}>
        Status
      </Box>
    </Stack>

    {/* Rows */}
  {Array.from({ length: Number(form.total_qty) || 0 }).map((_, i) => (
  <Stack key={i} direction="row" spacing={1} alignItems="center">
    <TextField
      label={`${form.identifier_type || "Identifier"} ${i + 1}`}
      value={form.identifiers?.[i] || ""}
      onChange={(e) => {
        const newIdentifiers = [...(form.identifiers || [])];
        newIdentifiers[i] = e.target.value;
        setForm({ ...form, identifiers: newIdentifiers });
      }}
      fullWidth
      disabled={viewing}
      sx={fieldStyle}
    />

    {/* Square status toggle */}
    <Box
      onClick={() => {
        if (viewing) return;
        const newStatuses = [...(form.statuses || [])];
        newStatuses[i] =
          form.statuses?.[i] === "working" ? "not working" : "working";
        setForm({ ...form, statuses: newStatuses });
      }}
      sx={{
        width: 24,
        height: 24,
        borderRadius: 1,
        bgcolor: form.statuses?.[i] === "not working" ? "red" : "green",
        cursor: viewing ? "default" : "pointer",
        border: "2px solid #333",
        ml: 1,
      }}
    />

    {/* Delete button */}
    {!viewing && (
      <IconButton
        onClick={() => {
          const newIdentifiers = [...(form.identifiers || [])];
          const newStatuses = [...(form.statuses || [])];
          newIdentifiers.splice(i, 1); // remove identifier at i
          newStatuses.splice(i, 1);   // remove status at i
          setForm({
            ...form,
            identifiers: newIdentifiers,
            statuses: newStatuses,
            total_qty: newIdentifiers.length.toString(),
          });
        }}
        size="small"
        sx={{ color: "#B71C1C" }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    )}
  </Stack>
))}
  </Stack>
)}

</Box>
    </Stack>
  </Box>
</Box>
) : (
    // ==================================================
// NON-CONSUMABLE FORM (cleaned)
// ==================================================
<Box sx={{ display: "flex", gap: 2 }}>
  {/* LEFT BOX */}
  <Box sx={{ flex: 1 }}>
    <Stack spacing={2}>
      {/* Item Type Selection */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Item Type
        </Typography>
        <ToggleButtonGroup
          value={itemType}
          exclusive
          onChange={(_, value) => value && setItemType(value)}
          fullWidth
          disabled={viewing}
        >
          <ToggleButton
            value="Non-Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Non-Consumable
          </ToggleButton>
          <ToggleButton
            value="Consumable"
            sx={{
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "#B71C1C",
                color: "#FFF",
                "&:hover": { bgcolor: "#D32F2F" },
              },
            }}
          >
            Consumable
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* === Non-Consumable Fields === */}
      <TextField
        label="Description"
        value={form2.description}
        onChange={(e) => setForm2({ ...form2, description: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />

      <TextField
        label="Location"
        value={form2.location}
        onChange={(e) => setForm2({ ...form2, location: e.target.value })}
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />

      <Stack spacing={2} direction="row">
        <TextField
          label="Quantity (Opened)"
          type="number"
          value={form2.quantity_opened}
          onChange={(e) =>
            setForm2({ ...form2, quantity_opened: e.target.value })
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Quantity (Unopened)"
          type="number"
          value={form2.quantity_unopened}
          onChange={(e) =>
            setForm2({ ...form2, quantity_unopened: e.target.value })
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Quantity (On Order)" // ✅ fixed label
          type="number"
          value={form2.quantity_on_order}
          onChange={(e) =>
            setForm2({ ...form2, quantity_on_order: e.target.value})
          }
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
      </Stack>
    </Stack>
  </Box>

  {/* Divider */}
  <Divider orientation="vertical" flexItem />

  {/* RIGHT BOX */}
  <Box
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Stack spacing={2}>
      <TextField
        label="Date Issued"
        type="date"
        value={form2.date_issued}
        onChange={(e) =>
          setForm2({ ...form2, date_issued: e.target.value })
        }
        fullWidth
        disabled={viewing}
        InputLabelProps={{ shrink: true }}
        sx={fieldStyle}
      />
      <TextField
        label="Issuance No."
        value={form2.issuance_no}
        onChange={(e) =>
          setForm2({ ...form2, issuance_no: e.target.value })
        }
        fullWidth
        disabled={viewing}
        sx={fieldStyle}
      />
      <TextField
          label="Remarks"
          value={form2.remarks}
          onChange={(e) => setForm2({ ...form2, remarks: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Experiment"
          value={form2.experiment}
          onChange={(e) => setForm2({ ...form2, experiment: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
        <TextField
          label="Subject"
          value={form2.subject}
          onChange={(e) => setForm2({ ...form2, subject: e.target.value })}
          fullWidth
          disabled={viewing}
          sx={fieldStyle}
        />
    </Stack>
  </Box>
</Box>

  )}
</DialogContent>

</Dialog>



    </div>
  );
};

export default InventoryPage;
