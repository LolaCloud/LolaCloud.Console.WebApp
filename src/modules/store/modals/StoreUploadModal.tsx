import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  FileUpload,
  ProgressBar,
  Alert,
} from '@cloudscape-design/components';
import { storeService, formatBytes } from '../../../services/storeService';

interface StoreUploadModalProps {
  visible: boolean;
  bucketName: string;
  currentPrefix: string;
  onClose: () => void;
  onSuccess: (uploadedKey: string) => void;
}

export const StoreUploadModal: React.FC<StoreUploadModalProps> = ({
  visible,
  bucketName,
  currentPrefix,
  onClose,
  onSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [targetKey, setTargetKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedFiles([]);
      setTargetKey('');
      setUploading(false);
      setProgress(0);
      setErrorMessage(null);
    }
  }, [visible]);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
    setErrorMessage(null);
    if (files.length > 0) {
      const file = files[0];
      const defaultKey = `${currentPrefix}${file.name}`;
      setTargetKey(defaultKey);
    } else {
      setTargetKey('');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !targetKey.trim()) return;
    const file = selectedFiles[0];

    setUploading(true);
    setProgress(0);
    setErrorMessage(null);

    try {
      await storeService.uploadFileDirect(bucketName, targetKey.trim(), file, (pct) => {
        setProgress(pct);
      });
      onSuccess(targetKey.trim());
      onClose();
    } catch (err: any) {
      console.error('File upload failed:', err);
      setErrorMessage(err.message || 'Direct upload to S3 failed. Please verify MinIO credentials and connectivity.');
    } finally {
      setUploading(false);
    }
  };

  const selectedFile = selectedFiles.length > 0 ? selectedFiles[0] : null;

  return (
    <Modal
      visible={visible}
      onDismiss={() => {
        if (!uploading) onClose();
      }}
      header="Upload object"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              loading={uploading}
              disabled={!selectedFile || !targetKey.trim() || uploading}
            >
              Upload
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
          Upload a file directly to bucket <strong>{bucketName}</strong> using an AWS S3 pre-signed PUT URL.
        </Box>

        <FormField
          label="Select file"
          description="Drag and drop or browse for a file to upload to this bucket."
        >
          <FileUpload
            onChange={({ detail }) => handleFilesChange(detail.value)}
            value={selectedFiles}
            i18nStrings={{
              uploadButtonText: (multiple) => (multiple ? 'Choose files' : 'Choose file'),
              dropzoneText: (multiple) => (multiple ? 'Drop files to upload' : 'Drop file to upload'),
              removeFileAriaLabel: (_index, fileName) => `Remove ${fileName}`,
              limitShowFewer: 'Show fewer files',
              limitShowMore: 'Show more files',
              errorIconAriaLabel: 'Error',
              warningIconAriaLabel: 'Warning',
            }}
            showFileSize
            showFileLastModified
            constraintText="Any binary or text file supported. Uploaded directly via S3 pre-signed URL."
          />
        </FormField>

        {selectedFile && (
          <>
            <FormField
              label="Destination key / Path"
              description="The full S3 object key inside the bucket (including virtual folders)."
            >
              <Input
                value={targetKey}
                onChange={({ detail }) => setTargetKey(detail.value)}
                placeholder="folder/subfolder/filename.ext"
                disabled={uploading}
              />
            </FormField>

            <Box variant="awsui-key-label">File details</Box>
            <Box variant="p" color="text-body-secondary">
              Name: <code>{selectedFile.name}</code> &bull; Size: <strong>{formatBytes(selectedFile.size)}</strong> &bull; Type: <code>{selectedFile.type || 'application/octet-stream'}</code>
            </Box>
          </>
        )}

        {uploading && (
          <ProgressBar
            value={progress}
            label="Uploading file to S3..."
            description={`${progress}% completed`}
            status={progress === 100 ? 'success' : 'in-progress'}
          />
        )}
      </SpaceBetween>
    </Modal>
  );
};
