import React, { useState } from "react";
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, Space, Radio } from "antd";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Transaction } from "../types";
import { formatNumber, parseFormattedNumber } from "../utils/format";
import { getCategories } from "../utils/categories";

dayjs.extend(customParseFormat);

const { TextArea } = Input;
const { Option } = Select;

interface EditModalProps {
  transaction: Transaction;
  onSave: (updated: Transaction) => void;
  onClose: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  transaction,
  onSave,
  onClose,
}) => {
  const [form] = Form.useForm();
  const categories = getCategories();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updated: Transaction = {
        ...transaction,
        merchant: values.merchant,
        amount: values.amount,
        date: values.date 
          ? dayjs(values.date).format("YYYY-MM-DD HH:mm:ss") 
          : transaction.date,
        category: values.category || "Other",
        summary: values.summary,
        type: values.type || "expense",
      };
      onSave(updated);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <Modal
      title="Edit Transaction"
      open={true}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} id="save-edit-btn">
            Save Changes
          </Button>
        </Space>
      }
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          merchant: transaction.merchant,
          amount: transaction.amount,
          date: transaction.date 
            ? dayjs(transaction.date, ["YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss"], true) 
            : null,
          category: transaction.category || "Other",
          summary: transaction.summary,
          type: transaction.type || "expense",
        }}
      >
        <Form.Item
          label="Merchant"
          name="merchant"
          rules={[{ required: true, message: "Please enter merchant name" }]}
        >
          <Input id="edit-merchant-input" />
        </Form.Item>

        <Form.Item
          label="Amount"
          name="amount"
          rules={[{ required: true, message: "Please enter amount" }]}
        >
          <InputNumber
            prefix="Rp"
            style={{ width: "100%" }}
            formatter={(value) => formatNumber(value || 0)}
            parser={(value) => parseFormattedNumber(value || "0")}
            id="edit-amount-input"
          />
        </Form.Item>

        <Form.Item
          label="Date & Time"
          name="date"
          rules={[{ required: true, message: "Please select date and time" }]}
        >
          <DatePicker 
            showTime 
            style={{ width: "100%" }} 
            format="YYYY-MM-DD HH:mm:ss" 
            id="edit-date-input" 
          />
        </Form.Item>

        <Form.Item
          label="Category"
          name="category"
        >
          <Select
            placeholder="Select category"
            allowClear
            id="edit-category-select"
          >
            {categories.map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Summary"
          name="summary"
          rules={[{ required: true, message: "Please enter summary" }]}
        >
          <TextArea rows={3} id="edit-summary-input" />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: "Please select type" }]}
        >
          <Radio.Group id="edit-type-radio">
            <Radio value="expense">Expense</Radio>
            <Radio value="income">Income</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};
