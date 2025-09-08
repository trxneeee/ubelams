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
} from "react-icons/ai";
import { MdPerson, MdMenu, MdEditDocument } from "react-icons/md";
import { useTheme } from "@mui/material/styles";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const pathToIndex: Record<string, number> = {
    "/dashboard": 0,
    "/staff": 1,
    "/borrow": 2,
    "/inventory": 3,
    "/maintenance": 4,
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
    navigate("/"); // #b91c1cirect to login/home
  };

  // Drawer for mobile
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const tabIcons = [
    { to: "/dashboard", label: "Home", icon: <AiOutlineHome size={24} />, active: <AiFillHome size={24} /> },
    { to: "/staff", label: "Staff", icon: <AiOutlineUser size={24} />, active: <MdPerson size={24} /> },
    { to: "/borrow", label: "Borrow", icon: <AiOutlineFileSearch size={24} />, active: <MdEditDocument size={24} /> },
    { to: "/inventory", label: "Inventory", icon: <AiOutlineAppstore size={24} />, active: <AiFillAppstore size={24} /> },
    { to: "/maintenance", label: "Maintenance", icon: <AiOutlineTool size={24} />, active: <AiFillTool size={24} /> },
  ];

  // 🔹 Get logged in user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user?.email?.split("@")[0] || "Guest";
  const userRole = user?.role || "No Role";
const userFirstName = user?.firstname;
const userLastName = user?.lastname;
  return (
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
                {`${userFirstName.charAt(0).toUpperCase()}${userLastName.charAt(0).toUpperCase()}`}
              </Avatar>
            </IconButton>
            <Box sx={{ ml: 1, textAlign: "left", color: "white" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {userName}
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
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>

      {/* Drawer for Mobile */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
          <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "#b91c1c", color: "white", mr: 1 }}>
              {`${userFirstName.charAt(0).toUpperCase()}${userLastName.charAt(0).toUpperCase()}`}
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
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
