import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Alert,
} from '@cloudscape-design/components';
import { storeService } from '../../../services/storeService';

interface StoreCreateFolderModalProps {
  visible: boolean;
  bucketName: string;
  currentPrefix: string;
  onClose: () => void;
  onSuccess: (folderPath: string) => void;
}

export const StoreCreateFolderModal: React.FC<StoreCreateFolderModalProps> = ({
  visible,
  bucketName,
  currentPrefix,
  onClose,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFolderName('');
      setCreating(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const sanitized = folderName.trim();
  const hasSlash = sanitized.includes('/');
  const isValid = sanitized.length > 0 && !hasSlash;
  const targetPath = `${currentPrefix}${sanitized}/`;

  const handleCreate = async () => {
    if (!isValid) return;

    setCreating(true);
    setErrorMessage(null);

    try {
      await storeService.createFolder(bucketName, targetPath);
      onSuccess(targetPath);
      onClose();
    } catch (err: any) {
      console.error('Folder creation failed:', err);
      setErrorMessage(err.message || 'Failed to create folder in bucket.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={() => {
        if (!creating) onClose();
      }}
      header="Create folder"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!isValid || creating}
            >
              Create folder
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {errorMessage && (
          <Alert type="error" dismissible onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        <Box variant="p" color="text-body-secondary">
          Folders are zero-byte marker objects with a trailing slash (<code>/</code>) that organize your S3 keys into a virtual hierarchy.
        </Box>

        <FormField
          label="Folder name"
          description="Folder names cannot contain the forward slash character ('/')."
          errorText={hasSlash ? "Folder names cannot contain forward slashes ('/')." : undefined}
        >
          <Input
            value={folderName}
            onChange={({ detail }) => setFolderName(detail.value)}
            placeholder="e.g. documents or images"
            disabled={creating}
          />
        </FormField>

        {sanitized && !hasSlash && (
          <Box variant="p" color="text-body-secondary">
            Resulting S3 key prefix: <code>{targetPath}</code>
          </Box>
        )}
      </SpaceBetween>
    </Modal>
  );
};
