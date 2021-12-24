//
// Copyright 2021 DXOS.org
//

import React, { ChangeEvent, useState } from 'react';

import {
  ArrowCircleRightOutlined as AddIcon,
  AddCircleOutline as RegisterIcon
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
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { HashIcon } from '@dxos/react-components';
import { truncateString } from '@dxos/debug';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { TextModel } from '@dxos/text-model';

/**
 * Party controls.
 * @param party
 * @constructor
 */
export const PartyCard = ({ party }: { party: PartyProxy }) => {
  const [title, setTitle] = useState('');
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [itemModel, setItemModel] = useState('');

  const handlePartyOpenToggle = (party: PartyProxy) => {
    void (party.isOpen ? party.close() : party.open());
  };

  const handlePartyActiveToggle = (party: PartyProxy) => {
    const options = { global: true };
    void (party.isActive ? party.deactivate(options) : party.activate(options));
  };

  const handlePartyTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSetPartyTitle = (party: PartyProxy) => {
    void party.setTitle(title);
  };

  const handlePropertyKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyKey(event.target.value);
  };

  const handlePropertyValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyValue(event.target.value);
  };

  const handleSetPartyProperty = (party: PartyProxy) => {
    void party.setProperty(propertyKey, propertyValue);
  };

  const handleItemModelChange = (event: SelectChangeEvent) => {
    setItemModel(event.target.value as string);
  };

  // TODO(burdon): Move to map.
  const handleCreateItem = (party: PartyProxy) => {
    switch (itemModel) {
      case 'ObjectModel':
        void party.database.createItem({
          model: ObjectModel,
          type: 'example:type.object'
        });
        break;

      case 'MessengerModel':
        void party.database.createItem({
          model: MessengerModel,
          type: 'example:type.messenger'
        });
        break;

      case 'TextModel':
        void party.database.createItem({
          model: TextModel,
          type: 'example:type.text'
        });
    }
  };

  return (
    <Card sx={{
      margin: 1
    }}>
      <CardHeader
        title={truncateString(party.key.toString(), 8)}
        titleTypographyProps={{ variant: 'h6' }}
        avatar={<HashIcon value={party.key.toString()} />}
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
            label='Title'
            variant='standard'
            fullWidth
            value={title}
            onChange={handlePartyTitleChange}
          />
          <Box>
            <IconButton size='small' onClick={() => handleSetPartyTitle(party)}>
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

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
              value={itemModel}
              onChange={handleItemModelChange}
            >
              {/* TODO(burdon): From const. */}
              <MenuItem value='ObjectModel'>ObjectModel</MenuItem>
              <MenuItem value='MessengerModel'>MessengerModel</MenuItem>
              <MenuItem value='TextModel'>TextModel</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <IconButton size='small' onClick={() => handleCreateItem(party)}>
              <RegisterIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>

      <CardActions>
        <Button onClick={() => handlePartyOpenToggle(party)}>
          {party.isOpen ? 'Close' : 'Open'} Party
        </Button>
        <Button onClick={() => handlePartyActiveToggle(party)}>
          {party.isActive ? 'Deactivate' : 'Activate'} Party
        </Button>
      </CardActions>
    </Card>
  );
};
