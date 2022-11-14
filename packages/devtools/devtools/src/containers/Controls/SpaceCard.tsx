//
// Copyright 2021 DXOS.org
//

import React, { ChangeEvent, useState } from 'react';

import {
  ArrowCircleRightOutlined as AddIcon,
  AddCircleOutline as RegisterIcon,
  MoreVert as MenuIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';

import { Space } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { CopyText, HashIcon } from '@dxos/react-components';
import { SpaceSharingDialog } from '@dxos/react-toolkit';

import { ModelType, modelTypes } from './models';

/**
 * Space controls.
 * @param space
 * @constructor
 */
export const SpaceCard = ({ space }: { space: Space }) => {
  const client = useClient();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [spaceSharing, setSpaceSharing] = useState(false);
  const [itemModel, setItemModel] = useState<ModelType | undefined>();
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');

  const handleSpaceOpenToggle = (space: Space) => {
    if (space.isOpen) {
      void space.open();
    } else {
      void space.close();
    }
  };

  const handleSpaceActiveToggle = (space: Space) => {
    void space.setActive(!space.isActive);
  };

  const handlePropertyKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyKey(event.target.value);
  };

  const handlePropertyValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyValue(event.target.value);
  };

  const handleSetSpaceProperty = (space: Space) => {
    const intValue: number = parseInt(propertyValue);
    if (!isNaN(intValue)) {
      void space.setProperty(propertyKey, intValue);
    } else {
      void space.setProperty(propertyKey, propertyValue);
    }
  };

  const handleItemModelChange = (event: SelectChangeEvent) => {
    setItemModel(event.target.value as ModelType);
  };

  const handleCreateItem = (space: Space) => {
    const { model, createItem } = (itemModel && modelTypes[itemModel]) || {};
    client.echo.modelFactory.registerModel(model); // TODO(burdon): Test if already registered.
    if (createItem) {
      createItem(space);
    }
  };

  return (
    <>
      <Menu open={Boolean(menuAnchorEl)} anchorEl={menuAnchorEl} onClose={() => setMenuAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            setSpaceSharing(true);
          }}
        >
          Share Space
        </MenuItem>
      </Menu>

      <SpaceSharingDialog open={spaceSharing} onClose={() => setSpaceSharing(false)} spaceKey={space.key} />

      <Card
        sx={{
          margin: 1
        }}
      >
        <CardHeader
          sx={{
            '.MuiCardHeader-avatar': {
              marginRight: 1
            },
            '.MuiCardHeader-action': {
              margin: 0
            }
          }}
          avatar={
            <IconButton>
              <HashIcon value={space.key.toString()} />
            </IconButton>
          }
          title={<CopyText value={space.key.toString()} monospace variant='h6' length={8} />}
          action={
            <IconButton onClick={(event) => setMenuAnchorEl(event.currentTarget)}>
              <MenuIcon />
            </IconButton>
          }
        />

        <CardContent
          sx={{
            paddingTop: 1
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'end',
              marginBottom: 2
            }}
          >
            <TextField
              label='Key'
              variant='standard'
              fullWidth
              sx={{ width: 200, marginRight: 1 }}
              value={propertyKey}
              onChange={handlePropertyKeyChange}
            />
            <TextField
              label='Value'
              variant='standard'
              fullWidth
              value={propertyValue}
              onChange={handlePropertyValueChange}
            />
            <Box>
              <IconButton size='small' onClick={() => handleSetSpaceProperty(space)}>
                <AddIcon />
              </IconButton>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'end',
              marginBottom: 2
            }}
          >
            <FormControl fullWidth variant='standard'>
              <InputLabel id='model-select'>Model</InputLabel>
              <Select label='Item Model' variant='standard' value={itemModel || ''} onChange={handleItemModelChange}>
                {Object.keys(modelTypes).map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <IconButton size='small' title='Create item' onClick={() => handleCreateItem(space)}>
                <RegisterIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>

        <CardActions>
          <Button onClick={() => handleSpaceOpenToggle(space)}>{space.isOpen ? 'Close' : 'Open'}</Button>
          <Button onClick={() => handleSpaceActiveToggle(space)}>{space.isActive ? 'Deactivate' : 'Activate'}</Button>
        </CardActions>
      </Card>
    </>
  );
};
