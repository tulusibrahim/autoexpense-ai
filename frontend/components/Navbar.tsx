import React from "react";
import { Layout, Avatar, Button, Space, Typography } from "antd";
import { UserOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { UserProfile } from "../types";

const { Header } = Layout;
const { Text } = Typography;

// Responsive wrapper component
const ResponsiveUserInfo: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <Text strong style={{ color: "#e2e8f0", fontSize: 14 }}>
        {user.name}
      </Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {user.email}
      </Text>
    </div>
  );
};

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onSettings,
}) => {
  return (
    <Header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #334155",
        background: "#1e293b",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          AE
        </div>
        <Text
          strong
          style={{
            fontSize: 18,
            background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AutoExpense AI
        </Text>
      </div>

      <Space size="middle" align="center">
        {user ? (
          <>
            <ResponsiveUserInfo user={user} />
            {user.picture ? (
              <Avatar src={user.picture} size={36} />
            ) : (
              <Avatar icon={<UserOutlined />} size={36} />
            )}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              style={{ color: "#94a3b8" }}
            >
              Logout
            </Button>
          </>
        ) : (
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onSettings}
            style={{ color: "#94a3b8" }}
          />
        )}
      </Space>
    </Header>
  );
};
