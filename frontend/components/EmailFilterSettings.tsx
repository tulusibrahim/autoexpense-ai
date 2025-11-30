import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  App,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { api } from "../services/api";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface EmailFilterSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const EmailFilterSettings: React.FC<EmailFilterSettingsProps> = ({
  open,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await api.getEmailFilterSettings();
      form.setFieldsValue({
        fromEmail: settings.fromEmail || "",
        subjectKeywords: settings.subjectKeywords || "",
        hasAttachment: settings.hasAttachment || false,
        label: settings.label || "",
        customQuery: settings.customQuery || "",
      });
    } catch (error) {
      console.error("Failed to load email filter settings:", error);
      message.error("Failed to load email filter settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.saveEmailFilterSettings({
        fromEmail: values.fromEmail || undefined,
        subjectKeywords: values.subjectKeywords || undefined,
        hasAttachment: values.hasAttachment || false,
        label: values.label || undefined,
        customQuery: values.customQuery || undefined,
      });
      message.success("Email filter settings saved successfully");
      onClose();
    } catch (error) {
      console.error("Failed to save email filter settings:", error);
      message.error("Failed to save email filter settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Email Filter Settings"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            id="save-email-filter-settings-btn"
          >
            Save Settings
          </Button>
        </Space>
      }
      width={700}
      loading={loading}
    >
      <Alert
        message="Configure how emails are filtered when scanning your inbox"
        description="You can filter by sender, subject keywords, attachments, labels, or use a custom Gmail query. Leave fields empty to use defaults."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical">
        <Title level={5}>Basic Filters</Title>
        <Form.Item
          label="From Email"
          name="fromEmail"
          tooltip="Filter emails from a specific sender (e.g., noreply@bank.com)"
        >
          <Input
            placeholder="noreply.livin@bankmandiri.co.id"
            id="email-filter-from-input"
          />
        </Form.Item>

        <Form.Item
          label="Subject Keywords"
          name="subjectKeywords"
          tooltip="Comma-separated keywords to search in email subjects (e.g., receipt, invoice, payment)"
        >
          <Input
            placeholder="receipt, invoice, payment, order"
            id="email-filter-subject-input"
          />
        </Form.Item>

        <Form.Item
          label="Has Attachment"
          name="hasAttachment"
          valuePropName="checked"
          tooltip="Only include emails with attachments"
        >
          <Switch id="email-filter-attachment-switch" />
        </Form.Item>

        <Form.Item
          label="Gmail Label"
          name="label"
          tooltip="Filter by Gmail label (e.g., IMPORTANT, INBOX)"
        >
          <Input placeholder="INBOX" id="email-filter-label-input" />
        </Form.Item>

        <Divider />

        <Title level={5}>Advanced</Title>
        <Form.Item
          label="Custom Gmail Query"
          name="customQuery"
          tooltip="Use a custom Gmail search query. This will override all other filters. See Gmail search operators for syntax."
        >
          <TextArea
            rows={3}
            placeholder="from:noreply@bank.com subject:(receipt OR invoice)"
            id="email-filter-custom-query-input"
          />
        </Form.Item>

        <Alert
          message="Gmail Query Examples"
          description={
            <div style={{ fontSize: 12 }}>
              <div>
                <strong>from:</strong> sender@example.com
              </div>
              <div>
                <strong>subject:</strong> (receipt OR invoice)
              </div>
              <div>
                <strong>has:</strong> attachment
              </div>
              <div>
                <strong>label:</strong> IMPORTANT
              </div>
              <div>
                <strong>Combined:</strong> from:bank@example.com subject:receipt
                has:attachment
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Form>
    </Modal>
  );
};
