//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { OBJECT_ORG } from '@dxos/echo-testing';

import ToggleGroup from './ToggleGroup';

const useStyles = makeStyles(theme => ({
  field: {
    marginBottom: theme.spacing(2)
  }
}));

interface TypeMap {
  [key: string]: Function;
}

interface ItemDialogProperties {
  open: boolean
  types: TypeMap
  handleCreate?: ({ type, name }: { type: string, name: string }) => void
  handleClose?: () => void
}

// TODO(burdon): Use in card view (with links).
const ItemDialog = ({ open, types, handleCreate, handleClose }: ItemDialogProperties) => {
  const classes = useStyles();
  const [type, setType] = useState(OBJECT_ORG);
  const [name, setName] = useState('');

  const handleCreateItem = () => {
    if (handleCreate && name.trim().length) {
      handleCreate({ type, name });
      setName('');
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth='sm'>
      <DialogTitle>Create Item</DialogTitle>
      <DialogContent>
        <Box m={2} flexDirection='column'>
          <div className={classes.field}>
            <ToggleGroup types={types} type={type} onChange={type => setType(type)} />
          </div>

          <TextField
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
