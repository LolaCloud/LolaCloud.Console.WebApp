import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  KeyValuePairs,
  Tabs,
  Box,
  Flashbar,
  type FlashbarProps,
  StatusIndicator,
} from '@cloudscape-design/components';
import { resolveS3Endpoint } from '../../../services/storeService';

export const StoreAccessKeysView: React.FC = () => {
  const [showSecret, setShowSecret] = useState(false);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const endpoint = resolveS3Endpoint();

  const accessKeyId = 'lola_admin';
  const secretAccessKey = 'lola_admin_secret';

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setFlashMessages([
        {
          type: 'success',
          header: 'Copied to Clipboard',
          content: `${label}: ${text}`,
          dismissible: true,
          id: `copy-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Header
        variant="h1"
        description="Access keys are long-term credentials for an IAM user or the root account used to sign programmatic requests to the AWS S3-compatible API."
      >
        S3 API Credentials & Access Keys
      </Header>

      <Container
        header={
          <Header
            variant="h2"
            description="Cluster S3 Gateway connection endpoints and credentials"
            actions={
              <Button
                iconName={showSecret ? 'unlocked' : 'lock-private'}
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? 'Hide Secret Key' : 'Reveal Secret Key'}
              </Button>
            }
          >
            Active S3 Credentials
          </Header>
        }
      >
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: 'S3 API Endpoint',
              value: (
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <code>{endpoint}</code>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy endpoint"
                    onClick={() => handleCopy(endpoint, 'S3 API Endpoint')}
                  />
                </SpaceBetween>
              ),
            },
            {
              label: 'AWS Region',
              value: 'lola-local',
            },
            {
              label: 'Access Key ID',
              value: (
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <code>{accessKeyId}</code>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy Access Key ID"
                    onClick={() => handleCopy(accessKeyId, 'Access Key ID')}
                  />
                </SpaceBetween>
              ),
            },
            {
              label: 'Secret Access Key',
              value: (
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <code>{showSecret ? secretAccessKey : '••••••••••••••••••••'}</code>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy Secret Access Key"
                    onClick={() => handleCopy(secretAccessKey, 'Secret Access Key')}
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
        <div style={{ marginTop: '16px' }}>
          <StatusIndicator type="success">
            S3 SigV4 compatible &bull; MinIO Engine
          </StatusIndicator>
        </div>
      </Container>

      <Container
        header={
          <Header
            variant="h2"
            description="Quick setup examples for standard AWS SDKs and tools"
          >
            SDK & CLI Configuration
          </Header>
        }
      >
        <Tabs
          tabs={[
            {
              id: 'aws-cli',
              label: 'AWS CLI',
              content: (
                <div style={{ marginTop: '12px' }}>
                  <Box variant="p" color="text-body-secondary">
                    Configure the AWS CLI to connect to Lola Store:
                  </Box>
                  <pre
                    style={{
                      backgroundColor: 'var(--color-background-container-content, #1e1e1e)',
                      padding: '16px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontSize: '13px',
                    }}
                  >
{`# 1. Set credentials
export AWS_ACCESS_KEY_ID=${accessKeyId}
export AWS_SECRET_ACCESS_KEY=${secretAccessKey}
export AWS_DEFAULT_REGION=lola-local

# 2. List all buckets
aws --endpoint-url ${endpoint} s3 ls

# 3. Upload a file
aws --endpoint-url ${endpoint} s3 cp myfile.txt s3://my-bucket/myfile.txt`}
                  </pre>
                </div>
              ),
            },
            {
              id: 'nodejs',
              label: 'AWS SDK (Node.js)',
              content: (
                <div style={{ marginTop: '12px' }}>
                  <Box variant="p" color="text-body-secondary">
                    Using <code>@aws-sdk/client-s3</code>:
                  </Box>
                  <pre
                    style={{
                      backgroundColor: 'var(--color-background-container-content, #1e1e1e)',
                      padding: '16px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontSize: '13px',
                    }}
                  >
{`import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: '${endpoint}',
  region: 'lola-local',
  credentials: {
    accessKeyId: '${accessKeyId}',
    secretAccessKey: '${secretAccessKey}',
  },
  forcePathStyle: true,
});

const response = await s3.send(new ListObjectsV2Command({ Bucket: 'my-bucket' }));
console.log(response.Contents);`}
                  </pre>
                </div>
              ),
            },
            {
              id: 'python',
              label: 'Python (Boto3)',
              content: (
                <div style={{ marginTop: '12px' }}>
                  <Box variant="p" color="text-body-secondary">
                    Using <code>boto3</code>:
                  </Box>
                  <pre
                    style={{
                      backgroundColor: 'var(--color-background-container-content, #1e1e1e)',
                      padding: '16px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontSize: '13px',
                    }}
                  >
{`import boto3

s3 = boto3.client(
    's3',
    endpoint_url='${endpoint}',
    aws_access_key_id='${accessKeyId}',
    aws_secret_access_key='${secretAccessKey}',
    region_name='lola-local',
)

buckets = s3.list_buckets()
for b in buckets['Buckets']:
    print(b['Name'])`}
                  </pre>
                </div>
              ),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};
