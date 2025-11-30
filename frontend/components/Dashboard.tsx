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
  // message,
} from "antd";
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

type DateFilter = "today" | "7days" | "14days" | "30days" | "lastweek";

export const Dashboard: React.FC<DashboardProps> = ({
  accessToken,
  isDemoMode,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [transactionDateFilter, setTransactionDateFilter] =
    useState<TransactionDateFilter>("all");
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
      message.error("Failed to load expenses. Ensure backend is running.");
    }
  };

  const scanInbox = async () => {
    setIsScanning(true);
    setStatusMsg(
      isDemoMode
        ? "Generating realistic demo emails..."
        : "Syncing with Server & Gmail..."
    );

    try {
      const newItems = await api.scanInbox(accessToken, isDemoMode, dateFilter);

      if (newItems.length === 0) {
        message.info("No new receipts found.");
        setStatusMsg("");
      } else {
        message.success(`Successfully added ${newItems.length} expenses.`);
        setStatusMsg("");
        await loadTransactions();
      }
    } catch (error) {
      console.error(error);
      message.error(
        error.data.details
          ? error.data.details
          : "Failed to scan inbox. Ensure backend is running."
      );
      setStatusMsg("");
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

  // Chart Data based on ALL transactions
  const categoryData = transactions.reduce((acc, curr) => {
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
  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

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
            {!isDemoMode && (
              <Select
                value={dateFilter}
                onChange={(value) => setDateFilter(value as DateFilter)}
                disabled={isScanning}
                style={{ width: 150 }}
                id="date-filter-select"
              >
                <Option value="today">Today</Option>
                <Option value="7days">Last 7 Days</Option>
                <Option value="14days">Last 14 Days</Option>
                <Option value="30days">Last 30 Days</Option>
              </Select>
            )}
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

      {statusMsg && (
        <Alert
          message={statusMsg}
          type={statusMsg.includes("Error") ? "error" : "info"}
          showIcon
          closable
          onClose={() => setStatusMsg("")}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Transaction Date Filter */}
      <Row style={{ marginBottom: 24 }} gutter={[12, 12]}>
        <Col span={24}>
          <Space size="small" wrap>
            <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
              Filter by date:
            </span>
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
                type={transactionDateFilter === filter ? "primary" : "default"}
                onClick={() => setTransactionDateFilter(filter)}
                id={`transaction-date-filter-${filter}-btn`}
              >
                {getFilterLabel(filter)}
              </Button>
            ))}
          </Space>
        </Col>
        <Col>
          <Space>
            <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
              Transactions:
            </span>
            <Space size={8}>
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
          </Space>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={totalSpent}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: "#e2e8f0" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
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
