//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import {
  ExpandMore as OpenIcon,
  ExpandLess as CloseIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { AppBar as MuiAppBar, Box, IconButton, ToggleButton, Toolbar } from '@mui/material';

import { Searchbar, SelectionEditor } from '../../../src';
import { ViewSelector } from './ViewSelector';

interface AppBarProps {
  view: string
  onInvite?: () => void
  onSearch?: (search: string) => void
  onSelection?: (selection: string) => void
  onChangeView: (view: string) => void
}

export const AppBar = ({
  view,
  onInvite,
  onSearch,
  onSelection,
  onChangeView
}: AppBarProps) => {
  const [advanced, setAdvanced] = useState<boolean>(false);

  return (
    <>
      <MuiAppBar>
        <Toolbar>
          <ToggleButton
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

          {onInvite && (
            <IconButton
              data-id='test-button-share'
              size='small'
              sx={{ marginLeft: 2 }}
              onClick={onInvite}
            >
              <ShareIcon />
            </IconButton>
          )}
        </Toolbar>
      </MuiAppBar>

      <Toolbar />
    </>
  );
};
