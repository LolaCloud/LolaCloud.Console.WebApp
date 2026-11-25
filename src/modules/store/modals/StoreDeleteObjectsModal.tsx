import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  Alert,
} from '@cloudscape-design/components';
import { type StoreObject, storeService, formatBytes } from '../../../services/storeService';

interface StoreDeleteObjectsModalProps {
  visible: boolean;
  bucketName: string;
  objects: StoreObject[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StoreDeleteObjectsModal: React.FC<StoreDeleteObjectsModalProps> = ({
  visible,
  bucketName,
  objects,
  onClose,
  onSuccess,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [checkingFolders, setCheckingFolders] = useState(false);
  const [nonEmptyFolders, setNonEmptyFolders] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setErrorMessage(null);
      setNonEmptyFolders([]);
      return;
    }

    const folderObjects = objects.filter((o) => o.isFolder);
    if (folderObjects.length === 0) {
      setNonEmptyFolders([]);
      return;
    }

    let isMounted = true;
    setCheckingFolders(true);

    Promise.all(
      folderObjects.map(async (folder) => {
        try {
          const res = await storeService.listObjects(bucketName, folder.key);
          const hasItems =
            (res.objects && res.objects.length > 0) ||
            (res.commonPrefixes && res.commonPrefixes.length > 0);
          return hasItems ? (folder.name || folder.key) : null;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (isMounted) {
        const found = results.filter((name): name is string => Boolean(name));
        setNonEmptyFolders(found);
        setCheckingFolders(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visible, bucketName, objects]);

  const handleDelete = async () => {
    if (objects.length === 0 || nonEmptyFolders.length > 0) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      const keys = objects.map((o) => o.key);
      if (keys.length === 1) {
        await storeService.deleteObject(bucketName, keys[0]);
      } else {
        await storeService.deleteObjects(bucketName, keys);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete objects failed:', err);
      const apiMsg =
        err.response?.data?.data?.message ||
        err.response?.data?.message ||
        err.message ||
        'Falha ao excluir os itens selecionados.';
      setErrorMessage(apiMsg);
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
      header={`Delete ${objects.length === 1 ? 'object' : `${objects.length} objects`}`}
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
              disabled={objects.length === 0 || deleting || checkingFolders || nonEmptyFolders.length > 0}
            >
              Permanently delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {errorMessage && (
          <Alert type="error" header="Erro na exclusão" dismissible onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {nonEmptyFolders.length > 0 && (
          <Alert type="error" header="Não é possível excluir pasta com conteúdo">
            {nonEmptyFolders.length === 1
              ? `A pasta "${nonEmptyFolders[0]}" não pode ser excluída porque contém arquivos ou subpastas dentro dela. Remova todo o conteúdo antes de excluí-la.`
              : `As seguintes pastas não podem ser excluídas porque contêm arquivos ou subpastas dentro delas: ${nonEmptyFolders.join(', ')}. Remova todo o conteúdo antes de excluí-las.`}
          </Alert>
        )}

        {checkingFolders && (
          <Alert type="info">
            Verificando se a(s) pasta(s) selecionada(s) estão vazias...
          </Alert>
        )}

        <Alert type="warning">
          Permanently deleting these objects cannot be undone. All data associated with the selected items will be erased from the S3 storage engine.
        </Alert>

        <Box variant="p">
          Are you sure you want to delete the following {objects.length} item{objects.length === 1 ? '' : 's'} from bucket <strong>{bucketName}</strong>?
        </Box>

        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border-item-default)', borderRadius: '4px', padding: '8px 12px' }}>
          <SpaceBetween direction="vertical" size="xxs">
            {objects.map((obj) => (
              <Box key={obj.key} fontSize="body-s">
                <code>{obj.key}</code> {!obj.isFolder && <span style={{ color: 'var(--color-text-body-secondary)' }}>({formatBytes(obj.size)})</span>}
              </Box>
            ))}
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </Modal>
  );
};
