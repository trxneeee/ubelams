// src/pages/ReservationPage.tsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Container,
  Card,
  Typography,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
  Backdrop,
  CircularProgress,
  Badge
} from '@mui/material';
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SearchIcon from "@mui/icons-material/Search";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';
import { alpha, useTheme } from '@mui/material/styles';

const API_BASE_URL = "http://localhost:5000/api";

interface RequestedItem {
  item_name: string;
  quantity: number;
  item_type: 'consumable' | 'non-consumable';
}

interface AssignedItem {
  requested_item_index: number;
  item_id: string;
  item_name: string;
  item_type: 'consumable' | 'non-consumable';
  quantity: number;
}

interface Reservation {
  _id: string;
  reservation_code: string;
  subject: string;
  instructor: string;
  instructor_email: string;
  course: string;
  room: string;
  schedule: string;
  startTime?: string;
  endTime?: string;
  group_count: number;
  needsItems: boolean;
  requested_items: RequestedItem[];
  assigned_items: AssignedItem[];
  status: string;
  date_created?: string;
  date_approved?: string;
  date_assigned?: string;
  notes?: string;
  messages?: Array<{ sender: string; message: string; timestamp: string }>;
  edits?: any[]; // optional edit history stored by server
}

interface InventoryItem {
  _id?: string;
  num: string;
  equipment_name: string;
  available: number;
  identifiers?: string[];
  is_consumable?: boolean;
}

