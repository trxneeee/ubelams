// src/App.tsx
import axios from "axios";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css"; // 👈 for layout styling
import Footer from "./components/Footer";
import Header from "./components/Header";
import BorrowPage from "./pages/BorrowPage";
import DatabasePage from "./pages/DatabasePage";
import HomePage from "./pages/HomePage";
import InventoryPage from "./pages/InventoryPage";
import { useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import MaintenancePage from "./pages/MaintenancePage";
import StaffPage from "./pages/StaffPage";
import InfoIcon from "@mui/icons-material/Info";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
}
interface Notification {
  id: number;
  text: React.ReactNode;
  type: "info" | "warning" | "success";
  onClick?: () => void; // optional click handler
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
  stock_alert: string;
}


const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

function CalendarPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "month">(
    "today"
  );
   const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: {
          sheet: "calendar", // 👈 must match your sheet name
          action: "read",
        },
      });

      const result = response.data;
      if (result.success) {
        const rows = result.data;
        const headers = rows[0];

        // find column positions dynamically
        const titleIdx = headers.indexOf("Title");
        const startIdx = headers.indexOf("Start");
        const endIdx = headers.indexOf("End");
        const descIdx = headers.indexOf("Description");
        const locIdx = headers.indexOf("Location");

        const parsed: CalendarEvent[] = rows.slice(1).map((row: any[], i: number) => ({
          id: String(i + 1),
          title: row[titleIdx] || "",
          start: row[startIdx] || "",
          end: row[endIdx] || "",
          description: row[descIdx] || "",
          location: row[locIdx] || "",
        }));

        setEvents(parsed);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
    } finally {
      setLoading(false);
    }
  };
  // ✅ Filtering logic
  const getFilteredEvents = () => {
    if (filter === "all") return events;

    const now = new Date();
    const manilaNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    return events.filter((e) => {
      const eventStart = new Date(e.start);
      const eventDate = new Date(
        eventStart.toLocaleString("en-US", { timeZone: "Asia/Manila" })
      );

      if (filter === "today") {
        return (
          eventDate.getFullYear() === manilaNow.getFullYear() &&
          eventDate.getMonth() === manilaNow.getMonth() &&
          eventDate.getDate() === manilaNow.getDate()
        );
      }

      if (filter === "week") {
        const startOfWeek = new Date(manilaNow);
        startOfWeek.setDate(manilaNow.getDate() - manilaNow.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7); // next Sunday

        return eventDate >= startOfWeek && eventDate < endOfWeek;
      }

      if (filter === "month") {
        return (
          eventDate.getFullYear() === manilaNow.getFullYear() &&
          eventDate.getMonth() === manilaNow.getMonth()
        );
      }

      return true;
    });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = getFilteredEvents();

   return (
    <aside
      className="calendar-panel"
      style={{
        padding: "16px",
        maxWidth: "200px",
        display: "flex",
        flexDirection: "column",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
<div
  style={{
    position: "sticky",
    top: 0,
    background: "#f9f9f9",
    zIndex: 2,
    padding: "12px 0",
  }}
>
  {/* Calendar Icon */}
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      marginBottom: "12px",
    }}
  >
<div
  style={{
    position: "sticky",
    top: 0,
    color: "#B71C1C", // red icon
    borderRadius: "5px",
    width: "100%",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  }}
>
  <CalendarTodayIcon  fontSize="large"/>
</div>
  </div>

  {/* Filter Dropdown */}
  <div style={{ textAlign: "center" }}>
    <label style={{ fontWeight: 500, fontSize: "14px" }}>
      Show:{" "}
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as any)}
        style={{
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      >
        <option value="all">All</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
    </label>
  </div>
</div>


      {/* Event List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "4px",
          marginBottom: "40px",
        }}
      >
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((e) => (
                <li
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  style={{
                    marginBottom: "16px",
                    padding: "14px",
                    borderRadius: "8px",
                    background: "#fff",
                    border: "1px solid #ddd",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget.style.background = "#f0f8ff"))
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget.style.background = "#fff"))
                  }
                >
                  <strong style={{ fontSize: "16px" }}>{e.title}</strong>

                  {/* Date */}
                  <div
                    style={{
                      marginTop: "6px",
                      display: "block",
                      background: "#007bff",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "12px",
                    }}
                  >
                    {new Date(e.start).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>

                  {/* Start & End times */}
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "4px 8px",
                      background: "#e6f7ff",
                      borderRadius: "4px",
                      color: "#0056b3",
                      fontSize: "14px",
                    }}
                  >
                    <strong>Start:</strong>{" "}
                    {new Date(e.start).toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      padding: "4px 8px",
                      background: "#e8f9f0",
                      borderRadius: "4px",
                      color: "#137333",
                      fontSize: "14px",
                    }}
                  >
                    <strong>End:</strong>{" "}
                    {new Date(e.end).toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </li>
              ))
            ) : (
              <li style={{ color: "#888", textAlign: "center" }}>
                No events found
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Modal for Event Details */}
      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
  {selectedEvent && (
    <div>
      {/* Title */}
      <h2
        style={{
          marginBottom: "12px",
          fontSize: "20px",
          fontWeight: "600",
          borderBottom: "1px solid #ddd",
          paddingBottom: "8px",
        }}
      >
        {selectedEvent.title}
      </h2>

      {/* Date */}
      <div style={{ marginBottom: "10px" }}>
        <strong>Date:</strong>{" "}
        {new Date(selectedEvent.start).toLocaleDateString("en-PH", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      {/* Start Time */}
      <div style={{ marginBottom: "6px" }}>
        <strong>Start Time:</strong>{" "}
        {new Date(selectedEvent.start).toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>

      {/* End Time */}
      <div style={{ marginBottom: "12px" }}>
        <strong>End Time:</strong>{" "}
        {new Date(selectedEvent.end).toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>

      {/* Description */}
 {selectedEvent.description && (
  <div
    style={{
      marginBottom: "12px",
      padding: "10px",
      background: "#f5f5f5",
      borderRadius: "6px",
      fontSize: "14px",
      lineHeight: "1.5",
    }}
  >
    <strong>Description:</strong>

    <div style={{ margin: "6px 0 0 0" }}>
      {/* Render original HTML */}
      <div
        dangerouslySetInnerHTML={{ __html: selectedEvent.description }}
      />

      {/* Extract CODE: part and show button */}
      {(() => {
        // Regex: get text after <b>CODE:</b> until a <br> or end
        const match = selectedEvent.description.match(
          /<b>CODE:\s*<\/b>\s*([^<]+)/i
        );
        if (!match) return null;

        const code = match[1].trim();
        return (
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            style={{
              marginTop: "6px",
              padding: "4px 8px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Copy Code
          </button>
        );
      })()}
    </div>
  </div>
)}


      {/* Location */}
      {selectedEvent.location && (
        <div style={{ marginBottom: "6px" }}>
          <strong>Location:</strong> {selectedEvent.location}
        </div>
      )}
    </div>
  )}
</Modal>

    </aside>
  );
}

function NotificationPanel() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCInventory = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_URL, {
          params: { sheet: "c_inventory", action: "read" },
        });

        const result = response.data;
        if (result.success) {
          const rows = result.data;
          const headers = rows[1];
          const idx = (key: string) => headers.indexOf(key);

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
            stock_alert: row[idx("STOCK_ALERT")],
          }));

          // ✅ Count low stock items
          const lowStockCount = parsed.filter((item) => {
            const qtyOpened = parseInt(item.quantity_opened || "0");
            const alert = parseInt(item.stock_alert || "5");
            return qtyOpened <= alert;
          }).length;

          const generated: Notification[] = [
          ];
if (lowStockCount > 0) {
  generated.push({
    id: 99,
    text: (
      <>
        You have{" "}
        <span style={{ fontWeight: "bold", color: "red" }}>
          {lowStockCount + 1} low-stock items
        </span>
        . Please restock soon.
      </>
    ),
    type: "warning",
onClick: () => {
  navigate("/inventory?stock=Alert");
}
  });
}



          setNotifications(generated);
        }
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCInventory();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "info":
        return <InfoIcon sx={{ color: "#0056b3" }} />;
      case "warning":
        return <WarningAmberIcon sx={{ color: "#b36b00" }} />;
      case "success":
        return <CheckCircleIcon sx={{ color: "#137333" }} />;
      default:
        return <Inventory2Icon />;
    }
  };

  return (
    <aside
      style={{
        padding: "16px",
        maxWidth: "190px",
        display: "flex",
        flexDirection: "column",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* Sticky Header */}
<div
  style={{
    position: "sticky",
    top: 0,
    background: "#f9f9f9",
    zIndex: 2,
    padding: "12px 0",
    display: "flex",
    justifyContent: "center",
  }}
>
  <div
    style={{
      color: "#B71C1C", // white icon
      borderRadius: "5%",
      width: "100%",
      height: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <NotificationsIcon fontSize="large"/>
  </div>
</div>

      {/* Scrollable Notification List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "4px",
          marginBottom: "40px",
        }}
      >
        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {notifications.length > 0 ? (
              notifications.map((n) => (
             <li
  key={n.id}
  onClick={n.onClick}
  style={{
    marginBottom: "14px",
    padding: "12px",
    borderRadius: "8px",
    background: "#fff",
    border: "1px solid #eee",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: n.onClick ? "pointer" : "default",
    transition: "all 0.25s ease", // smooth effect
  }}
  onMouseEnter={(e) => {
    (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
    (e.currentTarget as HTMLElement).style.boxShadow =
      "0 4px 12px rgba(0,0,0,0.1)";
  }}
  onMouseLeave={(e) => {
    (e.currentTarget as HTMLElement).style.background = "#fff";
    (e.currentTarget as HTMLElement).style.boxShadow =
      "0 2px 4px rgba(0,0,0,0.05)";
  }}
>
  {getIcon(n.type)}
  <span>{n.text}</span>
</li>


              ))
            ) : (
              <li style={{ color: "#888", textAlign: "center" }}> 
                No notifications 
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "10px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        {children}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "8px 14px",
            border: "none",
            borderRadius: "6px",
            background: "#007bff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="app-layout">
        {/* Left: Todo Panel (dynamic now) */}
        <CalendarPanel />
        <main className="main-content">{children}</main>
        <NotificationPanel />
      </div>
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <HomePage />
            </AppLayout>
          }
        />
        <Route
          path="/staff"
          element={
            <AppLayout>
              <StaffPage />
            </AppLayout>
          }
        />
        <Route
          path="/borrow"
          element={
            <AppLayout>
              <BorrowPage />
            </AppLayout>
          }
        />
        <Route
          path="/inventory"
          element={
            <AppLayout>
              <InventoryPage />
            </AppLayout>
          }
        />
        <Route
          path="/maintenance"
          element={
            <AppLayout>
              <MaintenancePage />
            </AppLayout>
          }
        />
        <Route
          path="/database"
          element={
            <AppLayout>
              <DatabasePage />
            </AppLayout>
          }
        />
        <Route
          path="*"
          element={
            <AppLayout>
              <h1 style={{ padding: "20px" }}>404 - Page Not Found</h1>
            </AppLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
