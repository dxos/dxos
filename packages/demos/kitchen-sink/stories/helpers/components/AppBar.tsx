//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import {
  Download as DownloadIcon,
  ExpandMore as OpenIcon,
  ExpandLess as CloseIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { AppBar as MuiAppBar, Box, IconButton, Menu, MenuItem, ToggleButton, Toolbar } from '@mui/material';

import { SelectionEditor } from '@dxos/react-client-testing';

import { Searchbar } from '../../../src';
import { ViewSelector } from './ViewSelector';

interface AppBarProps {
  view: string
  onInvite?: () => void
  onExport?: (ipfs?: boolean) => void
  onSearch?: (search: string) => void
  onSelection?: (selection: string) => void
  onChangeView: (view: string) => void
}

export const AppBar = ({
  view,
  onInvite,
  onExport,
  onSearch,
  onSelection,
  onChangeView
}: AppBarProps) => {
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState<HTMLElement | undefined>();

  const handleExport = (ipfs: boolean) => {
    onExport!(ipfs);
    setExportMenuAnchorEl(undefined);
  };

  return (
    <>
      <MuiAppBar>
        <Toolbar>
          <ToggleButton
            data-id='test-button-selection'
            size='small'
            value='check'
            selected={advanced}
            onChange={() => setAdvanced(!advanced)}
            sx={{ marginRight: 2 }}
          >
            {advanced ? <CloseIcon /> : <OpenIcon />}
          </ToggleButton>

          <Box sx={{ display: 'flex', flex: 1, marginRight: 2 }}>
            {onSearch && !advanced && (
              <Searchbar
                onChange={onSearch}
              />
            )}

            {onSelection && advanced && (
              <Box sx={{
                position: 'relative',
                display: 'flex',
                flex: 1,
                marginTop: '-28px'
              }}>
                <Box sx={{
                  position: 'absolute',
                  width: '100%',
                  backgroundColor: 'white'
                }}>
                  <SelectionEditor
                    onChange={onSelection}
                  />
                </Box>
              </Box>
            )}
          </Box>

          <ViewSelector
            value={view}
            onChange={(view: string) => onChangeView(view)}
          />

          <Box sx={{
            marginLeft: 2
          }}>
            {onExport && (
              <>
                <IconButton
                  data-id='test-button-export'
                  size='small'
                  onClick={(e) => setExportMenuAnchorEl(e.currentTarget)}
                >
                  <DownloadIcon />
                </IconButton>
                <Menu
                  open={Boolean(exportMenuAnchorEl)}
                  anchorEl={exportMenuAnchorEl}
                  onClose={() => setExportMenuAnchorEl(undefined)}
                >
                  <MenuItem onClick={() => handleExport(false)}>Export to File</MenuItem>
                  <MenuItem onClick={() => handleExport(true)}>Export to IPFS</MenuItem>
                </Menu>
              </>
            )}

            {onInvite && (
              <IconButton
                data-id='test-button-share'
                size='small'
                onClick={onInvite}
              >
                <ShareIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </MuiAppBar>

      <Toolbar />
    </>
  );
};
