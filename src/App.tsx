// src/App.tsx
import axios from "axios";
import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css"; // 👈 for layout styling
import Footer from "./components/Footer";
import Header from "./components/Header";
import BorrowPage from "./pages/BorrowPage";
import DatabasePage from "./pages/DatabasePage";
import FacultyReservationPage from "./pages/FacultyReservationPage";
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
import ReservationPage from "./pages/ReservationPage";
import { alpha, useTheme } from "@mui/material/styles";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
  instructor?: string;
  reservation_code?: string;
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

// Replace Google Sheets handlers with server-backed implementations
const SERVER_API = "http://localhost:5000/api";

/* CalendarPanel: shows Approved/Assigned reservations with recurring expansion */
function CalendarPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "month">("today");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const WEEKDAY_MAP: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
  };

  const toLocalDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Build event start/end ISO from a base date and reservation times (fallback to full-day 1h window)
  const buildEventForDate = (r: any, date: Date): CalendarEvent => {
    const start = new Date(date);
    const end = new Date(date);
    if (r.startTime) {
      const [sh, sm] = String(r.startTime).split(":").map(Number);
      start.setHours(sh ?? 0, sm ?? 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    if (r.endTime) {
      const [eh, em] = String(r.endTime).split(":").map(Number);
      end.setHours(eh ?? (start.getHours() + 1), em ?? 0, 0, 0);
    } else {
      end.setTime(start.getTime() + 60 * 60 * 1000);
    }

    return {
      id: `${r._id}::${start.toISOString()}`,
      title: `${r.subject}`,
      start: start.toISOString(),
      end: end.toISOString(),
      description: r.notes || "",
      location: r.room || "",
      instructor: r.instructor || "",
      reservation_code: r.reservation_code || ""
    };
  };

  // Expand a recurring reservation into occurrences from `fromDate` up to `endDate`
  const expandRecurring = (r: any, fromDate: Date, untilDate: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    // Expect schedule like "Every Monday, Tuesday until 2025-12-12" per FacultyReservationPage
    const txt = (r.schedule || "").trim();
    if (!txt.toLowerCase().startsWith("every")) return events;

    // Extract days and optional until date
    const untilMatch = txt.match(/until\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const end = untilMatch ? new Date(untilMatch[1]) : untilDate;
    const daysPart = txt.replace(/^every\s+/i, "").replace(/until\s+[0-9]{4}-[0-9]{2}-[0-9]{2}/i, "").trim();
    const dayNames = daysPart
      .split(/[,\s]+/)
      .map((s: string) => s.replace(/[^a-zA-Z]/g, '').toLowerCase())
      .filter(Boolean);

    // For each weekday, compute the first occurrence on/after fromDate and then add weekly occurrences
    // ensure TypeScript knows we have strings, then guard keys at runtime
    const uniqueWeekdays = Array.from(new Set(dayNames)) as string[];
    uniqueWeekdays.forEach((dayName) => {
      if (!(dayName in WEEKDAY_MAP)) return; // runtime guard -> narrows type
      const wk = WEEKDAY_MAP[dayName as keyof typeof WEEKDAY_MAP];
      // start from today's date (local)
      const startCandidate = toLocalDate(fromDate);
      // move to this week's weekday
      const diff = (wk - startCandidate.getDay() + 7) % 7;
      let occ = new Date(startCandidate);
      occ.setDate(startCandidate.getDate() + diff);
      // If occ < fromDate (time portion), make sure occ >= fromDate (use local date compare)
      while (occ <= end) {
        // Only include occurrences >= fromDate (today)
        if (occ >= toLocalDate(fromDate)) {
          events.push(buildEventForDate(r, occ));
        }
        // next week
        occ = new Date(occ);
        occ.setDate(occ.getDate() + 7);
      }
    });

    // sort by date
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return events;
  };

  // Improved fetch: uses AbortController, compares payload to avoid unnecessary setState,
  // and only shows loading on first (initial) load.
  const eventsJsonRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const fetchEvents = async (initial = false) => {
    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    if (initial) setLoading(true);
    try {
      const resp = await axios.get(`${SERVER_API}/reservations`, { signal: ctrl.signal });
      const reservations = Array.isArray(resp.data) ? resp.data : [];
      // only keep Approved/Assigned to show in calendar
      const parsed: CalendarEvent[] = reservations
        .filter((r: any) => r && (r.status === "Approved" || r.status === "Assigned"))
        .map((r: any) => {
          const dateCandidate = new Date(r.schedule);
          const start = !isNaN(dateCandidate.getTime()) ? new Date(dateCandidate) : new Date();
          if (r.startTime) {
            const [sh, sm] = String(r.startTime).split(":").map(Number);
            start.setHours(sh ?? 9, sm ?? 0, 0, 0);
          } else {
            start.setHours(9, 0, 0, 0);
          }
          const end = new Date(start);
          if (r.endTime) {
            const [eh, em] = String(r.endTime).split(":").map(Number);
            end.setHours(eh ?? (start.getHours() + 1), em ?? 0, 0, 0);
          } else {
            end.setTime(start.getTime() + 60 * 60 * 1000);
          }

          return {
            id: `${r._id}::${start.toISOString()}`,
            title: `${r.subject}`,
            start: start.toISOString(),
            end: end.toISOString(),
            description: r.notes || "",
            location: r.room || "",
            instructor: r.instructor || "",
            reservation_code: r.reservation_code || ""
          } as CalendarEvent;
        });

      const newJson = JSON.stringify(parsed);
      // only update state if data changed to avoid UI blinking
      if (eventsJsonRef.current !== newJson) {
        eventsJsonRef.current = newJson;
        setEvents(parsed);
      }
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
        console.error("Failed to fetch reservations for calendar", err);
        // keep old events instead of clearing to avoid blink
      }
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(true);
    // poll less frequently to avoid visual churn
    const iv = setInterval(() => fetchEvents(false), 60_000);
    return () => {
      clearInterval(iv);
      controllerRef.current?.abort();
    };
  }, []);

  const getFilteredEvents = () => {
    if (filter === "all") return events;
    const now = new Date();
    const manilaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    return events.filter((e) => {
      const eventStart = new Date(e.start);
      const eventDate = new Date(eventStart.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      if (filter === "today") {
        return eventDate.getFullYear() === manilaNow.getFullYear() &&
               eventDate.getMonth() === manilaNow.getMonth() &&
               eventDate.getDate() === manilaNow.getDate();
      }
      if (filter === "week") {
        const startOfWeek = new Date(manilaNow); startOfWeek.setDate(manilaNow.getDate() - manilaNow.getDay()); startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
        return eventDate >= startOfWeek && eventDate < endOfWeek;
      }
      if (filter === "month") {
        return eventDate.getFullYear() === manilaNow.getFullYear() &&
               eventDate.getMonth() === manilaNow.getMonth();
      }
      return true;
    });
  };

  const filteredEvents = getFilteredEvents();

  return (
    <aside
      className="calendar-panel"
      style={{
        padding: 16,
        maxWidth: 260,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 140px)", // leaves room for header/footer
        borderRight: "1px solid #eee", // visual divider to main area
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#f9f9f9",
          zIndex: 2,
          padding: "12px 0",
          borderBottom: "1px solid #eee", // header divider
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ color: "#B71C1C", borderRadius: 5, width: "100%", height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalendarTodayIcon fontSize="large" />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <label style={{ fontWeight: 500, fontSize: 14 }}>
            Show:{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingTop: 10 }}>
        {loading ? <p>Loading...</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filteredEvents.length > 0 ? filteredEvents.map((e) => (
              <li key={e.id} onClick={() => setSelectedEvent(e)} style={{
                marginBottom: 16, padding: 14, borderRadius: 8, background: "#fff", border: "1px solid #ddd",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)", cursor: "pointer"
              }}>
                <strong style={{ fontSize: 16 }}>{e.title}</strong>
                <div style={{ marginTop: 6, display: "block", background: "#007bff", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
                  {new Date(e.start).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" })}
                </div>
                <div style={{ marginTop: 8, padding: "4px 8px", background: "#e6f7ff", borderRadius: 4, color: "#0056b3", fontSize: 14 }}>
                  <strong>Start:</strong> {new Date(e.start).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })}
                </div>
                <div style={{ marginTop: 4, padding: "4px 8px", background: "#e8f9f0", borderRadius: 4, color: "#137333", fontSize: 14 }}>
                  <strong>End:</strong> {new Date(e.end).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })}
                </div>
                <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
                  <div>Room: {e.location || "-"}</div>
                  <div>Instructor: {(e as any).instructor || "-"}</div>
                </div>
              </li>
            )) : <li style={{ color: "#888", textAlign: "center" }}>No events found</li>}
          </ul>
        )}
      </div>

      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <div>
            <h2 style={{ marginBottom: 12, fontSize: 20 }}>{selectedEvent.title}</h2>

            {/* Reservation Code & Instructor */}
            <div style={{ marginBottom: 8, display: "flex", gap: 12 }}>
              {selectedEvent.reservation_code && (
                <div style={{ fontSize: 14 }}>
                  <strong>Code:</strong> {selectedEvent.reservation_code}
                </div>
              )}
              {selectedEvent.instructor && (
                <div style={{ fontSize: 14 }}>
                  <strong>Instructor:</strong> {selectedEvent.instructor}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Date:</strong>{" "}
              {new Date(selectedEvent.start).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>

            <div style={{ marginBottom: 6 }}>
              <strong>Start Time:</strong>{" "}
              {new Date(selectedEvent.start).toLocaleTimeString("en-PH", {
                timeZone: "Asia/Manila",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>

            <div style={{ marginBottom: 12 }}>
              <strong>End Time:</strong>{" "}
              {new Date(selectedEvent.end).toLocaleTimeString("en-PH", {
                timeZone: "Asia/Manila",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>

            {selectedEvent.description && (
              <div style={{ marginBottom: 12, padding: 10, background: "#f5f5f5", borderRadius: 6 }}>
                <strong>Notes:</strong>
                <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: selectedEvent.description }} />
              </div>
            )}

            <div style={{ marginBottom: 6 }}>
              <strong>Room:</strong> {selectedEvent.location}
            </div>
          </div>
        )}
      </Modal>
    </aside>
  );
}

/* NotificationPanel: stock alerts, pending reservations, unread messages */
function NotificationPanel() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // improved fetchNotifications: only update if changed, don't toggle loading on background polls
  const notificationsJsonRef = useRef<string | null>(null);
  const notifControllerRef = useRef<AbortController | null>(null);
  const fetchNotifications = async (initial = false) => {
    if (notifControllerRef.current) notifControllerRef.current.abort();
    const ctrl = new AbortController();
    notifControllerRef.current = ctrl;
    if (initial) setLoading(true);
    try {
      const [resReservations, resInventory] = await Promise.all([
        axios.get(`${SERVER_API}/reservations`, { signal: ctrl.signal }),
        axios.get(`${SERVER_API}/inventory`, { signal: ctrl.signal })
      ]);
      const reservations = Array.isArray(resReservations.data) ? resReservations.data : [];
      const inventory = Array.isArray(resInventory.data) ? resInventory.data : [];

      const pendingCount = reservations.filter((r: any) => r.status === "Pending").length;
      const lowStockItems = inventory.filter((it: any) => it.is_consumable && (it.available ?? 0) <= 5);
      const lowStockCount = lowStockItems.length;

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = (user && (user.email || user.name)) || '';
      let totalUnread = 0;
      const perResUnread: { res: any; unread: number }[] = [];
      reservations.forEach((r: any) => {
        const msgs = Array.isArray(r.messages) ? r.messages : [];
        const unread = msgs.filter((m:any) => !(Array.isArray(m.seen_by) ? m.seen_by : []).includes(userEmail)).length;
        if (unread > 0) {
          totalUnread += unread;
          perResUnread.push({ res: r, unread });
        }
      });

      const generated: Notification[] = [];
      if (lowStockCount > 0) generated.push({ id: 1, text: <>You have <strong style={{ color: 'red' }}>{lowStockCount} low-stock consumable item(s)</strong></>, type: "warning", onClick: () => navigate('/inventory?stock=Alert') });
      if (pendingCount > 0) generated.push({ id: 2, text: <>You have <strong style={{ color: 'orange' }}>{pendingCount}</strong> pending reservation(s)</>, type: "warning", onClick: () => navigate('/reservation?status=Pending') });
      if (totalUnread > 0) {
        generated.push({ id: 3, text: <>You have <strong style={{ color: '#b71c1c' }}>{totalUnread}</strong> unread message(s) across <strong>{perResUnread.length}</strong> reservation(s)</>, type: "info", onClick: () => navigate('/reservation') });
        perResUnread.slice(0,5).forEach(({ res, unread }: any, idx: number) => generated.push({ id: 100 + idx, text: <>Reservation <strong>{res.reservation_code}</strong> • {res.subject} — {unread} unread</>, type: "info", onClick: () => navigate(`/reservation?openChat=${res._id}`) }));
      }

      const newJson = JSON.stringify(generated);
      if (notificationsJsonRef.current !== newJson) {
        notificationsJsonRef.current = newJson;
        setNotifications(generated);
      }
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
        console.error("Failed to fetch notifications", err);
      }
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const iv = setInterval(() => fetchNotifications(false), 30_000);
    return () => {
      clearInterval(iv);
      notifControllerRef.current?.abort();
    };
  }, [navigate]);

  const getIcon = (type: string) => {
    switch (type) {
      case "info": return <InfoIcon sx={{ color: "#0056b3" }} />;
      case "warning": return <WarningAmberIcon sx={{ color: "#b36b00" }} />;
      case "success": return <CheckCircleIcon sx={{ color: "#137333" }} />;
      default: return <Inventory2Icon />;
    }
  };

  return (
    <aside
      style={{
        padding: 16,
        maxWidth: 240,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 140px)", // match calendar panel height
        borderLeft: "1px solid #eee", // visual divider from main area
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#f9f9f9",
          zIndex: 2,
          padding: "12px 0",
          display: "flex",
          justifyContent: "center",
          borderBottom: "1px solid #eee", // header divider
        }}
      >
        <div style={{ color: "#B71C1C", width: "100%", height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <NotificationsIcon fontSize="large" />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingTop: 8 }}>
        {loading ? <p style={{ textAlign: "center" }}>Loading...</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {notifications.length > 0 ? notifications.map((n) => (
              <li key={n.id} onClick={n.onClick} style={{
                marginBottom: 14, padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #eee",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10, cursor: n.onClick ? "pointer" : "default"
              }}>
                {getIcon(n.type)}
                <span>{n.text}</span>
              </li>
            )) : <li style={{ color: "#888", textAlign: "center" }}>No notifications</li>}
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
          path="/facultyreserve"
          element={
            <AppLayout>
              <FacultyReservationPage />
            </AppLayout>
          }
        />
                        <Route
          path="/reservation"
          element={
            <AppLayout>
              <ReservationPage />
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
