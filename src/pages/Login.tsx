import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // 👈 Import CSS
import logo from "../assets/logo.png";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();


    useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.get(
        "https://script.google.com/macros/s/AKfycbwJaoaV_QAnwlFxtryyN-v7KWUPjCop3zaSwCCjcejp34nP32X-HXCIaXoX-PlGqPd4/exec",
        { params: { sheet: "users", action: "read" } }
      );

      const result = response.data;
      if (!result.success) throw new Error(result.error || "API error");

      const rawData = result.data;
      const users: any[][] =
        typeof rawData === "string" ? JSON.parse(rawData) : rawData;

      if (!Array.isArray(users) || users.length < 2) {
        throw new Error("No users found in sheet");
      }

      const headers = users[0];
      const emailIndex = headers.indexOf("email");
      const passwordIndex = headers.indexOf("password");
      const roleIndex = headers.indexOf("role");
      const firstnameIndex = headers.indexOf("firstname");
      const lastnameIndex = headers.indexOf("lastname");

      if (emailIndex === -1 || passwordIndex === -1 || roleIndex === -1) {
        throw new Error("Invalid sheet format: missing required columns");
      }

      const user = users.find(
        (row, idx) =>
          idx > 0 &&
          row[emailIndex]?.toString().trim() === email.trim() &&
          row[passwordIndex]?.toString().trim() === password.trim()
      );

      if (user) {
        const loggedInUser = {
          email: user[emailIndex],
          role: user[roleIndex],
          firstname: user[firstnameIndex],
          lastname: user[lastnameIndex],
        };
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        setSuccess("✅ Login successful!");
        navigate("/dashboard");
      } else {
        setError("❌ Invalid email or password");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="logo-wrapper">
          <img src={logo} alt="University of Baguio" className="logo" />
        </div>

        <h1 className="title">University of Baguio</h1>
        <p className="subtitle">ECE Laboratory Asset Management System</p>

        {error && <p className="alert error">{error}</p>}
        {success && <p className="alert success">{success}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="footer">
          <p>
            © {new Date().getFullYear()} University of Baguio <br />
            <span className="highlight">Philippines</span>
          </p>
        </div>
      </div>
    </div>
  );
}
