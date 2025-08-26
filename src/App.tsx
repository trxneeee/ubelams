// src/App.tsx
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import axios from "axios";

import StaffPage from "./pages/StaffPage";
import BorrowPage from "./pages/BorrowPage";
import InventoryPage from "./pages/InventoryPage";
import MaintenancePage from "./pages/MaintenancePage";
import HomePage from "./pages/HomePage";
import DatabasePage from "./pages/DatabasePage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import "./App.css"; // 👈 for layout styling

const API_URL =
  "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec";

function TodoPanel() {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
 const user = JSON.parse(localStorage.getItem("user") || "{}");
const fetchTodos = async () => {
  setLoading(true);
  try {
    const response = await axios.get(API_URL, {
      params: {
        sheet: "todo",
        action: "read",
      },
    });

    const result = response.data;
    if (result.success) {
      const rows = result.data;
      const headers = rows[0];
      const todo_id = headers.indexOf("todo_id");
      const description = headers.indexOf("description");
      const done_by = headers.indexOf("done_by");
      const status = headers.indexOf("status");

      let parsed = rows.slice(1).map((row: any[]) => ({
        id: row[todo_id],
        description: row[description],
        doneBy: row[done_by],
        status: row[status],
      }));

      // Sort descending by todo_id (newest first)
      parsed = parsed.sort((a, b) => Number(b.id) - Number(a.id));

      setTodos(parsed);
    }
  } catch (err) {
    console.error("Failed to fetch todos", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchTodos();
  }, []);

  // ➕ Add new todo
  const handleAddTodo = async () => {
    const desc = prompt("Enter todo description:");
    if (!desc) return;

    try {
      const params = new URLSearchParams({
        sheet: "todo",
        action: "create",
        todo_id: Date.now().toString(),
        description: desc,
        done_by: "",
        status: "pending",
      });

      await axios.get(`${API_URL}?${params.toString()}`);
      fetchTodos();
    } catch (err: any) {
      console.error("Failed to add todo", err.response?.data || err.message);
    }
  };

  // ✔ Mark as Done
  const handleMarkDone = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const confirmDone = window.confirm(`Mark "${todo.description}" as done?`);
    if (!confirmDone) return;

    try {
      const doneByName = user.firstname && user.lastname
        ? `${user.firstname} ${user.lastname}`
        : "system";

      const params = new URLSearchParams({
        sheet: "todo",
        action: "update",
        todo_id: id,
        description: todo.description || "",
        done_by: doneByName,// replace with actual user if needed
        status: "done",
      });

      await axios.get(`${API_URL}?${params.toString()}`);
      fetchTodos();
    } catch (err: any) {
      console.error("Failed to mark todo as done", err.response?.data || err.message);
    }
  };

  return (
    <aside
      className="todo-panel"
      style={{
        padding: "16px",
        maxWidth: "400px",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3>Todo</h3>
        <button
          onClick={handleAddTodo}
          style={{
            cursor: "pointer",
            padding: "4px 12px",
            borderRadius: "4px",
            background: "#4caf50",
            color: "#fff",
            border: "none",
          }}
        >
          ➕ Add
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {todos.length > 0 ? (
            todos.map((t) => (
<li
  key={t.id}
  style={{
    marginBottom: "12px",
    padding: "10px",
    borderRadius: "6px",
    background: t.status === "done" ? "#d4edda" : "#fff",
    border: t.status === "done" ? "1px solid #c3e6cb" : "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch", // stretch children vertically
  }}
>
  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <span
      style={{
        fontWeight: 500,
      }}
    >
      {t.description}
    </span>
    <small style={{ color: "#666" }}>
      {t.doneBy ? `by ${t.doneBy}` : "not done"} ({t.status})
    </small>
  </div>

  {t.status !== "done" && (
    <button
      onClick={() => handleMarkDone(t.id)}
      style={{
        cursor: "pointer",
        width: "40px",
        alignSelf: "stretch", // make button same height as li
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "inherit",
        color: "#2196f3",
        border: "1px solid #ddd",
        borderRadius: 0,
        padding: 0,
        fontWeight: "bold",
        fontSize: "16px",
        lineHeight: 1,
        transition: "background 0.2s, color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#28a745"; // green on hover
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "inherit";
        e.currentTarget.style.color = "#2196f3";
      }}
    >
      ✔
    </button>
  )}
</li>


            ))
          ) : (
            <li style={{ color: "#888", textAlign: "center" }}>No todos found</li>
          )}
        </ul>
      )}
    </aside>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="app-layout">
        {/* Left: Todo Panel (dynamic now) */}
        <TodoPanel />
        <main className="main-content">{children}</main>
        <aside className="notification-panel">
          <h3>Notifications</h3>
          <ul>
            <li>New request submitted</li>
            <li>Inventory low: Oscilloscope</li>
            <li>Maintenance scheduled</li>
          </ul>
        </aside>
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
