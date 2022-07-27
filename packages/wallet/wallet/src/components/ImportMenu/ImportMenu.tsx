//
// Copyright 2022 DXOS.org
//

import React, { FunctionComponent, useState } from 'react';

import { Upload as ImportIcon } from '@mui/icons-material';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';

import { Party } from '@dxos/client';

export interface ImportDialogProps {
  onClose: () => void
  onImport?: (party: Party) => Promise<void>
}

export type ImportOption = {
  name: string
  displayName?: string
  icon?: FunctionComponent<{}>
  dialog: FunctionComponent<ImportDialogProps>
}

export interface ImportMenuProps {
  options: ImportOption[]
  onImport?: (party: Party) => Promise<void>
}

/**
 * Menu for providing import options for a party.
 */
// TODO(wittjosiah): Consider factoring out menu items and maybe how to do sub-menus.
// TODO(wittjosiah): Factor out to protocols?
export const ImportMenu = ({ options, onImport }: ImportMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const [selected, setSelected] = useState<ImportOption>();

  return (
    <>
      <IconButton
        data-id='import-button'
        size='small'
        onClick={event => {
          if (options.length === 1) {
            setSelected(options[0]);
          } else {
            setAnchorEl(event.currentTarget);
          }
        }}
      >
        <ImportIcon />
      </IconButton>

      <Menu
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(undefined)}
      >
        {options.map(option => (
          <MenuItem
            key={option.name}
            onClick={() => {
              setAnchorEl(undefined);
              setSelected(option);
            }}
          >
            {option.icon && (
              <ListItemIcon>
                <option.icon />
              </ListItemIcon>
            )}
            <ListItemText>
              {option.displayName ?? option.name}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {selected && (
        <selected.dialog
          onClose={() => setSelected(undefined)}
          onImport={async party => {
            await onImport?.(party);
          }}
        />
      )}
    </>
  );
};
