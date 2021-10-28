//
// Copyright 2020 DXOS.org
//

import {
  Alert as MuiAlert,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  LinearProgress,
  styled
} from '@mui/material';
import React from 'react';

export interface CustomizableDialogProps extends DialogProps {
  title?: string
  content?: () => JSX.Element
  actions?: () => JSX.Element
  processing?: boolean
  error?: string
}

const Alert = styled(MuiAlert)({
  marginTop: 4,
  marginBottom: 4,
  '.MuiAlert-Message': {
    paddingRight: 8,
    wordBreak: 'break-word'
  }
});

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
        <Alert severity='error'>{error}</Alert>
      )}
      <DialogActions>
        {actions?.() || null}
      </DialogActions>
    </Dialog>
  );
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
        <Alert severity='error'>{error}</Alert>
      )}
      <CardActions sx={{
        justifyContent: 'flex-end'
      }}>
        {actions?.() || null}
      </CardActions>
    </Card>
  );
};
