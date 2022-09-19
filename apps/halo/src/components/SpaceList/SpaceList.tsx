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

export interface SpaceListProps {
  spaces?: Array<Party>
  selected?: PublicKey
  actionIcon?: FunctionComponent<any>
  onSelect?: (space: PublicKey) => void
  onAction?: (space: PublicKey, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

export const SpaceList = ({
  spaces = [],
  selected,
  actionIcon: ActionIcon = SettingsIcon,
  onSelect,
  onAction
}: SpaceListProps) => {
  const theme = useTheme();

  return (
    <List>
      {spaces.map(space => {
        const title = space.properties.get('title') ?? humanize(space.key.toHex());

        return (
          <ListItem
            key={space.key.toString()}
            selected={selected && selected.equals(space.key)}
            secondaryAction={onAction && (
              <IconButton
                edge='end'
                size='small'
                title='Settings'
                onClick={event => onAction(space.key, event)}
              >
                <ActionIcon />
              </IconButton>
            )}
            disablePadding
          >
            <ListItemButton onClick={() => onSelect?.(space.key)}>
              <ListItemIcon sx={{ color: theme.palette.primary.dark }}>
                {/* TODO(wittjosiah): Custom space icons */}
                <HashIcon value={space.key.toHex()} />
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
