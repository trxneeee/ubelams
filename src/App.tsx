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
import Login from "./pages/Login";
import MaintenancePage from "./pages/MaintenancePage";
import StaffPage from "./pages/StaffPage";


interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
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
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#f9f9f9",
          zIndex: 2,
          paddingBottom: "12px",
        }}
      >
        <h3 style={{ marginBottom: "12px", fontSize: "20px" }}>📅 To-Do List</h3>
        <div>
          <label>
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
          <p style={{ margin: "6px 0 0 0" }}>{selectedEvent.description}</p>
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
  const notifications = [
    { id: 1, text: "New request submitted", type: "info" },
    { id: 2, text: "Inventory low: Oscilloscope", type: "warning" },
    { id: 3, text: "Maintenance scheduled", type: "success" },
    { id: 4, text: "Database updated successfully", type: "success" },
    { id: 5, text: "Pending staff approval", type: "info" },
  ];

  return (
    <aside
      className="notification-panel"
      style={{
        padding: "16px",
        maxWidth: "250px", // 👈 similar width to calendar
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
          paddingBottom: "12px",
        }}
      >
        <h3 style={{ marginBottom: "12px", fontSize: "20px" }}>🔔 Notifications</h3>
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
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <li
                key={n.id}
                style={{
                  marginBottom: "16px",
                  padding: "14px",
                  borderRadius: "8px",
                  background: "#fff",
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  fontSize: "14px",
                  color:
                    n.type === "warning"
                      ? "#b36b00"
                      : n.type === "success"
                      ? "#137333"
                      : "#0056b3",
                }}
              >
                {n.text}
              </li>
            ))
          ) : (
            <li style={{ color: "#888", textAlign: "center" }}>No notifications</li>
          )}
        </ul>
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
