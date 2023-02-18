//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { ExpandMore as OpenIcon, ExpandLess as CloseIcon, Share as ShareIcon } from '@mui/icons-material';
import { AppBar as MuiAppBar, Box, IconButton, ToggleButton, Toolbar } from '@mui/material';

import { ExportAction, ExportMenu, SelectionEditor } from '@dxos/react-client-testing';

import { Searchbar } from '../Searchbar';
import { ViewSelector } from '../View';

interface AppBarProps {
  view: string;
  onInvite?: () => void;
  onExport?: (type: ExportAction) => void;
  onSearch?: (search: string) => void;
  onSelection?: (selection: string) => void;
  onChangeView: (view: string) => void;
}

export const AppBar = ({ view, onInvite, onExport, onSearch, onSelection, onChangeView }: AppBarProps) => {
  const [advanced, setAdvanced] = useState<boolean>(false);

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
            {onSearch && !advanced && <Searchbar onChange={onSearch} />}

            {onSelection && advanced && (
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flex: 1,
                  marginTop: '-28px'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    backgroundColor: 'white'
                  }}
                >
                  <SelectionEditor onChange={onSelection} />
                </Box>
              </Box>
            )}
          </Box>

          <ViewSelector value={view} onChange={(view: string) => onChangeView(view)} />

          <Box
            sx={{
              marginLeft: 2
            }}
          >
            {onExport && <ExportMenu onExport={onExport} />}

            {onInvite && (
              <IconButton data-id='test-button-share-space' size='small' onClick={onInvite}>
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
