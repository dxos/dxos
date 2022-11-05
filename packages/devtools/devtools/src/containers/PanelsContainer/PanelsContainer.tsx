//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import {
  Box,
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
import { useClient, useClientServices } from '@dxos/react-client';
import { TextModel } from '@dxos/text-model';

export type SectionItem = {
  id: string;
  title: string;
  icon: ReactNode;
  panel: ReactNode;
};

export type Section = {
  title: string;
  items: SectionItem[];
};

export const PanelsContainer = ({ sections }: { sections: Section[] }) => {
  const theme = useTheme();
  const client = useClient();
  const [selected, setSelected] = useState(sections[0]?.items[0]?.id);
  const services = useClientServices();
  if (!services) {
    return null;
  }

  // TODO(burdon): Factor out.
  // TODO(wittjosiah): Should this only be done in the app?
  useEffect(() => {
    client.echo.registerModel(TextModel);
    client.echo.registerModel(MessengerModel);
  }, [client]);

  useEffect(() => {
    void services.TracingService.setTracingOptions({ enable: true });
    return () => {
      void services.TracingService.setTracingOptions({ enable: false });
    };
  }, [client]);

  const handleListItemClick = (event: any, index: string) => {
    setSelected(index);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexGrow: 1,
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 140,
          backgroundColor: colors.grey[100],
          borderRight: '1px solid',
          borderRightColor: 'divider',
          overflowY: 'auto'
        }}
      >
        <List dense disablePadding>
          {sections.map(({ title, items = [] }) => (
            <div key={title}>
              <ListItem>
                <ListItemText primary={title} />
              </ListItem>
              {items.map(({ id, title, icon }) => (
                <ListItemButton key={id} selected={selected === id} onClick={(event) => handleListItemClick(event, id)}>
                  <ListItemIcon
                    sx={{
                      '&.MuiListItemIcon-root': {
                        color: selected === id ? theme.palette.secondary.main : '',
                        minWidth: 36
                      }
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText style={{ whiteSpace: 'nowrap' }} primary={title} />
                </ListItemButton>
              ))}
              <Divider />
            </div>
          ))}
        </List>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        {sections.map(({ items = [] }) =>
          items.map(({ id, panel }) => (
            <Box
              key={id}
              sx={{
                display: selected === id ? 'flex' : 'none',
                flex: 1,
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              {panel}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
