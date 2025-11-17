// src/pages/FacultyReservationPage.tsx
import React, { useState, useCallback } from 'react';
import {
  Container,
  Card,
  Typography,
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import ScienceIcon from "@mui/icons-material/Science";
import BuildIcon from "@mui/icons-material/Build";
import axios from 'axios';

const API_BASE_URL = "https://elams-server.onrender.com/api";

interface RequestedItem {
  item_name: string;
  quantity: number;
  item_type: 'consumable' | 'non-consumable';
}

interface ReservationForm {
  subject: string;
  instructor: string;
  schedule: string;
  course: string;
  room: string;
  group_count: number;
  notes: string;
}

export default function FacultyReservationPage() {
  const theme = useTheme();
  const [reservationForm, setReservationForm] = useState<ReservationForm>({
    subject: '',
    instructor: '',
    schedule: '',
    course: '',
    room: '',
    group_count: 1,
    notes: ''
  });
  
  const [consumableItems, setConsumableItems] = useState<RequestedItem[]>([]);
  const [nonConsumableItems, setNonConsumableItems] = useState<RequestedItem[]>([]);
  const [currentConsumable, setCurrentConsumable] = useState<RequestedItem>({
    item_name: '',
    quantity: 1,
    item_type: 'consumable'
  });
  const [currentNonConsumable, setCurrentNonConsumable] = useState<RequestedItem>({
    item_name: '',
    quantity: 1,
    item_type: 'non-consumable'
  });
  const [saving, setSaving] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [reservationCode, setReservationCode] = useState('');

  const handleAddConsumable = () => {
    if (currentConsumable.item_name.trim() && currentConsumable.quantity > 0) {
      setConsumableItems(prev => [...prev, { ...currentConsumable }]);
      setCurrentConsumable({
        item_name: '',
        quantity: 1,
        item_type: 'consumable'
      });
    }
  };

  const handleAddNonConsumable = () => {
    if (currentNonConsumable.item_name.trim() && currentNonConsumable.quantity > 0) {
      setNonConsumableItems(prev => [...prev, { ...currentNonConsumable }]);
      setCurrentNonConsumable({
        item_name: '',
        quantity: 1,
        item_type: 'non-consumable'
      });
    }
  };

  const handleRemoveConsumable = (index: number) => {
    setConsumableItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNonConsumable = (index: number) => {
    setNonConsumableItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalConsumableItems = consumableItems.reduce((sum, item) => sum + (item.quantity * reservationForm.group_count), 0);
  const totalNonConsumableItems = nonConsumableItems.reduce((sum, item) => sum + (item.quantity * reservationForm.group_count), 0);
  const totalAllItems = totalConsumableItems + totalNonConsumableItems;

  const handleSubmit = async () => {
    if (!reservationForm.subject || !reservationForm.instructor || 
        !reservationForm.schedule || !reservationForm.course || 
        !reservationForm.room || (consumableItems.length === 0 && nonConsumableItems.length === 0)) {
      alert('Please fill all required fields and add at least one item');
      return;
    }

    setSaving(true);
    try {
      const allItems = [...consumableItems, ...nonConsumableItems];
      const response = await axios.post(`${API_BASE_URL}/reservations`, {
        ...reservationForm,
        requested_items: allItems
      });

      setReservationCode(response.data.reservation_code);
      setSuccessDialog(true);
      
      // Reset form
      setReservationForm({
        subject: '',
        instructor: '',
        schedule: '',
        course: '',
        room: '',
        group_count: 1,
        notes: ''
      });
      setConsumableItems([]);
      setNonConsumableItems([]);
    } catch (error) {
      console.error('Create reservation error:', error);
      alert('Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  // Create stable handler functions
  const handleConsumableNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentConsumable(prev => ({ ...prev, item_name: e.target.value }));
  }, []);

  const handleConsumableQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentConsumable(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }));
  }, []);

  const handleNonConsumableNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNonConsumable(prev => ({ ...prev, item_name: e.target.value }));
  }, []);

  const handleNonConsumableQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNonConsumable(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }));
  }, []);

  const ItemsTable = ({ items, onRemove, type }: { 
    items: RequestedItem[]; 
    onRemove: (index: number) => void;
    type: 'consumable' | 'non-consumable';
  }) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item Name</TableCell>
            <TableCell align="center">Qty per Group</TableCell>
            <TableCell align="center">Total Qty ({reservationForm.group_count} groups)</TableCell>
            <TableCell align="center">Type</TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography fontWeight="medium">{item.item_name}</Typography>
              </TableCell>
              <TableCell align="center">
                <Chip label={item.quantity} color="primary" size="small" />
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={item.quantity * reservationForm.group_count} 
                  color="secondary" 
                  size="small" 
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={type === 'consumable' ? 'Consumable' : 'Non-Consumable'} 
                  color={type === 'consumable' ? 'success' : 'info'} 
                  size="small" 
                  variant="filled"
                />
              </TableCell>
              <TableCell align="center">
                <IconButton
                  color="error"
                  onClick={() => onRemove(index)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" color="#b91c1c" gutterBottom>
            Faculty Reservation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Reserve equipment for your classes
          </Typography>
        </Box>

        <Stack spacing={3}>
          {/* Class Information */}
          <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Typography variant="h6" gutterBottom color="primary">
              Class Information
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Subject *"
                  value={reservationForm.subject}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, subject: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Course *"
                  value={reservationForm.course}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, course: e.target.value }))}
                  fullWidth
                />
              </Stack>
              
              <TextField
                label="Instructor *"
                value={reservationForm.instructor}
                onChange={(e) => setReservationForm(prev => ({ ...prev, instructor: e.target.value }))}
                fullWidth
              />
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Schedule *"
                  value={reservationForm.schedule}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, schedule: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Room *"
                  value={reservationForm.room}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, room: e.target.value }))}
                  fullWidth
                />
              </Stack>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Number of Groups"
                  type="number"
                  value={reservationForm.group_count}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, group_count: parseInt(e.target.value) || 1 }))}
                  sx={{ flex: 1 }}
                  inputProps={{ min: 1 }}
                />
                <Box sx={{ flex: 1 }} />
              </Stack>
              
              <TextField
                label="Additional Notes (Optional)"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                placeholder="Any additional information about your reservation"
              />
            </Stack>
          </Paper>

          {/* Requested Items - Two Sections */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {/* Consumable Items */}
            <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.success.main, 0.04), flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="success" />
                  <Typography variant="h6" color="success.main">
                    Consumable Items
                  </Typography>
                </Box>
                <Chip 
                  label={`Total: ${totalConsumableItems}`} 
                  color="success" 
                  variant="filled"
                />
              </Box>
              
              {/* Consumable Item Form */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Item Name *"
                    value={currentConsumable.item_name}
                    onChange={handleConsumableNameChange}
                    fullWidth
                    placeholder="e.g., Resistors, Capacitors, Wires"
                  />
                  <TextField
                    label="Qty per Group *"
                    type="number"
                    value={currentConsumable.quantity}
                    onChange={handleConsumableQuantityChange}
                    sx={{ minWidth: 140 }}
                    inputProps={{ min: 1 }}
                  />
                </Stack>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddConsumable}
                  variant="outlined"
                  disabled={!currentConsumable.item_name.trim() || currentConsumable.quantity < 1}
                >
                  Add Consumable Item
                </Button>
              </Stack>

              {consumableItems.length > 0 ? (
                <ItemsTable 
                  items={consumableItems} 
                  onRemove={handleRemoveConsumable} 
                  type="consumable"
                />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No consumable items added yet.
                </Typography>
              )}
            </Paper>

            {/* Non-Consumable Items */}
            <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.info.main, 0.04), flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BuildIcon color="info" />
                  <Typography variant="h6" color="info.main">
                    Non-Consumable Items
                  </Typography>
                </Box>
                <Chip 
                  label={`Total: ${totalNonConsumableItems}`} 
                  color="info" 
                  variant="filled"
                />
              </Box>
              
              {/* Non-Consumable Item Form */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Item Name *"
                    value={currentNonConsumable.item_name}
                    onChange={handleNonConsumableNameChange}
                    fullWidth
                    placeholder="e.g., Multimeter, Oscilloscope, Power Supply"
                  />
                  <TextField
                    label="Qty per Group *"
                    type="number"
                    value={currentNonConsumable.quantity}
                    onChange={handleNonConsumableQuantityChange}
                    sx={{ minWidth: 140 }}
                    inputProps={{ min: 1 }}
                  />
                </Stack>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddNonConsumable}
                  variant="outlined"
                  disabled={!currentNonConsumable.item_name.trim() || currentNonConsumable.quantity < 1}
                >
                  Add Non-Consumable Item
                </Button>
              </Stack>

              {nonConsumableItems.length > 0 ? (
                <ItemsTable 
                  items={nonConsumableItems} 
                  onRemove={handleRemoveNonConsumable} 
                  type="non-consumable"
                />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No non-consumable items added yet.
                </Typography>
              )}
            </Paper>
          </Stack>

          {/* Summary and Submit */}
          <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="warning.main">
                Reservation Summary
              </Typography>
              <Chip 
                label={`Grand Total: ${totalAllItems} items`} 
                color="warning" 
                variant="filled"
                sx={{ fontSize: '1rem', py: 1 }}
              />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  Consumable Items: <strong>{totalConsumableItems}</strong> total items
                </Typography>
                <Typography variant="body2">
                  Non-Consumable Items: <strong>{totalNonConsumableItems}</strong> total items
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  Number of Groups: <strong>{reservationForm.group_count}</strong>
                </Typography>
                <Typography variant="body2">
                  Total Items Needed: <strong>{totalAllItems}</strong>
                </Typography>
              </Box>
            </Stack>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={saving || (consumableItems.length === 0 && nonConsumableItems.length === 0)}
                sx={{
                  bgcolor: "#b91c1c",
                  "&:hover": { bgcolor: "#b91c1c.dark" },
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                {saving ? 'Submitting...' : 'Submit Reservation'}
              </Button>
            </Box>
          </Paper>
        </Stack>
      </Card>

      {/* Success Dialog */}
      <Dialog open={successDialog} onClose={() => setSuccessDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon color="success" />
            <Typography variant="h6">Reservation Created Successfully!</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Your reservation has been submitted successfully. Please save your reservation code:
          </Typography>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Chip 
              label={reservationCode} 
              color="primary" 
              variant="filled"
              sx={{ fontSize: '1.2rem', py: 2, px: 3 }}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Reservation Summary:
            </Typography>
            <Typography variant="body2">
              • Consumable Items: {totalConsumableItems} total
            </Typography>
            <Typography variant="body2">
              • Non-Consumable Items: {totalNonConsumableItems} total
            </Typography>
            <Typography variant="body2">
              • Groups: {reservationForm.group_count}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Student assistants will assign actual equipment items to your reservation. 
            You can use this code to track your reservation status.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialog(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}