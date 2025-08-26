import { useEffect, useState } from "react";
import { Container, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface User {
  email: string;
  role: string;
  firstname: string;
  lastname: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // redirect to login if not logged in
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  return (
    <div>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {user ? (
          <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                👋 Welcome, {user.firstname} {user.lastname}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Role:</strong> {user.role}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Typography variant="h6" align="center" color="text.secondary">
            Loading user details...
          </Typography>
        )}
      </Container>
    </div>
  );
};

export default HomePage;
