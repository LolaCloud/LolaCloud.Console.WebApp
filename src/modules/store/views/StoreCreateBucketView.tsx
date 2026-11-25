import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Checkbox,
  RadioGroup,
  Box,
  Alert,
  Form,
  KeyValuePairs,
} from '@cloudscape-design/components';
import { storeService } from '../../../services/storeService';

export function validateBucketName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Bucket name must not be empty.' };
  }
  if (name.length < 3) {
    return { isValid: false, error: 'Bucket name must be at least 3 characters long.' };
  }
  if (name.length > 63) {
    return { isValid: false, error: 'Bucket name must not exceed 63 characters.' };
  }
  if (!/^[a-z0-9]/.test(name)) {
    return { isValid: false, error: 'Bucket name must start with a lowercase letter or number.' };
  }
  if (!/[a-z0-9]$/.test(name)) {
    return { isValid: false, error: 'Bucket name must end with a lowercase letter or number.' };
  }
  if (/[A-Z]/.test(name)) {
    return { isValid: false, error: 'Bucket name must contain only lowercase letters.' };
  }
  if (/[_]/.test(name)) {
    return { isValid: false, error: 'Bucket name must not contain underscores.' };
  }
  if (/\.\./.test(name)) {
    return { isValid: false, error: 'Bucket name must not contain consecutive periods.' };
  }
  if (!/^[a-z0-9.-]+$/.test(name)) {
    return { isValid: false, error: 'Bucket name can only contain lowercase letters, numbers, hyphens, and periods.' };
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
    return { isValid: false, error: 'Bucket name must not be formatted as an IP address.' };
  }
  return { isValid: true };
}

export const StoreCreateBucketView: React.FC = () => {
  const navigate = useNavigate();

  const [bucketName, setBucketName] = useState('');
  const [blockPublicAccess, setBlockPublicAccess] = useState(true);
  const [versioning, setVersioning] = useState<'disabled' | 'enabled'>('disabled');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validation = validateBucketName(bucketName);
  const isFormValid = validation.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await storeService.createBucket({
        name: bucketName.trim(),
        region: 'lola-local',
        accessPolicy: blockPublicAccess ? 'PRIVATE' : 'PUBLIC_READ',
        versioningEnabled: versioning === 'enabled',
      });
      navigate(`/store/buckets/${created.name || bucketName.trim()}`);
    } catch (err: any) {
      console.error('Bucket creation failed:', err);
      setSubmitError(err.message || 'Failed to create bucket. Please verify that the name is unique.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={() => navigate('/store/buckets')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
            >
              Create bucket
            </Button>
          </SpaceBetween>
        }
        errorText={submitError}
      >
        <SpaceBetween size="l">
          <Header
            variant="h1"
            description="Buckets are containers for data stored in Lola Store S3. To store data, you must first create a bucket with a globally unique name."
          >
            Create bucket
          </Header>

          {/* Container 1: General configuration */}
          <Container
            header={
              <Header
                variant="h2"
                description="Specify the bucket name"
              >
                General configuration
              </Header>
            }
          >
            <SpaceBetween size="l">
              <FormField
                label="Bucket name"
                description="Bucket name must be unique within Lola Store and must start with a lowercase letter or number. Bucket name must be between 3 and 63 characters long and can contain only lowercase letters, numbers, and hyphens."
                errorText={touched && !validation.isValid ? validation.error : undefined}
                constraintText="3-63 characters, lowercase letters, numbers, hyphens, and periods. No consecutive periods."
              >
                <Input
                  value={bucketName}
                  onChange={({ detail }) => {
                    setBucketName(detail.value.toLowerCase());
                    setTouched(true);
                  }}
                  onBlur={() => setTouched(true)}
                  placeholder="my-storage-bucket"
                  disabled={isSubmitting}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          {/* Container 2: Block Public Access settings */}
          <Container
            header={
              <Header
                variant="h2"
                description="Block Public Access settings ensure that public access to your bucket and its objects is blocked."
              >
                Block Public Access settings for this bucket
              </Header>
            }
          >
            <SpaceBetween size="m">
              <Checkbox
                checked={blockPublicAccess}
                onChange={({ detail }) => setBlockPublicAccess(detail.checked)}
                disabled={isSubmitting}
              >
                <strong>Block all public access</strong>
              </Checkbox>

              <Box variant="p" color="text-body-secondary">
                Turning on this setting prevents anonymous read access. Objects can only be retrieved using authenticated Lola API tokens or cryptographically generated pre-signed URLs.
              </Box>

              {!blockPublicAccess && (
                <Alert type="warning" header="Public read access enabled">
                  Turning off block public access allows anyone on the network to read objects stored in this bucket without authentication.
                </Alert>
              )}
            </SpaceBetween>
          </Container>

          {/* Container 3: Bucket Versioning */}
          <Container
            header={
              <Header
                variant="h2"
                description="Versioning is a means of keeping multiple variants of an object in the same bucket. You can use versioning to preserve, retrieve, and restore every version of every object stored in your bucket."
              >
                Bucket Versioning
              </Header>
            }
          >
            <FormField label="Bucket Versioning">
              <RadioGroup
                value={versioning}
                onChange={({ detail }) => setVersioning(detail.value as 'disabled' | 'enabled')}
                items={[
                  {
                    value: 'disabled',
                    label: 'Disable',
                    description: 'Never retain multiple versions of an object in this bucket.',
                  },
                  {
                    value: 'enabled',
                    label: 'Enable',
                    description: 'Keep multiple versions of an object to protect against accidental overwrite or deletion.',
                  },
                ]}
              />
            </FormField>
          </Container>

          {/* Container 4: Default encryption */}
          <Container
            header={
              <Header
                variant="h2"
                description="Server-side encryption is automatically applied to new objects stored in this bucket."
              >
                Default encryption
              </Header>
            }
          >
            <KeyValuePairs
              columns={2}
              items={[
                {
                  label: 'Encryption type',
                  value: 'Server-side encryption with Amazon S3 managed keys (SSE-S3 AES-256)',
                },
                {
                  label: 'Bucket Key',
                  value: 'Enabled',
                },
              ]}
            />
          </Container>
        </SpaceBetween>
      </Form>
    </form>
  );
};