export default function ReservationPage() {
  const theme = useTheme();
  const brandRed = "#b91c1c";
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<AssignedItem[]>([]);
  const [search, setSearch] = useState('');
  const [itemSearch, setItemSearch] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReservationDetails, setSelectedReservationDetails] = useState<Reservation | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedReservationForChat, setSelectedReservationForChat] = useState<Reservation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatRefreshInterval, setChatRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // ref for messages container to auto-scroll
  const messageListRef = useRef<HTMLDivElement | null>(null);
  // anchor for last message
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const COMPOSER_HEIGHT = 96;

  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
      }
      if (messageListRef.current) {
        setTimeout(() => {
          messageListRef.current!.scrollTop = messageListRef.current!.scrollHeight;
        }, 50);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchReservations();
    fetchInventory();
  }, []);

  useLayoutEffect(() => {
    if (messageDialogOpen && selectedReservationForChat) {
      scrollToBottom();
    }
  }, [messageDialogOpen, selectedReservationForChat?.messages?.length]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/reservations`);
      setReservations(response.data);
    } catch (error) {
      console.error('Fetch reservations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory`);
      setInventory(response.data);
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };

  const handleAssign = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    
    const initialAssignment = reservation.requested_items.map((item, index) => ({
      requested_item_index: index,
      item_id: '',
      item_name: item.item_name,
      item_type: item.item_type,
      quantity: item.quantity
    }));
    
    setAssignmentData(initialAssignment);
    setItemSearch({});
    setAssignDialogOpen(true);
  };

  const handleView = (reservation: Reservation) => {
    setSelectedReservationDetails(reservation);
    setViewDialogOpen(true);
  };

  const handleItemAssignment = (index: number, itemId: string) => {
    const selectedItem = inventory.find(item => item.num === itemId);
    if (selectedItem) {
      setAssignmentData(prev => 
        prev.map((item, i) => 
          i === index ? { 
            ...item, 
            item_id: itemId,
            item_name: selectedItem.equipment_name,
            item_type: selectedItem.is_consumable ? 'consumable' : 'non-consumable'
          } : item
        )
      );
    }
  };

  const handleItemSearchChange = (index: number, searchTerm: string) => {
    setItemSearch(prev => ({
      ...prev,
      [index]: searchTerm
    }));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedReservation) return;

    if (assignmentData.some(item => !item.item_id)) {
      alert('Please assign all items before submitting');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API_BASE_URL}/reservations/${selectedReservation._id}/assign`, {
        assigned_items: assignmentData,
        assigned_by: JSON.parse(localStorage.getItem('user') || '{}').email || 'Unknown'
      });
      
      await fetchReservations();
      setAssignDialogOpen(false);
      setSelectedReservation(null);
      setItemSearch({});
    } catch (error) {
      console.error('Assign reservation error:', error);
      alert('Failed to assign items');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveReservation = async (reservation: Reservation) => {
    if (reservation.status !== 'Pending') {
      alert('Only Pending reservations can be approved');
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API_BASE_URL}/reservations/${reservation._id}/approve`, {
        approved_by: JSON.parse(localStorage.getItem('user') || '{}').email || 'Unknown'
      });
      
      await fetchReservations();
      alert('Reservation approved successfully');
    } catch (error) {
      console.error('Approve reservation error:', error);
      alert('Failed to approve reservation');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectReservation = async (reservation: Reservation) => {
    const reason = window.prompt('Enter rejection reason (optional):', '');
    if (reason === null) return; // cancelled
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post(`${API_BASE_URL}/reservations/${reservation._id}/reject`, {
        reason,
        rejected_by: user.email || user.name || 'Unknown',
        rejected_name: user.name || user.firstname || user.email
      });
      await fetchReservations();
      alert('Reservation rejected');
    } catch (err) {
      console.error('Reject error', err);
      alert('Failed to reject reservation');
    }
  };

  // helper: count unseen messages for current user
  const unseenCount = (reservation: Reservation) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const email = (user && (user.email || user.name)) || '';
      if (!email) return 0;
      return (reservation.messages || []).filter(m => !(m as any).seen_by || !(m as any).seen_by.includes(email)).length;
    } catch (e) {
      return 0;
    }
  };

  const handleOpenChat = async (reservation: Reservation) => {
    setSelectedReservationForChat(reservation);
    setMessageDialogOpen(true);
    setMessageText('');

    // mark messages seen and fetch updated reservation
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || user.name || 'Unknown';
      await axios.post(`${API_BASE_URL}/reservations/${reservation._id}/messages-seen`, {
        user_email: userEmail
      });
      const resp = await axios.get(`${API_BASE_URL}/reservations/${reservation._id}`);
      const updatedRes = resp.data as Reservation;

      // update states (replace or append)
      setSelectedReservationForChat(updatedRes);
      setReservations(prev => {
        const exists = prev.some(r => r._id === updatedRes._id);
        return exists ? prev.map(r => r._id === updatedRes._id ? updatedRes : r) : [updatedRes, ...prev];
      });

      // ensure scroll after DOM update
      setTimeout(() => {
        try { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch(e){}
      }, 50);
    } catch (err) {
      console.error('Mark messages seen error:', err);
    }
  
    // start polling (or SSE if you later switch)
    startChatPolling(reservation._id);
  };

  const handleSendMessage = async () => {
    if (!selectedReservationForChat || !messageText.trim()) return;

    setSendingMessage(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userIdentifier = currentUser.email || currentUser.name || 'Unknown';
      const userName = currentUser.name || userIdentifier;

      const resp = await axios.post(`${API_BASE_URL}/reservations/${selectedReservationForChat._id}/message`, {
        sender: userIdentifier,
        sender_name: userName,
        message: messageText
      });

      const updated = resp.data as Reservation;

      // mark seen (best-effort)
      try {
        await axios.post(`${API_BASE_URL}/reservations/${selectedReservationForChat._id}/messages-seen`, {
          user_email: userIdentifier
        });
      } catch (e) {}

      // update local state immediately
      setSelectedReservationForChat(updated);

      // ensure polling continues
      startChatPolling(updated._id);

      setMessageText('');
      setTimeout(() => {
        try { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch(e){}
      }, 50);
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Polling helpers for real-time updates
  const startChatPolling = (reservationId: string) => {
    stopChatPolling();
    const interval = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/reservations/${reservationId}`);
        const updated = resp.data as Reservation;
        setReservations(prev => prev.map(r => r._id === updated._id ? updated : r));
        setSelectedReservationForChat(prev => prev && prev._id === updated._id ? updated : prev);
      } catch (err) {
        console.error('Chat polling error:', err);
      }
    }, 1000); // faster polling
    setChatRefreshInterval(interval as unknown as NodeJS.Timeout);
  };

  const stopChatPolling = () => {
    if (chatRefreshInterval) {
      clearInterval(chatRefreshInterval as unknown as any);
      setChatRefreshInterval(null);
    }
  };

  const handleDeleteReservation = async (reservation: Reservation) => {
    if (!window.confirm(`Are you sure you want to delete reservation ${reservation.reservation_code}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/reservations/${reservation._id}`);
      await fetchReservations();
    } catch (error) {
      console.error('Delete reservation error:', error);
      alert('Failed to delete reservation');
    }
  };

  // Filter then sort by date_created descending (newest first)
  const filteredReservations = reservations
    .filter(reservation => {
      const matchesSearch = 
        reservation.reservation_code.toLowerCase().includes(search.toLowerCase()) ||
        reservation.subject.toLowerCase().includes(search.toLowerCase()) ||
        reservation.instructor.toLowerCase().includes(search.toLowerCase()) ||
        reservation.course.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'All' || reservation.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const da = a.date_created ? new Date(a.date_created).getTime() : 0;
      const db = b.date_created ? new Date(b.date_created).getTime() : 0;
      return db - da; // descending
    });

  const getAvailableItems = (requestedType: 'consumable' | 'non-consumable', searchTerm: string = '') => {
    return inventory
      .filter(item => {
        const matchesType = requestedType === 'consumable' ? item.is_consumable : !item.is_consumable;
        const hasAvailability = item.available > 0;
        
        if (searchTerm.trim()) {
          const matchesSearch = item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesType && hasAvailability && matchesSearch;
        }
        
        return matchesType && hasAvailability;
      })
      .sort((a, b) => a.equipment_name.localeCompare(b.equipment_name));
  };

  const calculateTotalQuantityNeeded = (quantityPerGroup: number, groupCount: number) => {
    return quantityPerGroup * groupCount;
  };

  const getAvailabilityInfo = (inventoryItem: InventoryItem, quantityPerGroup: number, groupCount: number) => {
    const totalNeeded = calculateTotalQuantityNeeded(quantityPerGroup, groupCount);
    const hasEnough = inventoryItem.available >= totalNeeded;
    
    return {
      hasEnough,
      totalNeeded,
      available: inventoryItem.available,
      message: hasEnough 
        ? `✓ Enough stock (${inventoryItem.available} available, ${totalNeeded} needed)`
        : `⚠ Insufficient stock (${inventoryItem.available} available, ${totalNeeded} needed)`
    };
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusCount = (status: string) => {
    return reservations.filter(r => r.status === status).length;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={processing}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={60} thickness={4} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Processing...
          </Typography>
        </Stack>
      </Backdrop>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color={brandRed} gutterBottom>
          Reservation Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and assign equipment to faculty reservations
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} mb={4}>
        <Card sx={{ 
          flex: 1, 
          p: 3, 
          borderRadius: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          background: `linear-gradient(135deg, rgba(185,28,28,0.1) 0%, rgba(185,28,28,0.2) 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: "rgba(185,28,28,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 30, color: brandRed }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              Total Reservations
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: brandRed }}>
              {reservations.length}
            </Typography>
          </Box>
        </Card>

        <Card sx={{ 
          flex: 1, 
          p: 3, 
          borderRadius: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.2)} 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <WarningIcon sx={{ fontSize: 30, color: theme.palette.warning.main }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              Pending
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.warning.main }}>
              {getStatusCount('Pending')}
            </Typography>
          </Box>
        </Card>

        <Card sx={{ 
          flex: 1, 
          p: 3, 
          borderRadius: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.2)} 100%)`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: "50%", 
            bgcolor: alpha(theme.palette.success.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CheckCircleIcon sx={{ fontSize: 30, color: theme.palette.success.main }} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              Assigned
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.success.main }}>
              {getStatusCount('Assigned')}
            </Typography>
          </Box>
        </Card>
      </Stack>

      {/* Action Bar */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} justifyContent="space-between" alignItems="center">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <Box sx={{ maxWidth: 400, width: "100%" }}>
            <TextField
              placeholder="Search by code, subject, instructor, or course..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  "& fieldset": {
                    borderRadius: 3,
                  },
                  "&:hover fieldset": {
                    borderColor: "primary.main",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.main",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <TextField
            select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Assigned">Assigned</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {/* Reservations Table */}
      <Card
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <CircularProgress />
          </Box>
        ) : filteredReservations.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Typography variant="body2" color="text.secondary">
              No reservations found.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600, borderRadius: 2 }}>
              <Table stickyHeader sx={{ minWidth: 950 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Reservation Code</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Subject</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Instructor</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Course</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Groups</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Requested Items</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Date Created</TableCell>
                    <TableCell align="center" sx={{ bgcolor: "grey.50", fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReservations
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((reservation) => (
                      <TableRow key={reservation._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Typography fontWeight="bold" sx={{ color: brandRed }}>
                            {reservation.reservation_code}
                          </Typography>
                        </TableCell>
                        <TableCell>{reservation.subject}</TableCell>
                        <TableCell>{reservation.instructor}</TableCell>
                        <TableCell>{reservation.course}</TableCell>
                        <TableCell>
                          <Chip
                            label={reservation.group_count}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: brandRed,
                              color: brandRed,
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            {reservation.requested_items.map((item, index) => {
                              const totalNeeded = calculateTotalQuantityNeeded(item.quantity, reservation.group_count);
                              return (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {item.item_name} 
                                  </Typography>
                                  <Chip
                                    label={`${item.quantity} × ${reservation.group_count} = ${totalNeeded}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderColor: brandRed, color: brandRed }}
                                  />
                                  <Chip
                                    label={item.item_type}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: item.item_type === 'consumable' ? theme.palette.success.main : brandRed,
                                      color: item.item_type === 'consumable' ? theme.palette.success.main : brandRed
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={reservation.status}
                            size="small"
                            sx={{
                              bgcolor: reservation.status === 'Rejected' ? alpha(theme.palette.error.main, 0.08) :
                                      reservation.status === 'Pending' ? alpha(theme.palette.warning.main, 0.08) :
                                      alpha(theme.palette.success.main, 0.08),
                              color: reservation.status === 'Rejected' ? theme.palette.error.main :
                                     reservation.status === 'Pending' ? theme.palette.warning.main :
                                     theme.palette.success.main,
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {reservation.date_created ? new Date(reservation.date_created).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="View Details">
                              <IconButton
                                color="default"
                                onClick={() => handleView(reservation)}
                                sx={{
                                  bgcolor: "#ffebee",
                                  "&:hover": { bgcolor: "#484848ff", color: "#fff" },
                                  p: 1,
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {reservation.status === 'Pending' && (
                              <Tooltip title="Approve Reservation">
                                <IconButton
                                  color="success"
                                  onClick={() => handleApproveReservation(reservation)}
                                  sx={{
                                    bgcolor: "#e8f5e9",
                                    "&:hover": { bgcolor: "#81c784" },
                                    p: 1,
                                  }}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {/* Reject */}
                            {reservation.status !== 'Rejected' && (
                              <Tooltip title="Reject">
                                <IconButton
                                  color="warning"
                                  onClick={() => handleRejectReservation(reservation)}
                                  sx={{
                                    bgcolor: "#fff6e6",
                                    "&:hover": { bgcolor: "#ffcc80" },
                                    p: 1,
                                  }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title="Assign Items">
                              <IconButton
                                color="primary"
                                onClick={() => handleAssign(reservation)}
                                disabled={reservation.status !== 'Approved'}
                                sx={{
                                  bgcolor: "#e3f2fd",
                                  "&:hover": { bgcolor: reservation.status === 'Approved' ? "#90caf9" : "inherit" },
                                  p: 1,
                                }}
                              >
                                <AssignmentTurnedInIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Messages">
                              <IconButton
                                color="info"
                                onClick={() => handleOpenChat(reservation)}
                                sx={{
                                  bgcolor: "#e0f2f1",
                                  "&:hover": { bgcolor: "#4db6ac" },
                                  p: 1,
                                }}
                              >
                                <Badge
                                  badgeContent={unseenCount(reservation)}
                                  color="error"
                                  invisible={unseenCount(reservation) === 0}
                                >
                                  <ChatBubbleIcon fontSize="small" />
                                </Badge>
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete">
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteReservation(reservation)}
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
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredReservations.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          </>
        )}
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2Icon sx={{ color: brandRed }} />
            <Typography variant="h6" sx={{ color: brandRed }}>Assign Inventory Items</Typography>
          </Box>
          {selectedReservation && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Reservation: {selectedReservation.reservation_code} - {selectedReservation.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Groups: {selectedReservation.group_count} • Course: {selectedReservation.course}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {assignmentData.map((item, index) => {
              const requestedItem = selectedReservation?.requested_items[item.requested_item_index];
              const searchTerm = itemSearch[index] || '';
              const availableItems = getAvailableItems(requestedItem?.item_type || 'non-consumable', searchTerm);
              const totalNeeded = selectedReservation ? 
                calculateTotalQuantityNeeded(requestedItem?.quantity || 0, selectedReservation.group_count) : 0;
              
              return (
                <Paper key={index} sx={{ 
                  p: 2,
                  borderRadius: 2,
                  background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(brandRed, 0.01)} 100%)`,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.04)"
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {requestedItem?.item_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={`${requestedItem?.quantity} per group × ${selectedReservation?.group_count} groups = ${totalNeeded} total`}
                          size="small"
                          sx={{ borderColor: brandRed, color: brandRed }}
                        />
                        <Chip
                          label={requestedItem?.item_type}
                          size="small"
                          sx={{
                            borderColor: requestedItem?.item_type === 'consumable' ? theme.palette.success.main : brandRed,
                            color: requestedItem?.item_type === 'consumable' ? theme.palette.success.main : brandRed
                          }}
                        />
                      </Box>
                    </Box>
                    {item.item_id && (
                      <Chip 
                        label="Assigned"
                        size="small"
                        variant="filled"
                        sx={{ bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main }}
                      />
                    )}
                  </Box>
                  
                  <Stack spacing={2}>
                    <TextField
                      placeholder={`Search ${requestedItem?.item_type} items...`}
                      value={searchTerm}
                      onChange={(e) => handleItemSearchChange(index, e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                      }}
                    />
                    
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Inventory Item</InputLabel>
                      <Select
                        value={item.item_id}
                        label="Select Inventory Item"
                        onChange={(e) => handleItemAssignment(index, e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Not assigned</em>
                        </MenuItem>
                        {availableItems.length === 0 ? (
                          <MenuItem disabled>
                            No {requestedItem?.item_type} items found
                            {searchTerm && ` matching "${searchTerm}"`}
                          </MenuItem>
                        ) : (
                          availableItems.map(invItem => {
                            const availabilityInfo = getAvailabilityInfo(
                              invItem, 
                              requestedItem?.quantity || 0, 
                              selectedReservation?.group_count || 1
                            );
                            
                            return (
                              <MenuItem key={invItem.num} value={invItem.num} disabled={!availabilityInfo.hasEnough}>
                                <Box sx={{ width: '100%' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="medium">
                                      {invItem.equipment_name}
                                    </Typography>
                                    {availabilityInfo.hasEnough ? (
                                      <CheckCircleIcon color="success" fontSize="small" />
                                    ) : (
                                      <WarningIcon color="warning" fontSize="small" />
                                    )}
                                  </Box>
                                  <Typography 
                                    variant="caption" 
                                    color={availabilityInfo.hasEnough ? "success.main" : "warning.main"}
                                    sx={{ display: 'block' }}
                                  >
                                    {availabilityInfo.message}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Type: {invItem.is_consumable ? 'Consumable' : 'Non-Consumable'}
                                    {invItem.identifiers && invItem.identifiers.length > 0 && ` • ${invItem.identifiers.length} identifiers`}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            );
                          })
                        )}
                      </Select>
                    </FormControl>
                  </Stack>
                  
                  {item.item_id && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      ✓ Assigned: {item.item_name}
                    </Typography>
                  )}
                  
                  {availableItems.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Found {availableItems.length} {requestedItem?.item_type} item(s)
                      {searchTerm && ` matching "${searchTerm}"`}
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitAssignment}
            disabled={assignmentData.some(item => !item.item_id)}
            sx={{
              bgcolor: brandRed,
              color: '#fff',
              textTransform: 'none',
              "&:hover": { bgcolor: "#9f1515" }
            }}
          >
            Confirm Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon sx={{ color: brandRed }} />
            <Typography variant="h6" sx={{ color: brandRed }}>Reservation Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReservationDetails && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Code:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.reservation_code}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Subject:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.subject}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Instructor:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.instructor}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Email:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.instructor_email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Course:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.course}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Room:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.room}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Groups:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.group_count}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Schedule:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.schedule}</Typography>
                  </Box>
                  {selectedReservationDetails.startTime && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Start Time:</Typography>
                      <Typography variant="body2">{selectedReservationDetails.startTime}</Typography>
                    </Box>
                  )}
                  {selectedReservationDetails.endTime && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>End Time:</Typography>
                      <Typography variant="body2">{selectedReservationDetails.endTime}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Items Needed:</Typography>
                    <Typography variant="body2">{selectedReservationDetails.needsItems ? '✓ Yes' : '○ No'}</Typography>
                  </Box>
                  {selectedReservationDetails.notes && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Notes:</Typography>
                      <Typography variant="body2">{selectedReservationDetails.notes}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 'bold' }}>Status:</Typography>
                    <Chip
                      label={selectedReservationDetails.status}
                      size="small"
                      sx={{
                        bgcolor: selectedReservationDetails.status === 'Rejected' ? alpha(theme.palette.error.main, 0.08) :
                                selectedReservationDetails.status === 'Pending' ? alpha(theme.palette.warning.main, 0.08) :
                                alpha(theme.palette.success.main, 0.08),
                        color: selectedReservationDetails.status === 'Rejected' ? theme.palette.error.main :
                               selectedReservationDetails.status === 'Pending' ? theme.palette.warning.main :
                               theme.palette.success.main,
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Requested Items
                </Typography>
                <Stack spacing={2}>
                  {selectedReservationDetails.requested_items.map((item, index) => {
                    const totalNeeded = calculateTotalQuantityNeeded(item.quantity, selectedReservationDetails.group_count);
                    const assignedItem = selectedReservationDetails.assigned_items?.find(ai => ai.requested_item_index === index);
                    
                    return (
                      <Paper key={index} sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {item.item_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={`${item.quantity} per group × ${selectedReservationDetails.group_count} groups = ${totalNeeded} total`}
                                size="small"
                                sx={{ borderColor: brandRed, color: brandRed }}
                              />
                              <Chip
                                label={item.item_type}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: item.item_type === 'consumable' ? theme.palette.success.main : brandRed,
                                  color: item.item_type === 'consumable' ? theme.palette.success.main : brandRed
                                }}
                              />
                            </Box>
                          </Box>
                          {assignedItem && (
                            <Chip 
                              label="Assigned"
                              size="small"
                              variant="filled"
                              sx={{ bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main }}
                            />
                          )}
                        </Box>
                        {assignedItem && (
                          <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                            ✓ Assigned: {assignedItem.item_name} (ID: {assignedItem.item_id})
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>

              {selectedReservationDetails.messages && selectedReservationDetails.messages.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Communication History
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), maxHeight: 300, overflowY: 'auto' }}>
                    <Stack spacing={1.5}>
                      {selectedReservationDetails.messages.map((msg, index) => (
                        <Box key={index} sx={{ pb: 1.5, borderBottom: index < selectedReservationDetails.messages!.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.5)}` : 'none' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: theme.palette.primary.main }}>
                              {msg.sender}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(msg.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Box>
              )}

              {/* Edit History - new section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Edit History</Typography>
                {selectedReservationDetails.edits && selectedReservationDetails.edits.length > 0 ? (
                  selectedReservationDetails.edits.map((log, i) => (
                    <Paper key={i} sx={{ p: 2, mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{log.editedName || log.editedBy} • {new Date(log.editedAt).toLocaleString()}</Typography>
                      {log.reason && <Typography variant="caption" color="text.secondary">Reason: {log.reason}</Typography>}
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: 'pointer' }}>View previous snapshot</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(log.previous, null, 2)}</pre>
                      </details>
                    </Paper>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No edits recorded.</Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Message Chat Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => { setMessageDialogOpen(false); stopChatPolling(); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatBubbleIcon sx={{ color: theme.palette.info.main }} />
            <Box>
              <Typography variant="h6" sx={{ color: theme.palette.info.main }}>
                Reservation Chat
              </Typography>
              {selectedReservationForChat && (
                <Typography variant="caption" color="text.secondary">
                  {selectedReservationForChat.reservation_code} - {selectedReservationForChat.subject}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedReservationForChat && (
            <Box sx={{ position: 'relative', minHeight: 400 }}>
              <Paper ref={messageListRef} sx={{
                p: 2,
                bgcolor: alpha(theme.palette.info.main, 0.04),
                overflowY: 'auto',
                maxHeight: 520,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                pb: `${COMPOSER_HEIGHT + 16}px`
              }}>
                {selectedReservationForChat.messages && selectedReservationForChat.messages.length > 0 ? (
                  selectedReservationForChat.messages.map((msg, index) => {
                    const isCurrentUser = msg.sender === JSON.parse(localStorage.getItem('user') || '{}').email;
                    return (
                      <Box key={index} sx={{ display: 'flex', justifyContent: isCurrentUser ? 'flex-end' : 'flex-start' }}>
                        <Paper sx={{ p: 1.5, maxWidth: '70%', bgcolor: isCurrentUser ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.grey[300], 0.5), borderRadius: 2, boxShadow: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ color: isCurrentUser ? theme.palette.primary.main : theme.palette.text.primary }}>{(msg as any).sender_name || msg.sender}</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{msg.message}</Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                        </Paper>
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                    <Typography variant="body2" color="textSecondary">No messages yet. Start the conversation!</Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Paper>

              {/* removed inline composer here - moved to DialogActions */}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, py: 2 }}>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 3, boxShadow: 3, width: { xs: '100%', sm: 520 } }}>
              <TextField placeholder="Type a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) { e.preventDefault(); handleSendMessage(); } }} multiline maxRows={4} fullWidth size="small" disabled={sendingMessage} />
              <Button variant="contained" color="info" onClick={handleSendMessage} disabled={!messageText.trim() || sendingMessage} sx={{ borderRadius: 2, minWidth: 48, minHeight: 48 }}><SendIcon /></Button>
            </Paper>
          </Box>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setMessageDialogOpen(false); stopChatPolling(); }} sx={{ textTransform: 'none' }}>Close</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Container>
  );
}