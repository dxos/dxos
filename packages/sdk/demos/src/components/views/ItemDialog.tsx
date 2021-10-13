//
// Copyright 2020 DXOS.org
//

import {
  Box,
  Button,
  createTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useState } from 'react';

import { Item } from '@dxos/echo-db';

import ToggleGroup from '../ToggleGroup';

const useStyles = makeStyles(theme => ({
  field: {
    marginBottom: theme.spacing(2)
  }
}), { defaultTheme: createTheme({}) });

export interface TypeMap {
  [key: string]: Function;
}

export interface ItemProps {
  type: string
  name: string
}

export declare type CreateItemCallback = ({ type, name }: ItemProps) => Promise<Item<any>>;

interface ItemDialogProps {
  open: boolean
  type?: string
  types: TypeMap
  handleCreate?: CreateItemCallback
  handleClose?: () => void
}

/**
 * Creates a new typed item.
 */
const ItemDialog = ({
  open, type: initialType, types, handleCreate, handleClose
}: ItemDialogProps) => {
  const classes = useStyles();
  const [type, setType] = useState(initialType || Object.keys(types)[0]);
  const [name, setName] = useState('');

  const handleCreateItem = async () => {
    if (handleCreate && name.trim().length) {
      await handleCreate({ type, name });
      setName('');
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth='sm'>
      <DialogTitle>Create Item</DialogTitle>
      <DialogContent>
        <Box m={2} flexDirection='column'>
          {!initialType && (
            <div className={classes.field}>
              <ToggleGroup types={types} type={type} onChange={type => setType(type)} />
            </div>
          )}

          <TextField
            id='item-dialog-item-name'
            autoFocus
            fullWidth
            label='Name'
            value={name}
            onChange={event => setName(event.currentTarget.value)}
            variant='outlined'
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color='primary' variant='contained' onClick={handleCreateItem}>Create</Button>
        <Button color='secondary' onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemDialog;
