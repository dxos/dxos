//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Snackbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import MatAlert from '@material-ui/lab/Alert';

const useStyles = makeStyles(() => ({
  box: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  button: {
    marginLeft: 10
  }
}));

const DeleteConfirmation = (
  props : {
    isDeleted: boolean,
    deleteLabel?: string,
    restoreLabel?: string,
    confirmLabel?: string,
    cancelLabel?: string,
    deletedMessage?: string,
    restoredMessage?: string,
    onDelete?: () => void,
    onRestore?: () => void
  }
) => {
  const classes = useStyles();
  const [deleted, setDeleteed] = useState(false);
  const [restored, setRestored] = useState(false);
  const [isConfirming, setConfirming] = useState(false);

  const {
    isDeleted,
    deleteLabel = 'Delete',
    restoreLabel = 'Restore',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    deletedMessage = 'Succesfully deleted!',
    restoredMessage = 'Succesfully restored!',
    onDelete = () => null,
    onRestore = () => null
  } = props;

  const handleActualDelete = () => {
    onDelete();
    setDeleteed(true);
  };

  const handleRestoreItem = () => {
    onRestore();
    setRestored(true);
    setConfirming(false);
  };

  const DeleteButton = () => (
    <Button size='small' onClick={() => setConfirming(true)}>
      {deleteLabel}
    </Button>
  );

  const Confirmation = () => (
    <>
      <Button
        color='secondary'
        size='small'
        variant='contained'
        className={classes.button}
        startIcon={<DeleteIcon />}
        onClick={handleActualDelete}
      >
        {confirmLabel}
      </Button>
      <Button
        size='small'
        variant='contained'
        className={classes.button}
        onClick={() => setConfirming(false)}
      >
        {cancelLabel}
      </Button>
    </>
  );

  const Done = () => (
    <Button
      size='small'
      color='primary'
      variant='contained'
      onClick={handleRestoreItem}
    >
      {restoreLabel}
    </Button>
  );

  const DeletedSnackbar = () => (
    <Snackbar
      open={deleted}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={() => setDeleteed(false)}
    >
      <MatAlert
        elevation={6}
        variant='filled'
        onClose={() => setDeleteed(false)}
        severity='success'
      >
        {deletedMessage}
      </MatAlert>
    </Snackbar>
  );

  const RestoredSnackbar = () => (
    <Snackbar
      open={restored}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={() => setRestored(false)}
    >
      <MatAlert
        elevation={6}
        variant='filled'
        onClose={() => setRestored(false)}
        severity='success'
      >
        {restoredMessage}
      </MatAlert>
    </Snackbar>
  );

  return (
    <div className={classes.box}>
      {isDeleted ? <Done /> : isConfirming ? <Confirmation /> : <DeleteButton />}
      <DeletedSnackbar />
      <RestoredSnackbar />
    </div>
  );
};

export default DeleteConfirmation;
