//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  Box,
  BoxProps,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  colors,
  useTheme
} from '@mui/material';

import { MessengerModel } from '@dxos/messenger-model';
import { useClient } from '@dxos/react-client';
import { TextModel } from '@dxos/text-model';

import { panels } from './panels';

interface ContentBoxProps extends BoxProps {
  selected?: boolean
}

export const App = () => {
  const theme = useTheme();
  const client = useClient();
  const [selected, setSelected] = useState(panels[0].items[0].id);

  // TODO(burdon): Factor out.
  useEffect(() => {
    client.registerModel(TextModel);
    client.registerModel(MessengerModel);
  }, [client]);

  const handleListItemClick = (event: any, index: string) => {
    setSelected(index);
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      flexGrow: 1,
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Box sx={{
        flexShrink: 0,
        width: 140,
        backgroundColor: colors.grey[100],
        borderRight: '1px solid',
        borderRightColor: 'divider',
        overflowY: 'auto'
      }}>
        <List dense disablePadding>
          {panels.map(({ title, items = [] }) => (
            <div key={title}>
              <ListItem>
                <ListItemText primary={title} />
              </ListItem>
              {items.map(({ id, title, icon: Icon }) => (
                <ListItemButton
                  key={id}
                  selected={selected === id}
                  onClick={(event) => handleListItemClick(event, id)}
                >
                  <ListItemIcon sx={{
                    '&.MuiListItemIcon-root': {
                      color: (selected === id) ? theme.palette.secondary.main : '',
                      minWidth: 36
                    }
                  }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    style={{ whiteSpace: 'nowrap' }}
                    primary={title}
                  />
                </ListItemButton>
              ))}
              <Divider />
            </div>
          ))}
        </List>
      </Box>

      <Box sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {panels.map(({ items = [] }) =>
          items.map(({ id, panel: Panel }) => (
            <Box
              key={id}
              sx={{
                display: (selected === id) ? 'flex' : 'none',
                flex: 1,
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              <Panel />
            </Box>
          )
        ))}
      </Box>
    </Box>
  );
};
