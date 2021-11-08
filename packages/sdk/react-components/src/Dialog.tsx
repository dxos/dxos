//
// Copyright 2020 DXOS.org
//

import React from 'react';

import {
  Alert as MuiAlert,
  Box,
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
  styled,
  useTheme
} from '@mui/material';

const Alert = styled(MuiAlert)({
  'marginTop': 4,
  'marginBottom': 4,
  '.MuiAlert-Message': {
    paddingRight: 8,
    wordBreak: 'break-word'
  }
});

type ComponentOrFunction = React.FunctionComponent | React.ReactNode

const render = (component?: ComponentOrFunction) => {
  if (component instanceof Function) {
    const Component = component as React.FunctionComponent;
    return <Component />;
  } else {
    return component;
  }
};

export interface DialogProps extends MuiDialogProps {
  modal?: boolean
  title?: string
  dividers?: boolean
  content?: ComponentOrFunction
  actions?: ComponentOrFunction
  processing?: boolean
  error?: string
}

export const ModalDialog = ({
  title,
  content,
  actions,
  dividers = false,
  processing,
  error,
  ...dialogProps
}: DialogProps) => {
  const theme = useTheme();
  const { open, maxWidth = 'xs', fullWidth = true, ...other } = dialogProps;

  return (
    <MuiDialog
      open={open}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      sx={{
        '.MuiDialogContent-root > .MuiTypography-root': {
          color: theme.palette.text.secondary
        }
      }}
      {...other}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers={dividers}>
        {render(content)}
      </DialogContent>
      <Box sx={{ height: 8 }}>
        {processing && (
          <LinearProgress />
        )}
      </Box>
      {error && (
        <Alert severity='error'>{error}</Alert>
      )}
      <DialogActions>
        {render(actions)}
      </DialogActions>
    </MuiDialog>
  );
};

/**
 * Test dialog enables testing of the dialog without the modal container.
 * For example, this enables the testing of multiple dialogs in parallel from different client context.
 * @constructor
 */
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
        {render(content)}
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
        {render(actions)}
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
