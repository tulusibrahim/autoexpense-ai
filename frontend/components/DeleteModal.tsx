import React from "react";
import { Modal, Button, Space, Typography, Descriptions, Tag } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Transaction } from "../types";
import { formatCurrency } from "../utils/format";

const { Text } = Typography;

interface DeleteModalProps {
  transaction: Transaction;
  onConfirm: (id: string) => void;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  Food: "orange",
  Transport: "blue",
  Shopping: "magenta",
  Utilities: "gold",
  Subscription: "purple",
  Other: "default",
};

export const DeleteModal: React.FC<DeleteModalProps> = ({
  transaction,
  onConfirm,
  onClose,
}) => {
  const tagColor = categoryColors[transaction.category] || "default";

  const handleDelete = () => {
    onConfirm(transaction.id);
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined
            style={{ color: "#ff4d4f", fontSize: 20 }}
          />
          <span>Delete Transaction</span>
        </Space>
      }
      open={true}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            danger
            onClick={handleDelete}
            id="confirm-delete-btn"
          >
            Delete Transaction
          </Button>
        </Space>
      }
      width={500}
    >
      <div style={{ marginBottom: 24 }}>
        <Text>
          Are you sure you want to delete this transaction? This action cannot
          be undone.
        </Text>
      </div>

      <Descriptions
        bordered
        column={1}
        size="small"
        style={{ background: "#1e293b", borderRadius: 8 }}
        styles={{
          label: {
            color: "#94a3b8",
            width: "30%",
          },
          content: {
            color: "#e2e8f0",
          },
        }}
      >
        <Descriptions.Item label="Merchant">
          <Text strong>{transaction.merchant}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Amount">
          <Text strong>{formatCurrency(transaction.amount)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Date">{transaction.date}</Descriptions.Item>
        <Descriptions.Item label="Category">
          <Tag color={tagColor}>{transaction.category}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Summary">
          {transaction.summary}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};
