//
// Copyright 2020 DXOS.org
//

import {
  Alert as MuiAlert,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogProps as MuiDialogProps,
  DialogTitle,
  LinearProgress,
  styled
} from '@mui/material';
import React from 'react';

const Alert = styled(MuiAlert)({
  marginTop: 4,
  marginBottom: 4,
  '.MuiAlert-Message': {
    paddingRight: 8,
    wordBreak: 'break-word'
  }
});

export interface DialogProps extends MuiDialogProps {
  modal?: boolean
  title?: string
  content?: () => JSX.Element
  actions?: () => JSX.Element
  processing?: boolean
  error?: string
}

export const ModalDialog = ({
  title,
  content,
  actions,
  processing,
  error,
  ...dialogProps
}: DialogProps) => {
  const { open, maxWidth = 'xs', fullWidth = true, ...other } = dialogProps;

  return (
    <MuiDialog
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
    </MuiDialog>
  );
};

/**
 * Test dialog enables testing of the dialog without the modal container.
 * For example, this enables the testing of multiple dialogs in parallel from different client context.
 * @constructor
 */
// TODO(burdon): Rename non-modal.
export const NonModalDialog = ({
  title,
  content,
  actions,
  processing,
  error,
  ...dialogProps
}: DialogProps) => {
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

/**
 * A standard dialog component that implements a non-modal implementation for testing.
 * @constructor
 */
export const Dialog = ({
  modal = true,
  ...rest
}: DialogProps) => {
  if (modal) {
    return <ModalDialog {...rest} />;
  } else {
    return <NonModalDialog {...rest} />;
  }
};
