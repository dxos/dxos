//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Download as DownloadIcon } from '@mui/icons-material';
import { IconButton, Menu, MenuItem } from '@mui/material';

export enum ExportAction {
  EXPORT_FILE = 1,
  EXPORT_IPFS = 2
}

interface ExportMenuProps {
  onExport?: (type: ExportAction) => void;
}

export const ExportMenu = ({ onExport }: ExportMenuProps) => {
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState<HTMLElement | undefined>();

  const handleExport = (action: ExportAction) => {
    setExportMenuAnchorEl(undefined);
    onExport!(action);
  };

  return (
    <>
      <IconButton
        data-id='test-button-export'
        size='small'
        onClick={(event) => setExportMenuAnchorEl(event.currentTarget)}
      >
        <DownloadIcon />
      </IconButton>

      <Menu
        open={Boolean(exportMenuAnchorEl)}
        anchorEl={exportMenuAnchorEl}
        onClose={() => setExportMenuAnchorEl(undefined)}
      >
        <MenuItem onClick={() => handleExport(ExportAction.EXPORT_FILE)}>Export to File</MenuItem>
        <MenuItem onClick={() => handleExport(ExportAction.EXPORT_IPFS)}>Export to IPFS</MenuItem>
      </Menu>
    </>
  );
};
