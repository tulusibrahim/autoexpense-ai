import React, { useState } from "react";
import { Card, Tag, Button, Space, Avatar, Typography } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Transaction } from "../types";
import { formatCurrency, formatDate } from "../utils/format";

const { Text } = Typography;

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const categoryColors: Record<string, string> = {
  Food: "orange",
  Transport: "blue",
  Shopping: "magenta",
  Utilities: "gold",
  Subscription: "purple",
  Other: "default",
};

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const tagColor = categoryColors[transaction.category] || "default";
  const transactionType = transaction.type || "expense";
  const amountColor = transactionType === "income" ? "#10b981" : "#e2e8f0"; // Green for income, existing color for expense

  return (
    <Card
      size="small"
      hoverable
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        marginBottom: 12,
        borderRadius: 12,
        border: "1px solid #334155",
        transition: "all 0.2s",
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left Section: Avatar + Merchant Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            size={48}
            style={{
              backgroundColor: "#334155",
              color: "#e2e8f0",
              fontSize: 20,
              fontWeight: "bold",
              flexShrink: 0,
            }}
          >
            {transaction.category.charAt(0)}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              strong
              style={{
                fontSize: 16,
                display: "block",
                marginBottom: 4,
                color: "#e2e8f0",
              }}
              ellipsis
            >
              {transaction.merchant}
            </Text>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>{formatDate(transaction.date)}</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {transaction.summary}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Amount + Category + Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <Text
              strong
              style={{
                fontSize: 16,
                display: "block",
                marginBottom: 4,
                color: amountColor,
              }}
            >
              {formatCurrency(transaction.amount)}
            </Text>
            <Tag
              color={transactionType === "income" ? "green" : "default"}
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                fontWeight: 600,
                marginRight: 8,
              }}
            >
              {transactionType === "income" ? "Income" : "Expense"}
            </Tag>
            <Tag
              color={tagColor}
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {transaction.category}
            </Tag>
          </div>
          <Space size={4}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(transaction)}
              style={{
                color: "#64748b",
                opacity: isHovered ? 1 : 0.6,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#64748b";
              }}
              id={`edit-transaction-${transaction.id}-btn`}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(transaction)}
              style={{
                color: "#64748b",
                opacity: isHovered ? 1 : 0.6,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff4d4f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#64748b";
              }}
              id={`delete-transaction-${transaction.id}-btn`}
            />
          </Space>
        </div>
      </div>
    </Card>
  );
};
