import { useEffect, useState } from "react";
import { 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Paper,
  Chip,
  CircularProgress
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Inventory2 as InventoryIcon,
  AssignmentTurnedIn as BorrowIcon,
  Build as MaintenanceIcon,
  People as StaffIcon,
  Warning as WarningIcon,
  EventAvailable as EventIcon
} from "@mui/icons-material";
import axios from "axios";
import { alpha, useTheme } from "@mui/material/styles";

const API_BASE_URL = "https://elams-server.onrender.com/api";

interface User {
  email: string;
  role: string;
  given_name: string;
  family_name: string;
  password: string;
}

interface DashboardStats {
  totalItems: number;
  borrowedItems: number;
  lowStockItems: number;
  pendingMaintenance: number;
  completedMaintenance: number;
  totalStaff: number;
  recentActivity: Array<{
    type: string;
    description: string;
    time: string;
  }>;
}

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    borrowedItems: 0,
    lowStockItems: 0,
    pendingMaintenance: 0,
    completedMaintenance: 0,
    totalStaff: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/");
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchDashboardStats(parsed);
    }
  }, [navigate]);

  const fetchDashboardStats = async (currentUser: any = JSON.parse(localStorage.getItem("user") || "{}")) => {
    try {
      // Get combined inventory (both consumable and non-consumable)
      const [inventoryRes, borrowRes, maintenanceRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/inventory`),
        axios.get(`${API_BASE_URL}/borrow-records`),
        axios.post(`${API_BASE_URL}/maintenance`, { action: "read" }),
        axios.post(`${API_BASE_URL}/users`, { action: "read" })
      ]);

      const combinedInventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
      const borrowRecords = Array.isArray(borrowRes.data) ? borrowRes.data : [];
      const maintenanceRecords = Array.isArray(maintenanceRes.data && maintenanceRes.data.data ? maintenanceRes.data.data : maintenanceRes.data) ? (maintenanceRes.data.data || maintenanceRes.data) : [];
      const users = Array.isArray(usersRes.data && usersRes.data.data ? usersRes.data.data : usersRes.data) ? (usersRes.data.data || usersRes.data) : [];
      
      // total items: sum total_qty for all items
      const totalItems = combinedInventory.reduce((acc: number, item: any) => {
        return acc + (Number(item.total_qty || 0));
      }, 0);
      
      // borrowed items: sum of quantities in borrow records
      const borrowedItems = borrowRecords.reduce((acc: number, record: any) => {
        return acc + (Array.isArray(record.items) ? record.items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0);
      }, 0);
      
      // Get consumable inventory (via c-inventory) to compute low stock
      let lowStockItems = 0;
      try {
        const cInvRes = await axios.post(`${API_BASE_URL}/c-inventory`, { action: "read" });
        const cData = cInvRes.data && cInvRes.data.data ? cInvRes.data.data : cInvRes.data;
        lowStockItems = Array.isArray(cData) ? cData.filter((row: any) => {
          const qtyOpened = Number(row.quantity_opened || 0);
          const stockAlert = Number(row.stock_alert || 5);
          return qtyOpened <= stockAlert;
        }).length : 0;
      } catch (err) {
        // ignore and keep 0
        console.warn("Failed to fetch consumable inventory for low stock", err);
      }
      
      // maintenance stats
      const currentYear = new Date().getFullYear();
      const completedMaintenance = Array.isArray(maintenanceRecords) ? maintenanceRecords.filter((m: any) => {
        const d = m.date_accomplished || m.dateAccomplished || m.dateAccomplished;
        if (!d) return false;
        const date = new Date(d);
        return date.getFullYear() === currentYear;
      }).length : 0;
      const pendingMaintenance = (Array.isArray(maintenanceRecords) ? maintenanceRecords.length : 0) - completedMaintenance;
      
      // staff count excluding current user
      const totalStaff = Array.isArray(users) ? users.filter((u: any) => u.email !== currentUser.email).length : 0;
      
      const recentActivity = [
        { type: "borrow", description: `${borrowRecords.length} active borrow requests`, time: "Today" },
        { type: "maintenance", description: `${pendingMaintenance} pending maintenance tasks`, time: "This week" },
        { type: "inventory", description: `${lowStockItems} items low on stock`, time: "Needs attention" }
      ];

      setStats({
        totalItems,
        borrowedItems,
        lowStockItems,
        pendingMaintenance,
        completedMaintenance,
        totalStaff,
        recentActivity
      });
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
      // keep previous fallback sample data as before
      setStats({
        totalItems: 142,
        borrowedItems: 28,
        lowStockItems: 7,
        pendingMaintenance: 15,
        completedMaintenance: 42,
        totalStaff: 8,
        recentActivity: [
          { type: "borrow", description: "Physics Lab borrowed 5 Multimeters", time: "2 hours ago" },
          { type: "return", description: "Chemistry Dept returned Oscilloscope", time: "5 hours ago" },
          { type: "maintenance", description: "Microscope calibration completed", time: "1 day ago" },
          { type: "inventory", description: "New resistors added to inventory", time: "1 day ago" }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, onClick }: any) => (
    <Card 
      sx={{ 
        p: 2, 
        borderRadius: 3, 
        boxShadow: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          bgcolor: alpha(color, 0.05)
        } : {},
        flex: '1 1 200px',
        minWidth: '200px',
        m: 1
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: '50%', 
              bgcolor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const QuickAction = ({ title, description, icon, color, path }: any) => (
    <Paper 
      sx={{ 
        p: 2, 
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
          bgcolor: alpha(color, 0.05)
        },
        flex: '1 1 200px',
        minWidth: '200px',
        m: 1
      }}
      onClick={() => navigate(path)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box 
          sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  const ActivityItem = ({ type, description, time }: any) => {
    const getIcon = () => {
      switch (type) {
        case "borrow": return <BorrowIcon color="info" />;
        case "return": return <EventIcon color="success" />;
        case "maintenance": return <MaintenanceIcon color="warning" />;
        case "inventory": return <InventoryIcon color="primary" />;
        default: return <InventoryIcon color="action" />;
      }
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1 }}>
        <Box sx={{ color: theme.palette.text.secondary }}>
          {getIcon()}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">{description}</Typography>
          <Typography variant="caption" color="text.secondary">
            {time}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2, color: theme.palette.primary.main }} />
          <Typography variant="h6" color="text.secondary">
            Loading dashboard data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.given_name} {user?.family_name}
        </Typography>
        <Chip 
          label={user?.role} 
          color="primary" 
          variant="outlined" 
          sx={{ mt: 1 }} 
        />
      </Box>

      {/* Stats Overview */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', mb: 4, mx: -1 }}>
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          icon={<InventoryIcon sx={{ color: theme.palette.primary.main }} />}
          color={theme.palette.primary.main}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Borrowed"
          value={stats.borrowedItems}
          icon={<BorrowIcon sx={{ color: theme.palette.info.main }} />}
          color={theme.palette.info.main}
          subtitle={`${Math.round((stats.borrowedItems / stats.totalItems) * 100)}% of inventory`}
          onClick={() => navigate('/borrow')}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockItems}
          icon={<WarningIcon sx={{ color: theme.palette.warning.main }} />}
          color={theme.palette.warning.main}
          subtitle="Needs attention"
          onClick={() => navigate('/inventory?stock=Alert')}
        />
        <StatCard
          title="Maintenance"
          value={`${stats.completedMaintenance}/${stats.pendingMaintenance + stats.completedMaintenance}`}
          icon={<MaintenanceIcon sx={{ color: theme.palette.success.main }} />}
          color={theme.palette.success.main}
          subtitle="Completed/Pending"
          onClick={() => navigate('/maintenance')}
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        {/* Quick Actions */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
            <QuickAction
              title="Manage Inventory"
              description="View and update equipment inventory"
              icon={<InventoryIcon sx={{ color: theme.palette.primary.main }} />}
              color={theme.palette.primary.main}
              path="/inventory"
            />
            <QuickAction
              title="Borrow Equipment"
              description="Create new borrow requests"
              icon={<BorrowIcon sx={{ color: theme.palette.info.main }} />}
              color={theme.palette.info.main}
              path="/borrow"
            />
            <QuickAction
              title="Maintenance"
              description="Track maintenance"
              icon={<MaintenanceIcon sx={{ color: theme.palette.warning.main }} />}
              color={theme.palette.warning.main}
              path="/maintenance"
            />
            <QuickAction
              title="Staff Management"
              description="Manage user accounts and permissions"
              icon={<StaffIcon sx={{ color: theme.palette.secondary.main }} />}
              color={theme.palette.secondary.main}
              path="/staff"
            />
          </Box>
        </Box>

        {/* Recent Activity */}
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Recent Activity
          </Typography>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            {stats.recentActivity.map((activity, index) => (
              <ActivityItem
                key={index}
                type={activity.type}
                description={activity.description}
                time={activity.time}
              />
            ))}
            {stats.recentActivity.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No recent activity
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;