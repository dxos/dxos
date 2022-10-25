//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Upload as UploadIcon } from '@mui/icons-material';
import { IconButton, Menu, MenuItem } from '@mui/material';

import { useMounted } from '@dxos/react-async';
import { FileUploadDialog } from '@dxos/react-components';

// TODO(burdon): Move to react-components?
import { ImportIpfsDialog } from './ImportIpfsDialog';

enum ShowDialog {
  IMPORT_FILE,
  IMPORT_IPFS
}

export interface ImportMenuProps {
  onImport?: (file: File | string) => void;
}

/**
 * Dialog to create, join, or import party.
 */
export const ImportMenu = ({ onImport }: ImportMenuProps) => {
  const [inProgress, setInProgress] = useState(false);
  const [showDialog, setShowDialog] = useState<ShowDialog | undefined>();
  const [importMenuAnchorEl, setImportMenuAnchorEl] = useState<HTMLElement | undefined>();
  const isMounted = useMounted();

  const handleImport = async (file: File[] | string) => {
    setInProgress(true);
    try {
      await onImport!(typeof file === 'string' ? file : file[0]);
    } finally {
      if (isMounted()) {
        setInProgress(false);
      }
    }
  };

  return (
    <>
      <IconButton
        data-id='test-button-import'
        size='small'
        disabled={inProgress}
        onClick={(event) => setImportMenuAnchorEl(event.currentTarget)}
      >
        <UploadIcon />
      </IconButton>

      <Menu
        open={Boolean(importMenuAnchorEl)}
        anchorEl={importMenuAnchorEl}
        onClose={() => setImportMenuAnchorEl(undefined)}
      >
        <MenuItem
          onClick={() => {
            setImportMenuAnchorEl(undefined);
            setShowDialog(ShowDialog.IMPORT_FILE);
          }}
        >
          Import from File
        </MenuItem>
        <MenuItem
          onClick={() => {
            setImportMenuAnchorEl(undefined);
            setShowDialog(ShowDialog.IMPORT_IPFS);
          }}
        >
          Import from IPFS
        </MenuItem>
      </Menu>

      <FileUploadDialog
        open={showDialog === ShowDialog.IMPORT_FILE}
        multiple={false}
        onClose={() => setShowDialog(undefined)}
        onUpload={handleImport}
      />

      <ImportIpfsDialog
        open={showDialog === ShowDialog.IMPORT_IPFS}
        onClose={() => setShowDialog(undefined)}
        onImport={handleImport}
      />
    </>
  );
};
