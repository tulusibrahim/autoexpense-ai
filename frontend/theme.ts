import { ThemeConfig, theme } from "antd";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#3b82f6",
    colorBgBase: "#0f172a",
    colorBgContainer: "#1e293b",
    colorBgElevated: "#334155",
    colorBorder: "#475569",
    colorText: "#e2e8f0",
    colorTextSecondary: "#94a3b8",
    borderRadius: 8,
  },
  components: {
    Layout: {
      bodyBg: "#0f172a",
      headerBg: "#1e293b",
      headerPadding: "0 24px",
      headerHeight: 64,
    },
    Card: {
      borderRadius: 16,
      paddingLG: 24,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Modal: {
      borderRadius: 16,
    },
  },
  algorithm: theme.darkAlgorithm,
};

