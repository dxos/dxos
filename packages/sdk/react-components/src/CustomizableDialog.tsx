//
// Copyright 2020 DXOS.org
//

import React from 'react';

import {
  Alert,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  LinearProgress
} from '@mui/material';

export interface CustomizableDialogProps extends DialogProps {
  title?: string
  content?: () => JSX.Element
  actions?: () => JSX.Element
  processing?: boolean
  error?: string
}

/**
 * @constructor
 */
export const CustomizableDialog = ({
  title,
  content,
  actions,
  processing,
  error,
  ...dialogProps
}: CustomizableDialogProps) => {
  const { open, maxWidth = 'xs', fullWidth = true, ...other } = dialogProps;

  return (
    <Dialog
      open={open}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      {...other}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {content?.() || null}
      </DialogContent>
      {processing && (
        <LinearProgress />
      )}
      {error && (
        <Alert sx={{ marginTop: 2 }} severity='error'>{error}</Alert>
      )}
      <DialogActions>
        {actions?.() || null}
      </DialogActions>
    </Dialog>
  )
};

/**
 * Test dialog enables testing of the dialog without the modal container.
 * For example, this enables the testing of multiple dialogs in parallel from different client context.
 * @constructor
 */
export const TestCustomizableDialog = ({
  title,
  content,
  actions,
  processing,
  error,
  ...dialogProps
}: CustomizableDialogProps) => {
  const { open } = dialogProps;
  if (!open) {
    return null;
  }

  return (
    <Card
      raised
      sx={{
        minWidth: 444
      }}
      {...dialogProps}
    >
      <CardHeader title={title} />
      <CardContent>
        {content?.() || null}
      </CardContent>
      {processing && (
        <LinearProgress />
      )}
      {error && (
        <Alert sx={{ marginTop: 2 }} severity='error'>{error}</Alert>
      )}
      <CardActions sx={{
        justifyContent: 'flex-end'
      }}>
        {actions?.() || null}
      </CardActions>
    </Card>
  )
};
