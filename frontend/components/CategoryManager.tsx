import React, { useState } from "react";
import {
  Modal,
  List,
  Input,
  Button,
  Space,
  Typography,
  Popconfirm,
  App,
  // message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Transaction } from "../types";
import {
  getCategories,
  addCategory,
  deleteCategory,
} from "../utils/categories";
import { api } from "../services/api";

const { Text } = Typography;

interface CategoryManagerProps {
  transactions: Transaction[];
  onClose: () => void;
  onCategoriesChange: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  transactions,
  onClose,
  onCategoriesChange,
}) => {
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [newCategory, setNewCategory] = useState("");
  const { message } = App.useApp();

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updated = addCategory(newCategory.trim());
      setCategories(updated);
      setNewCategory("");
      onCategoriesChange();
      message.success("Category added successfully.");
    } else if (categories.includes(newCategory.trim())) {
      message.warning("Category already exists.");
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (category === "Other") {
      message.warning("Cannot delete the 'Other' category.");
      return;
    }

    // Check if category is used in transactions
    const transactionsUsingCategory = transactions.filter(
      (t) => t.category === category
    );

    if (transactionsUsingCategory.length > 0) {
      Modal.confirm({
        title: "Delete Category",
        content: `This category is used in ${transactionsUsingCategory.length} transaction(s). All transactions will be moved to "Other" category. Continue?`,
        okText: "Yes, Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            for (const transaction of transactionsUsingCategory) {
              await api.updateExpense({
                ...transaction,
                category: "Other",
              });
            }
            const updated = deleteCategory(category);
            setCategories(updated);
            onCategoriesChange();
            message.success(
              "Category deleted and transactions moved to 'Other'."
            );
          } catch (error) {
            console.error("Failed to update transactions:", error);
            message.error(
              "Failed to update some transactions. Please try again."
            );
          }
        },
      });
    } else {
      const updated = deleteCategory(category);
      setCategories(updated);
      onCategoriesChange();
      message.success("Category deleted successfully.");
    }
  };

  return (
    <Modal
      title="Manage Categories"
      open={true}
      onCancel={onClose}
      footer={
        <Button onClick={onClose} id="close-category-manager-done-btn">
          Done
        </Button>
      }
      width={500}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Add New Category */}
        <div>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            Add New Category
          </Text>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onPressEnter={handleAddCategory}
              placeholder="Category name"
              id="new-category-input"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
              disabled={
                !newCategory.trim() || categories.includes(newCategory.trim())
              }
              id="add-category-btn"
            >
              Add
            </Button>
          </Space.Compact>
        </div>

        {/* Category List */}
        <div>
          <Text strong style={{ display: "block", marginBottom: 12 }}>
            Existing Categories
          </Text>
          <List
            dataSource={categories}
            renderItem={(category) => {
              const transactionCount = transactions.filter(
                (t) => t.category === category
              ).length;
              const isOther = category === "Other";

              return (
                <List.Item
                  actions={
                    !isOther
                      ? [
                          <Popconfirm
                            key="delete"
                            title={`Delete "${category}"?`}
                            description={
                              transactionCount > 0
                                ? `All ${transactionCount} transaction(s) will be moved to "Other".`
                                : "This category will be permanently deleted."
                            }
                            onConfirm={() => handleDeleteCategory(category)}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                          >
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              id={`delete-category-${category.toLowerCase()}-btn`}
                            />
                          </Popconfirm>,
                        ]
                      : [
                          <Text
                            key="cannot-delete"
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            Cannot delete
                          </Text>,
                        ]
                  }
                >
                  <List.Item.Meta
                    title={category}
                    description={`${transactionCount} transaction${
                      transactionCount !== 1 ? "s" : ""
                    }`}
                  />
                </List.Item>
              );
            }}
            style={{ maxHeight: 300, overflowY: "auto" }}
          />
        </div>
      </Space>
    </Modal>
  );
};
