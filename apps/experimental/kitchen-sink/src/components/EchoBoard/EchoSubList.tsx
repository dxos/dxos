//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Add as AddIcon } from '@mui/icons-material';
import { colors, Box, IconButton, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemID } from '@dxos/protocols';
import { ItemAdapter } from '@dxos/react-client-testing';

import { CreateItemDialog } from '../CreateItem';

export interface EchoChildListProps {
  item: Item<ObjectModel>
  itemAdapter: ItemAdapter
  type: string
  onCreateItem?: (type: string, title: string, parent?: ItemID) => void
}

export const EchoSubList = ({
  item,
  itemAdapter,
  type,
  onCreateItem
}: EchoChildListProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const { plural, color, icon: Icon } = itemAdapter.meta?.(type) ?? {};

  return (
    <>
      {showDialog && (
        <CreateItemDialog
          open
          type={type}
          itemAdapter={itemAdapter}
          onCreate={(title: string) => {
            onCreateItem?.(type, title, item.id);
            setShowDialog(false);
          }}
          onCancel={() => setShowDialog(false)}
        />
      )}

      <Box key={type}>
        <Box sx={{
          display: 'flex',
          flex: 1,
          alignItems: 'center'
        }}>
          <Typography sx={{
            flex: 1,
            color: colors.blue[700],
            fontVariant: 'all-petite-caps'
          }}>
            {plural}
          </Typography>
          {onCreateItem && (
            <IconButton
              size='small'
              onClick={() => setShowDialog(true)}
            >
              <AddIcon />
            </IconButton>
          )}
        </Box>
        <List
          dense
          disablePadding
        >
          {itemAdapter.linkedItems?.(item, type).map((item) => (
            <ListItem
              key={item.id}
              dense
              disableGutters
              sx={{ py: 0, height: 26, minHeight: 26 }}
            >
              {Icon && (
                <ListItemIcon sx={{ minWidth: 36, color: color[500] }}>
                  <Icon />
                </ListItemIcon>
              )}
              <ListItemText
                primary={itemAdapter.title(item)}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: 'light',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </>
  );
};
