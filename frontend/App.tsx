import React, { useState, useEffect } from "react";
import {
  Layout,
  Card,
  Button,
  Input,
  Space,
  // message,
  App as AntdApp,
} from "antd";
import { GoogleOutlined, SettingOutlined } from "@ant-design/icons";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { UserProfile, AppView } from "./types";
import { GOOGLE_SCOPES } from "./constants";
import { api } from "./services/api";
import {
  registerLogoutCallback,
  unregisterLogoutCallback,
} from "./services/auth";

const { Content } = Layout;

declare global {
  interface Window {
    google: any;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<UserProfile | null>(
    localStorage.getItem("user_profile")
      ? JSON.parse(localStorage.getItem("user_profile") || "")
      : null
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>(
    "656179361211-kcp0f778v84cjbl7ql30lorsevv72vt4.apps.googleusercontent.com"
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    if (user) {
      console.log("user", user);
      setAccessToken(localStorage.getItem("access_token") || null);
      setView(AppView.DASHBOARD);
    }
  }, [user]);

  // Initialize Google Identity Services if Client ID is present
  const initGoogleAuth = (id: string) => {
    if (!window.google || !id) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope: GOOGLE_SCOPES,
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          setLoading(true);
          console.log("tokenResponse", tokenResponse);
          localStorage.setItem("access_token", tokenResponse.access_token);
          try {
            const profile = await api.getUserProfile(
              tokenResponse.access_token
            );
            setUser(profile);
            localStorage.setItem("user_profile", JSON.stringify(profile));
            setView(AppView.DASHBOARD);
          } catch (e) {
            console.error("Failed to fetch profile", e);
            message.error(
              "Failed to fetch user profile. Make sure the backend server is running."
            );
          } finally {
            setLoading(false);
          }
        }
      },
    });

    return client;
  };

  const handleLogin = () => {
    if (!clientId) {
      message.warning(
        "Please enter a Google Client ID in settings or use Demo Mode."
      );
      return;
    }

    const client = initGoogleAuth(clientId);
    if (client) client.requestAccessToken();
  };

  const handleLogout = () => {
    // Clear user data and tokens
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("user_profile");
    localStorage.removeItem("access_token");
    setView(AppView.LOGIN);
  };

  // Register logout callback for automatic logout on token expiration
  useEffect(() => {
    const logoutHandler = () => {
      message.warning("Your session has expired. Please login again.");
      // Clear user data and tokens
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("user_profile");
      localStorage.removeItem("access_token");
      setView(AppView.LOGIN);
    };

    registerLogoutCallback(logoutHandler);

    // Cleanup on unmount
    return () => {
      unregisterLogoutCallback();
    };
  }, [message]);

  const renderLogin = () => (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Card
        style={{
          maxWidth: 448,
          width: "100%",
          textAlign: "center",
          borderRadius: 24,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: "bold",
            color: "white",
            margin: "0 auto 24px",
            boxShadow: "0 10px 25px rgba(59, 130, 246, 0.2)",
          }}
        >
          AE
        </div>
        <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
          AutoExpense AI
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 32, lineHeight: 1.6 }}>
          Stop manually entering expenses. Connect your Gmail, and let Gemini AI
          extract receipts and payments automatically.
        </p>

        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            onClick={handleLogin}
            loading={loading}
            block
            id="login-btn"
          >
            Sign in with Google
          </Button>
        </Space>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div
      style={{ maxWidth: 672, margin: "0 auto", padding: 16, paddingTop: 40 }}
    >
      <Card>
        <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
          Settings
        </h2>

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <label
              style={{
                display: "block",
                color: "#cbd5e1",
                fontSize: 12,
                fontWeight: "bold",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Google Client ID (OAuth 2.0)
            </label>
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginBottom: 8,
              }}
            >
              Required for "Real Mode". Create a project in Google Cloud
              Console, enable Gmail API, and create an OAuth 2.0 Client ID for
              Web Application.
            </p>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc...apps.googleusercontent.com"
              id="client-id-input"
            />
          </div>

          <div style={{ display: "flex", gap: 16, paddingTop: 16 }}>
            <Button
              onClick={() => setView(AppView.LOGIN)}
              id="save-settings-btn"
            >
              Save & Back
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );

  return (
    <AntdApp>
      <Layout style={{ minHeight: "100vh", background: "#0f172a" }}>
        <Navbar
          user={user}
          onLogout={handleLogout}
          onSettings={() => setView(AppView.SETTINGS)}
        />

        <Content>
          {view === AppView.LOGIN && renderLogin()}
          {view === AppView.SETTINGS && renderSettings()}
          {view === AppView.DASHBOARD && (
            <Dashboard accessToken={accessToken} isDemoMode={isDemoMode} />
          )}
        </Content>
      </Layout>
    </AntdApp>
  );
};

export default App;
