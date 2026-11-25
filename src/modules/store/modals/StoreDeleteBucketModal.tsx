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
import { storeService, isBucketProtected } from '../../../services/storeService';

interface StoreDeleteBucketModalProps {
  visible: boolean;
  bucketName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const StoreDeleteBucketModal: React.FC<StoreDeleteBucketModalProps> = ({
  visible,
  bucketName,
  onClose,
  onSuccess,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProtected = isBucketProtected(bucketName);

  useEffect(() => {
    if (visible) {
      setConfirmationInput('');
      setDeleting(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const isConfirmed = confirmationInput.trim() === bucketName;

  const handleDelete = async () => {
    if (!isConfirmed || isProtected) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      await storeService.deleteBucket(bucketName, true);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete bucket failed:', err);
      setErrorMessage(err.message || 'Failed to delete bucket.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={() => {
        if (!deleting) onClose();
      }}
      header="Delete bucket"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              loading={deleting}
              disabled={!isConfirmed || deleting || isProtected}
            >
              Delete bucket
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

        {isProtected && (
          <Alert type="warning">
            This bucket is protected as a system backup bucket and cannot be deleted.
          </Alert>
        )}

        <Alert type="error">
          Deleting a bucket is irreversible. All objects and folders inside <strong>{bucketName}</strong> will be permanently removed.
        </Alert>

        <Box variant="p">
          To confirm deletion, enter the name of the bucket below:
        </Box>

        <Box variant="code">
          {bucketName}
        </Box>

        <FormField label="Bucket name confirmation">
          <Input
            value={confirmationInput}
            onChange={({ detail }) => setConfirmationInput(detail.value)}
            placeholder={bucketName}
            disabled={deleting || isProtected}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
};
