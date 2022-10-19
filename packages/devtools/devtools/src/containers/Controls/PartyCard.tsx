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

import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { CopyText, HashIcon } from '@dxos/react-components';
import { PartySharingDialog } from '@dxos/react-toolkit';

import { ModelType, modelTypes } from './models';

/**
 * Party controls.
 * @param party
 * @constructor
 */
export const PartyCard = ({ party }: { party: Party }) => {
  const client = useClient();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [partySharing, setPartySharing] = useState(false);
  const [itemModel, setItemModel] = useState<ModelType | undefined>();
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');

  const handlePartyOpenToggle = (party: Party) => {
    if (party.isOpen) {
      void party.open();
    } else {
      void party.close();
    }
  };

  const handlePartyActiveToggle = (party: Party) => {
    void party.setActive(!party.isActive, { global: true });
  };

  const handlePropertyKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyKey(event.target.value);
  };

  const handlePropertyValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyValue(event.target.value);
  };

  const handleSetPartyProperty = (party: Party) => {
    const intValue: number = parseInt(propertyValue);
    if (!isNaN(intValue)) {
      void party.setProperty(propertyKey, intValue);
    } else {
      void party.setProperty(propertyKey, propertyValue);
    }
  };

  const handleItemModelChange = (event: SelectChangeEvent) => {
    setItemModel(event.target.value as ModelType);
  };

  const handleCreateItem = (party: Party) => {
    const { model, createItem } = (itemModel && modelTypes[itemModel]) || {};
    client.echo.registerModel(model); // TODO(burdon): Test if already registered.
    if (createItem) {
      createItem(party);
    }
  };

  return (
    <>
      <Menu
        open={Boolean(menuAnchorEl)}
        anchorEl={menuAnchorEl}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setMenuAnchorEl(null);
          setPartySharing(true);
        }}>
          Share Party
        </MenuItem>
      </Menu>

      <PartySharingDialog
        open={partySharing}
        onClose={() => setPartySharing(false)}
        partyKey={party.key}
      />

      <Card sx={{
        margin: 1
      }}>
        <CardHeader
          sx={{
            '.MuiCardHeader-avatar': {
              marginRight: 1
            },
            '.MuiCardHeader-action': {
              margin: 0
            }
          }}
          avatar={(
            <IconButton>
              <HashIcon value={party.key.toString()} />
            </IconButton>
          )}
          title={<CopyText value={party.key.toString()} monospace variant='h6' length={8} />}
          action={(
            <IconButton onClick={event => setMenuAnchorEl(event.currentTarget)}>
              <MenuIcon />
            </IconButton>
          )}
        />

        <CardContent sx={{
          paddingTop: 1
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'end',
            marginBottom: 2
          }}>
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
              <IconButton size='small' onClick={() => handleSetPartyProperty(party)}>
                <AddIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{
            display: 'flex',
            alignItems: 'end',
            marginBottom: 2
          }}>
            <FormControl fullWidth variant='standard'>
              <InputLabel id='model-select'>Model</InputLabel>
              <Select
                label='Item Model'
                variant='standard'
                value={itemModel || ''}
                onChange={handleItemModelChange}
              >
                {Object.keys(modelTypes).map((model) => (
                  <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <IconButton size='small' title='Create item' onClick={() => handleCreateItem(party)}>
                <RegisterIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>

        <CardActions>
          <Button onClick={() => handlePartyOpenToggle(party)}>
            {party.isOpen ? 'Close' : 'Open'}
          </Button>
          <Button onClick={() => handlePartyActiveToggle(party)}>
            {party.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </CardActions>
      </Card>
    </>
  );
};
