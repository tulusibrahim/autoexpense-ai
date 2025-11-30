import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Select,
  Space,
  Statistic,
  Alert,
  Empty,
  Tag,
  Typography,
  App,
  DatePicker,
  // message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  PlusOutlined,
  FolderOutlined,
  ReloadOutlined,
  MailOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Transaction } from "../types";
import { TransactionCard } from "./TransactionCard";
import { EditModal } from "./EditModal";
import { AddTransactionModal } from "./AddTransactionModal";
import { CategoryManager } from "./CategoryManager";
import { DeleteModal } from "./DeleteModal";
import { EmailFilterSettings } from "./EmailFilterSettings";
import { api } from "../services/api";
import { formatCurrency, formatNumber } from "../utils/format";
import { getCategories } from "../utils/categories";
import {
  filterTransactionsByDate,
  getFilterLabel,
  TransactionDateFilter,
} from "../utils/dateFilter";

const { Title } = Typography;
const { Option } = Select;

interface DashboardProps {
  accessToken: string | null;
  isDemoMode: boolean;
}

const { RangePicker } = DatePicker;

export const Dashboard: React.FC<DashboardProps> = ({
  accessToken,
  isDemoMode,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [scanDateRange, setScanDateRange] = useState<
    [Dayjs | null, Dayjs | null]
  >([dayjs().subtract(7, "days"), dayjs()]);
  const [transactionDateFilter, setTransactionDateFilter] =
    useState<TransactionDateFilter>("thisweek");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isManagingEmailFilters, setIsManagingEmailFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>(getCategories());
  const { message } = App.useApp();

  // Load Data
  useEffect(() => {
    loadTransactions();
    setCategories(getCategories());
  }, []);

  // Reload categories when they change
  const handleCategoriesChange = () => {
    setCategories(getCategories());
    loadTransactions();
  };

  const loadTransactions = async () => {
    try {
      const data = await api.getExpenses();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      message.error(
        error.message ||
          "Failed to load transactions. Ensure backend is running."
      );
    }
  };

  const scanInbox = async () => {
    if (!scanDateRange[0] || !scanDateRange[1]) {
      message.warning("Please select a date range for scanning.");
      return;
    }

    setIsScanning(true);

    try {
      const startDate = scanDateRange[0].format("YYYY-MM-DD");
      const endDate = scanDateRange[1].format("YYYY-MM-DD");
      const newItems = await api.scanInbox(
        accessToken,
        isDemoMode,
        startDate,
        endDate
      );

      if (newItems.length === 0) {
        message.info("No new receipts found.");
      } else {
        message.success(`Successfully added ${newItems.length} expenses.`);
        await loadTransactions();
      }
    } catch (error) {
      message.error(
        error.message
          ? error.message
          : "Failed to scan inbox. Ensure backend is running."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleEditSave = async (updated: Transaction) => {
    try {
      await api.updateExpense(updated);
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setEditingTransaction(null);
      message.success("Transaction updated successfully.");
    } catch (e) {
      message.error("Failed to save changes");
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await api.deleteExpense(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setDeletingTransaction(null);
      message.success("Transaction deleted successfully.");
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      message.error("Failed to delete transaction. Please try again.");
    }
  };

  const handleAddTransaction = async (transaction: Transaction) => {
    try {
      const newId =
        Math.random().toString(36).substring(7) + Date.now().toString(36);
      const newTransaction = { ...transaction, id: newId };

      await api.updateExpense(newTransaction);
      await loadTransactions();
      setIsAddingTransaction(false);
      message.success("Transaction added successfully.");
    } catch (error) {
      console.error("Failed to add transaction:", error);
      message.error("Failed to add transaction. Please try again.");
    }
  };

  // Filter Logic - by category and date
  const categoryFiltered = transactions.filter(
    (t) => selectedCategory === "All" || t.category === selectedCategory
  );
  const filteredTransactions = filterTransactionsByDate(
    categoryFiltered,
    transactionDateFilter
  );

  // Update categories list for filter
  const categoryOptions = ["All", ...categories];

  // Chart Data based on expenses only (not income)
  const categoryData = transactions
    .filter((t) => (t.type || "expense") === "expense")
    .reduce((acc, curr) => {
      const existing = acc.find((item) => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#ffc658",
  ];
  // Calculate total expenses (only expenses, not income)
  const totalSpent = filteredTransactions.reduce((sum, t) => {
    const type = t.type || "expense";
    return type === "expense" ? sum + t.amount : sum;
  }, 0);

  // Calculate total income
  const totalIncome = filteredTransactions.reduce((sum, t) => {
    const type = t.type || "expense";
    return type === "income" ? sum + t.amount : sum;
  }, 0);

  // Calculate net (income - expenses)
  const netAmount = totalIncome - totalSpent;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24 }}>
      {/* Header Section */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0, color: "#e2e8f0" }}>
            Expense Overview
          </Title>
        </Col>
        <Col>
          <Space size="middle" wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setIsAddingTransaction(true)}
              id="add-transaction-btn"
            >
              Add Transaction
            </Button>
            <Button
              icon={<FolderOutlined />}
              onClick={() => setIsManagingCategories(true)}
              id="manage-categories-btn"
            >
              Manage Categories
            </Button>
            <Button
              icon={<MailOutlined />}
              onClick={() => setIsManagingEmailFilters(true)}
              id="manage-email-filters-btn"
            >
              Email Filters
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={scanInbox}
              loading={isScanning}
              id="scan-inbox-btn"
            >
              {isScanning ? "Scanning..." : "Scan Inbox"}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card
        style={{
          marginBottom: 12,
          background: "#1e293b",
          borderColor: "#334155",
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={[24, 16]}>
          {/* Date Range Filter for Display */}
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Date Range
              </span>
            </div>
            <Space size={8} wrap>
              {(
                [
                  "today",
                  "thisweek",
                  "thismonth",
                  "last7days",
                  "last30days",
                  "last90days",
                ] as TransactionDateFilter[]
              ).map((filter) => (
                <Button
                  key={filter}
                  size="small"
                  type={
                    transactionDateFilter === filter ? "primary" : "default"
                  }
                  onClick={() => setTransactionDateFilter(filter)}
                  id={`transaction-date-filter-${filter}-btn`}
                >
                  {getFilterLabel(filter)}
                </Button>
              ))}
            </Space>
          </Col>

          {/* Category Filter */}
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Category
              </span>
            </div>
            <Space size={8} wrap>
              {categoryOptions.map((cat) => (
                <Button
                  key={cat}
                  size="small"
                  type={selectedCategory === cat ? "primary" : "default"}
                  onClick={() => setSelectedCategory(cat)}
                  id={`filter-${cat.toLowerCase()}-btn`}
                >
                  {cat}
                </Button>
              ))}
            </Space>
          </Col>

          {/* Email Scan Date Filter (only for real mode) */}
          {!isDemoMode && (
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Scan Period (Max 14 days)
                </span>
              </div>
              <RangePicker
                value={scanDateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    const daysDiff = dates[1].diff(dates[0], "day");
                    if (daysDiff > 14) {
                      message.warning(
                        "Date range cannot exceed 14 days. Please select a shorter range."
                      );
                      return;
                    }
                    if (daysDiff < 0) {
                      message.warning("End date must be after start date.");
                      return;
                    }
                  }
                  setScanDateRange(dates as [Dayjs | null, Dayjs | null]);
                }}
                disabled={isScanning}
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabledDate={(current) => {
                  // Disable dates in the future
                  if (current && current > dayjs().endOf("day")) {
                    return true;
                  }
                  return false;
                }}
                onCalendarChange={(dates) => {
                  // Validate range when selecting dates
                  if (dates && dates[0] && dates[1]) {
                    const daysDiff = dates[1].diff(dates[0], "day");
                    if (daysDiff > 14) {
                      message.warning(
                        "Date range cannot exceed 14 days. Please select a shorter range."
                      );
                      // Reset to valid range
                      setScanDateRange([dates[0], dates[0].add(14, "day")]);
                      return;
                    }
                  }
                }}
                id="scan-date-range-picker"
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={totalSpent}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: "#e2e8f0" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Income"
              value={totalIncome}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Net Amount"
              value={netAmount}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: netAmount >= 0 ? "#10b981" : "#ef4444" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Transactions"
              value={filteredTransactions.length}
              formatter={(value) => formatNumber(Number(value))}
              valueStyle={{ color: "#e2e8f0" }}
            />
          </Card>
        </Col>
      </Row>

      {transactions.length > 0 ? (
        <Row gutter={[24, 24]}>
          {/* Charts */}
          <Col xs={24} lg={12}>
            <Card
              title="Spending Distribution"
              style={{ minHeight: 400 }}
              styles={{
                body: {
                  display: "flex",
                  flexDirection: "column",
                },
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend
                      wrapperStyle={{ marginTop: 16 }}
                      formatter={(value) => (
                        <span style={{ color: "#e2e8f0" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                {categoryData.map((entry, index) => (
                  <Tag
                    key={entry.name}
                    color={COLORS[index % COLORS.length]}
                    style={{ margin: 0 }}
                  >
                    {entry.name}
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>

          {/* List */}
          <Col xs={24} lg={12}>
            <Card
              title={`Transactions`}
              style={{ minHeight: 400 }}
              styles={{
                body: {
                  maxHeight: 500,
                  overflowY: "auto",
                  padding: "16px",
                },
              }}
            >
              {filteredTransactions.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {filteredTransactions.map((t) => (
                    <TransactionCard
                      key={t.id}
                      transaction={t}
                      onEdit={(tx) => setEditingTransaction(tx)}
                      onDelete={(tx) => handleDeleteClick(tx)}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  description="No transactions found for this category."
                  style={{ padding: "40px 0" }}
                />
              )}
            </Card>
          </Col>
        </Row>
      ) : (
        <Card>
          <Empty
            image={<MailOutlined style={{ fontSize: 64, color: "#475569" }} />}
            description={
              <>
                <Title level={3} style={{ color: "#e2e8f0", marginTop: 16 }}>
                  Your Inbox is Your Database
                </Title>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: 16,
                    maxWidth: 480,
                    margin: "0 auto",
                  }}
                >
                  Connect your Gmail to automatically extract, categorize, and
                  track your expenses using Gemini AI.
                </p>
              </>
            }
          >
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              onClick={scanInbox}
              loading={isScanning}
              id="start-scanning-btn"
            >
              Start Scanning
            </Button>
          </Empty>
        </Card>
      )}

      {/* Edit Modal */}
      {editingTransaction && (
        <EditModal
          transaction={editingTransaction}
          onSave={handleEditSave}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Add Transaction Modal */}
      {isAddingTransaction && (
        <AddTransactionModal
          onSave={handleAddTransaction}
          onClose={() => setIsAddingTransaction(false)}
        />
      )}

      {/* Category Manager Modal */}
      {isManagingCategories && (
        <CategoryManager
          transactions={transactions}
          onClose={() => setIsManagingCategories(false)}
          onCategoriesChange={handleCategoriesChange}
        />
      )}

      {/* Email Filter Settings Modal */}
      <EmailFilterSettings
        open={isManagingEmailFilters}
        onClose={() => setIsManagingEmailFilters(false)}
      />

      {/* Delete Modal */}
      {deletingTransaction && (
        <DeleteModal
          transaction={deletingTransaction}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingTransaction(null)}
        />
      )}
    </div>
  );
};
