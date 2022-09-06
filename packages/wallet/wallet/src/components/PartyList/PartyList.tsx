//
// Copyright 2021 DXOS.org
//

import React, { FunctionComponent } from 'react';

import {
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  List as MuiList,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  styled,
  useTheme
} from '@mui/material';

import { Party } from '@dxos/client';
import { PublicKey } from '@dxos/protocols';
import { HashIcon } from '@dxos/react-components';
import { humanize } from '@dxos/util';

// TODO(burdon): Factor out.
const List = styled(MuiList)({
  paddingTop: 0,
  paddingBottom: 0,
  '& .MuiListItemSecondaryAction-root': {
    visibility: 'hidden'
  },
  '& .MuiListItem-root:hover': {
    '& .MuiListItemSecondaryAction-root': {
      visibility: 'visible'
    }
  }
});

export interface PartyListProps {
  parties?: Array<Party>
  selected?: PublicKey
  actionIcon?: FunctionComponent<any>
  onSelect?: (party: PublicKey) => void
  onAction?: (party: PublicKey, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

export const PartyList = ({
  parties = [],
  selected,
  actionIcon: ActionIcon = SettingsIcon,
  onSelect,
  onAction
}: PartyListProps) => {
  const theme = useTheme();

  return (
    <List>
      {parties.map((party) => {
        const title = party.properties.get('title') ?? humanize(party.key.toHex());

        return (
          <ListItem
            key={party.key.toString()}
            selected={selected && selected.equals(party.key)}
            secondaryAction={onAction && (
              <IconButton
                edge='end'
                size='small'
                title='Settings'
                onClick={event => onAction(party.key, event)}
              >
                <ActionIcon />
              </IconButton>
            )}
            disablePadding
          >
            <ListItemButton onClick={() => onSelect?.(party.key)}>
              <ListItemIcon sx={{ color: theme.palette.primary.dark }}>
                {/* TODO(wittjosiah): Custom party icons */}
                <HashIcon value={party.key.toHex()} />
              </ListItemIcon>
              <ListItemText
                primary={title}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};
