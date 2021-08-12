//
// Copyright 2021 DXOS.org
//

import React, { useContext, useState } from 'react';

import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';

interface SnackbarMessage {
  message: string,
  severity: 'error' | 'warning' | 'info' | 'success'
}

const Alert = (props: AlertProps) => <MuiAlert elevation={6} variant="filled" {...props} />;

const SnackbarContext = React.createContext<((message : SnackbarMessage) => void) | undefined>(undefined);

const useSnackbar = () => useContext(SnackbarContext);

const WithSnackbarContext = ({ children } : { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<SnackbarMessage | undefined>(undefined);

  const handleClose = () => {
    setOpen(false);
  };

  const setSnackbar = (msg: SnackbarMessage) => {
    setMessage(msg);
    setOpen(true);
  };

  return (
    <SnackbarContext.Provider value={setSnackbar}>
      {message
        ? <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
          <Alert onClose={handleClose} severity={message.severity}>
            {message.message}
          </Alert>
        </Snackbar>
        : null}
      {children}
    </SnackbarContext.Provider>
  );
};

export { useSnackbar, WithSnackbarContext };
