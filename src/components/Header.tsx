import {
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Box,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  DialogActions,
  Alert,
} from "@mui/material";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AiOutlineHome,
  AiFillHome,
  AiOutlineUser,
  AiOutlineFileSearch,
  AiOutlineAppstore,
  AiFillAppstore,
  AiOutlineTool,
  AiFillTool,
  AiOutlineSetting,
  AiOutlineSecurityScan,
} from "react-icons/ai";
import { MdPerson, MdMenu, MdEditDocument, MdLogout } from "react-icons/md";
import { useTheme } from "@mui/material/styles";
import axios from "axios";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRoles, setUserRole] = useState("");
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
     const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!storedUser) {
      navigate("/");
    } else{
      setUserRole(user.role);
    }
  }, [navigate]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

const pathToIndex: Record<string, number> = {
  "/dashboard": 0,
  ...(userRoles === "Custodian" ? { "/staff": 1 } : {}),
  "/borrow": userRoles === "Custodian" ? 2 : 1,
  "/inventory": userRoles === "Custodian" ? 3 : 2,
  "/maintenance": userRoles === "Custodian" ? 4 : 3,
};

  const [value, setValue] = useState(pathToIndex[location.pathname] || 0);

  useEffect(() => {
    setValue(pathToIndex[location.pathname] ?? 0);
  }, [location.pathname]);

  const handleChange = (_: unknown, newValue: number) => {
    setValue(newValue);
  };

  // Profile Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleClose();
    localStorage.removeItem("user");
    navigate("/");
  };

  // Settings Dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [userData, setUserData] = useState({
    email: "",
    firstname: "",
    lastname: "",
    password: "",
    confirmPassword: "",
    currentPassword: ""
  });
  const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });

  const handleSettingsOpen = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserData({
      email: user.email || "",
      firstname: user.firstname || "",
      lastname: user.lastname || "",
      password: "",
      confirmPassword: "",
      currentPassword: ""
    });
    setSettingsOpen(true);
    handleClose();
  };

  const handleSecurityOpen = () => {
    setUserData({
      email: "",
      firstname: "",
      lastname: "",
      password: "",
      confirmPassword: "",
      currentPassword: ""
    });
    setSecurityOpen(true);
    handleClose();
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    setAlert({ open: false, message: "", severity: "success" });
  };

  const handleSecurityClose = () => {
    setSecurityOpen(false);
    setAlert({ open: false, message: "", severity: "success" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSettingsUpdate = async () => {
  try {
    if (!userData.firstname || !userData.lastname) {
      setAlert({ open: true, message: "First name and last name are required", severity: "error" });
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const response = await axios.get(
      "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec",
      {
        params: {
          sheet: "users",
          action: "update",
          email: user.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          password: user.password,
          role: user.role
        }
      }
    );

    if (response.data.success) {
      // Update local storage
      const updatedUser = { ...user, firstname: userData.firstname, lastname: userData.lastname };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setAlert({ open: true, message: "Profile updated successfully", severity: "success" });
      setTimeout(() => {
        setSettingsOpen(false);
        window.location.reload(); // Refresh to update header
      }, 1000);
    }
  } catch (error) {
    setAlert({ open: true, message: "Error updating profile", severity: "error" });
  }
};

const handleSecurityUpdate = async () => {
  try {
    // Validate current password
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (userData.currentPassword != userPassword) {
      setAlert({ open: true, message: "Current password is incorrect", severity: "error" });
      return;
    }

    if (userData.password !== userData.confirmPassword) {
      setAlert({ open: true, message: "New passwords do not match", severity: "error" });
      return;
    }

    if (userData.password.length < 6) {
      setAlert({ open: true, message: "New password must be at least 6 characters", severity: "error" });
      return;
    }

    // Update password
    const response = await axios.get(
      "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec",
      {
        params: {
          sheet: "users",
          action: "update",
          email: user.email,
          password: userData.password,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role
        }
      }
    );

    if (response.data.success) {
            const updatedUser = { ...user, password: userData.password };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAlert({ open: true, message: "Password updated successfully", severity: "success" });
      setTimeout(() => {
        setSecurityOpen(false);
      }, 1000);
    }
  } catch (error) {
    setAlert({ open: true, message: "Error updating password", severity: "error" });
  }
};
  // Drawer for mobile
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

const tabIcons = [
  { to: "/dashboard", label: "Home", icon: <AiOutlineHome size={24} />, active: <AiFillHome size={24} /> },
  ...(userRoles === "Custodian" ? [{ to: "/staff", label: "Staff", icon: <AiOutlineUser size={24} />, active: <MdPerson size={24} /> }] : []),
  { to: "/borrow", label: "Borrow", icon: <AiOutlineFileSearch size={24} />, active: <MdEditDocument size={24} /> },
  { to: "/inventory", label: "Inventory", icon: <AiOutlineAppstore size={24} />, active: <AiFillAppstore size={24} /> },
  { to: "/maintenance", label: "Maintenance", icon: <AiOutlineTool size={24} />, active: <AiFillTool size={24} /> },
];

  // Get logged in user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.email?.split("@")[0] || "Guest";
  const userRole = user?.role || "No Role";
  const userFirstName = user?.firstname;
  const userLastName = user?.lastname;
  const userPassword = user?.password;

  // Safe initials extraction
  const getInitials = (first?: string, last?: string) => {
    const f = first?.charAt(0).toUpperCase() || "";
    const l = last?.charAt(0).toUpperCase() || "";
    return f + l || "?";
  };

  const initials = getInitials(userFirstName, userLastName);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "#b91c1c",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: 2,
        }}
      >
        <Toolbar sx={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)}>
              <MdMenu size={28} />
            </IconButton>
          )}

          {/* Tabs - show only on desktop */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
              <Tabs
                value={value}
                onChange={handleChange}
                textColor="inherit"
                TabIndicatorProps={{ style: { display: "none" } }}
                sx={{
                  "& .MuiTab-root": {
                    minWidth: 60,
                    color: "white",
                    borderRadius: "12px",
                    padding: "6px 12px",
                    transition: "0.3s",
                    marginLeft: 1,
                    marginRight: 1,
                    "&:hover": {
                      backgroundColor: "white",
                      color: "#b91c1c",
                      boxShadow: 2,
                    },
                  },
                  "& .Mui-selected": {
                    backgroundColor: "white",
                    color: "#b91c1c",
                    fontWeight: "bold",
                    boxShadow: 2,
                  },
                }}
              >
                {tabIcons.map((tab) => (
                  <Tab
                    key={tab.to}
                    icon={value === pathToIndex[tab.to] ? tab.active : tab.icon}
                    component={Link}
                    to={tab.to}
                  />
                ))}
              </Tabs>
            </Box>
          )}

          {/* Profile Section - right aligned on desktop */}
          {!isMobile && (
            <Box sx={{ display: "flex", alignItems: "center", position: "absolute", right: 16 }}>
              <IconButton onClick={handleProfileClick} size="small" sx={{ ml: 2 }}>
                <Avatar sx={{ bgcolor: "white", color: "#b91c1c" }}>
                  {initials}
                </Avatar>
              </IconButton>
              <Box sx={{ ml: 1, textAlign: "left", color: "white" }}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {userFirstName + " " + userLastName}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  {userRole}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Dropdown Menu for desktop */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                borderRadius: 2,
                minWidth: 160,
              },
            }}
          >
            <MenuItem onClick={handleSettingsOpen}>
              <AiOutlineSetting style={{ marginRight: 8 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleSecurityOpen}>
              <AiOutlineSecurityScan style={{ marginRight: 8 }} />
              Security
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <MdLogout style={{ marginRight: 8 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Drawer for Mobile */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
            <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "#b91c1c", color: "white", mr: 1 }}>
                {initials}
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {userName}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  {userRole}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <List>
              {tabIcons.map((tab) => (
                <ListItem key={tab.to} disablePadding>
                  <ListItemButton component={Link} to={tab.to}>
                    <ListItemIcon>{tab.icon}</ListItemIcon>
                    <ListItemText primary={tab.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider />
            <MenuItem onClick={handleSettingsOpen}>
              <ListItemIcon>
                <AiOutlineSetting size={20} />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleSecurityOpen}>
              <ListItemIcon>
                <AiOutlineSecurityScan size={20} />
              </ListItemIcon>
              Security
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <MdLogout size={20} />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Box>
        </Drawer>
      </AppBar>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={handleSettingsClose} maxWidth="sm" fullWidth>
        <DialogTitle>Update Profile</DialogTitle>
        <DialogContent>
          {alert.open && (
            <Alert severity={alert.severity as any} sx={{ mb: 2 }}>
              {alert.message}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            name="firstname"
            label="First Name"
            type="text"
            fullWidth
            variant="outlined"
            value={userData.firstname}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="lastname"
            label="Last Name"
            type="text"
            fullWidth
            variant="outlined"
            value={userData.lastname}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={userData.email}
            onChange={handleInputChange}
            disabled
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose} style={{color:'red'}}>Cancel</Button>
          <Button onClick={handleSettingsUpdate} variant="contained" color="error">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Security Dialog */}
      <Dialog open={securityOpen} onClose={handleSecurityClose} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {alert.open && (
            <Alert severity={alert.severity as any} sx={{ mb: 2 }}>
              {alert.message}
            </Alert>
          )}
           <TextField
      autoFocus
      margin="dense"
      name="currentPassword"
      label="Current Password"
      type="password"
      fullWidth
      variant="outlined"
      value={userData.currentPassword}
      onChange={handleInputChange}
      sx={{ mb: 2 }}
    />
          <TextField
            autoFocus
            margin="dense"
            name="password"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={userData.password}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={userData.confirmPassword}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSecurityClose} style={{color:'red'}}>Cancel</Button>
          <Button onClick={handleSecurityUpdate} variant="contained" color="error">
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Header;