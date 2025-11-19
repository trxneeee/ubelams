import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png";
import logo2 from "../assets/ublogo.png";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

// 👇 Define the Google Credential Response type
interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
  clientId?: string;
}

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

interface UserData {
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  role: string;
}

export default function Login() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // helper for routing decisions
  const routeAfterLogin = (email: string, role: string) => {
    const lowerEmail = (email || "").toLowerCase();
    if (role === "Instructor" || role === "Program Chair") {
      navigate("/facultyreserve");
      return;
    }
    if (role === "Student" && lowerEmail.endsWith("@s.ubaguio.edu")) {
      navigate("/studentprep");
      return;
    }
    if (role === "Admin" || role === "Student Assistant" || role === "Custodian") {
      navigate("/dashboard");;
      return;
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      // route based on stored role/email
      try {
        const u = JSON.parse(storedUser || "{}");
        const role = u.role || "";
        const email = u.email || "";
        routeAfterLogin(email, role);
      } catch {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    // 👇 Initialize Google Identity Services
    /* global google */
    window.google.accounts.id.initialize({
      client_id:
        "567905636161-p7b5sl4h4vig665cbst2sqgd4afph7k7.apps.googleusercontent.com",
      callback: handleCredentialResponse,
    });

    // 👇 Render the Google Sign-In button
    window.google.accounts.id.renderButton(
      document.getElementById("google-login-button")!,
      {
        theme: "filled_blue",
        size: "large",
        width: "100%",
      }
    );

    // Optional: one-tap popup
    window.google.accounts.id.prompt();
  }, [navigate]);

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      const userData = parseJwt(response.credential) as GoogleUserData;
      const email = (userData.email || "").toLowerCase();

      if (!isAllowedEmail(email)) {
        setError("❌ Please use your UB school email (@s.ubaguio.edu, @e.ubaguio.edu) or the system admin email to log in.");
        return;
      }

      // Try to find existing user in DB
      try {
        const findResp = await axios.post(`${API_BASE_URL}/users`, { action: "read", email: userData.email });
        const found = findResp.data?.data && findResp.data.data.length > 0 ? findResp.data.data[0] : null;

        if (found) {
          // existing account -> update names then route based on role
          await updateUserWithGoogleData(userData, found).catch(() => {});
          const role = found.role || determineRoleFromEmail(email);
          const completeUserData: UserData = { ...userData, role };
          localStorage.setItem("user", JSON.stringify(completeUserData));
          routeAfterLogin(email, role);
          return;
        }
      } catch (dbErr) {
        // continue to fallback behavior if DB read fails
        console.warn("User lookup failed, continuing to fallback:", (dbErr && (dbErr as any).message) || dbErr);
      }

      // Not found in DB:
      // - If student domain: treat as Student and send to student fill-up (no DB required)
      if (email.endsWith("@s.ubaguio.edu")) {
        const completeUserData: UserData = { ...userData, role: "Student" };
        localStorage.setItem("user", JSON.stringify(completeUserData));
        navigate("/studentprep");
        return;
      }

      // For others (e.g., faculty), attempt to create a DB user and route based on returned role
      try {
        const role = await createNewUser(userData); // returns role string
        const completeUserData: UserData = { ...userData, role };
        localStorage.setItem("user", JSON.stringify(completeUserData));
        routeAfterLogin(email, role);
        return;
      } catch (createErr) {
        console.error("Failed to create user:", createErr);
        setError("Failed to complete login. Please contact administrator.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong during login");
    }
  };

  // Function to check if email is allowed
  const isAllowedEmail = (email: string): boolean => {
    const allowedDomains = ['@s.ubaguio.edu', '@e.ubaguio.edu'];
    const allowedEmails = ['ubaguioelams@gmail.com'];
    
    return allowedDomains.some(domain => email.endsWith(domain)) || 
           allowedEmails.includes(email);
  };

  // Function to determine role based on email
  const determineRoleFromEmail = (email: string): string => {
    if (email.endsWith('@s.ubaguio.edu')) {
      return "Student";
    } else if (email.endsWith('@e.ubaguio.edu')) {
      return "Faculty";
    } else if (email === 'ubaguioelams@gmail.com') {
      return "Admin";
    }
    return "Student";
  };

  // Function to get user role from MongoDB and create user if doesn't exist

  // ✅ NEW FUNCTION: Update existing user with Google data
  const updateUserWithGoogleData = async (userData: GoogleUserData, existingUser: any): Promise<void> => {
    try {
      // Extract names from Google data
      const { firstName, lastName } = extractNames(userData);
      
      console.log("🔄 Updating existing user with Google data:", {
        email: userData.email,
        currentFirstname: existingUser.firstname,
        currentLastname: existingUser.lastname,
        newFirstname: firstName,
        newLastname: lastName
      });

      // Only update if names are different or empty
      if (existingUser.firstname !== firstName || existingUser.lastname !== lastName || 
          !existingUser.firstname || !existingUser.lastname) {
        
        const updateResponse = await axios.post(`${API_BASE_URL}/users`, {
          action: "update",
          email: userData.email,
          firstname: firstName,
          lastname: lastName,
          role: existingUser.role // Keep existing role
        });

        console.log("✅ Update response:", updateResponse.data);

        if (!updateResponse.data.success) {
          console.warn("⚠️ Failed to update user data:", updateResponse.data.message);
        }
      } else {
        console.log("✅ User data is already up to date");
      }
    } catch (error) {
      console.error("❌ Error updating user with Google data:", error);
      // Don't throw error here - we can still let the user login even if update fails
    }
  };

  // safe extractor for messages from axios responses / errors
  const extractMessage = (obj: any) => {
    if (!obj) return '';
    // axios response shape: { data: { message: string } } or error.response?.data?.message
    if (obj?.data && typeof obj.data === 'object' && ('message' in obj.data)) return String((obj.data as any).message || '');
    if ('message' in obj) return String(obj.message || '');
    return String(obj);
  };

  // Function to create new user
  const createNewUser = async (userData: GoogleUserData): Promise<string> => {
    try {
      const role = determineRoleFromEmail(userData.email);
      
      // ✅ Use the new extractNames function
      const { firstName, lastName } = extractNames(userData);
      
      console.log("✅ Creating new user with data:", {
        email: userData.email,
        firstname: firstName,
        lastname: lastName,
        role: role
      });

      const createResponse = await axios.post(`${API_BASE_URL}/users`, {
        action: "create",
        email: userData.email,
        firstname: firstName,
        lastname: lastName,
        role: role
      });

      console.log("✅ Create response:", createResponse.data);

      if ((createResponse.data as any).success) {
        return role;
      } else {
        throw new Error("Failed to create user: " + extractMessage(createResponse));
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // If it's a duplicate error, try to read the existing user
      const errMsg = extractMessage(error);
      if (errMsg.includes("already exists") || error.response?.status === 400) {
        console.log("User already exists, fetching existing user...");
        const findResponse = await axios.post(`${API_BASE_URL}/users`, {
          action: "read",
          email: userData.email
        });
        
        if (findResponse.data.success && findResponse.data.data && findResponse.data.data.length > 0) {
          return findResponse.data.data[0].role;
        }
      }
      
      throw error;
    }
  };

  // ✅ NEW: Better name extraction function
  const extractNames = (userData: GoogleUserData): { firstName: string; lastName: string } => {
    // Special case for admin email
    if (userData.email === 'ubaguioelams@gmail.com') {
      return { firstName: 'System', lastName: 'Admin' };
    }

    // Method 1: Use Google's provided names (check both given_name/family_name and name)
    if (userData.given_name && userData.family_name) {
      console.log("✅ Using given_name/family_name from Google");
      return { 
        firstName: userData.given_name.trim(), 
        lastName: userData.family_name.trim()
      };
    }

    // Method 2: Use the full name field and split it intelligently
    if (userData.name) {
      console.log("✅ Using full name field from Google:", userData.name);
      const nameParts = userData.name.trim().split(/\s+/);
      
      if (nameParts.length === 1) {
        // Only one name provided
        return {
          firstName: nameParts[0],
          lastName: 'User'
        };
      } else if (nameParts.length === 2) {
        // First and last name
        return {
          firstName: nameParts[0],
          lastName: nameParts[1]
        };
      } else {
        // Multiple names - assume first is first name, rest is last name
        return {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ')
        };
      }
    }

    // Method 3: Extract from email as final fallback
    console.log("⚠️ Using email fallback for names");
    return extractNamesFromEmail(userData.email);
  };

  // ✅ UPDATED: Extract names from email
  const extractNamesFromEmail = (email: string): { firstName: string; lastName: string } => {
    const emailPrefix = email.split('@')[0];
    
    if (emailPrefix.includes('.')) {
      const parts = emailPrefix.split('.');
      return {
        firstName: capitalizeFirstLetter(parts[0] || 'User'),
        lastName: capitalizeFirstLetter(parts[1] || 'User')
      };
    } else if (emailPrefix.includes('_')) {
      const parts = emailPrefix.split('_');
      return {
        firstName: capitalizeFirstLetter(parts[0] || 'User'),
        lastName: capitalizeFirstLetter(parts[1] || 'User')
      };
    } else {
      return {
        firstName: capitalizeFirstLetter(emailPrefix),
        lastName: 'User'
      };
    }
  };


  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return 'User';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  function parseJwt(token: string): object {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-wrapper">
          <img src={logo2} alt="University of Baguio" className="logo" />
          <img src={logo} alt="University of Baguio" className="logo" />
        </div>

        <h1 className="title">University of Baguio</h1>
        <p className="subtitle">ECE Laboratory Asset Management System</p>

        {error && <p className="alert error">{error}</p>}

        {/* Google Login Button Container */}
        <div id="google-login-button" style={{ marginTop: "20px" }}></div>

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