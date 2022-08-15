//
// Copyright 2021 DXOS.org
//

import React, { ReactNode, createContext, useContext, useState } from 'react';

import { Snackbar, Alert as MuiAlert, AlertProps } from '@mui/material';

// TODO(burdon): Consider rewriting this abstraction (error context not UX context).

const Alert = (props: AlertProps) => <MuiAlert elevation={6} variant='filled' {...props} />;

interface SnackbarMessage {
  message: string
  severity: 'error' | 'warning' | 'info' | 'success'
}

// TODO(burdon): Rename MessageContext
const UseSnackbar = createContext<((message: SnackbarMessage) => void) | undefined>(undefined);

// TODO(burdon): Should not be named snackbar (impl. speific) -- useError?
export const useSnackbar = () => useContext(UseSnackbar);

// TODO(burdon): Rename MessageContextProvider.
export const WithSnackbarContext = ({ children } : { children: ReactNode }) => {
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
    <UseSnackbar.Provider value={setSnackbar}>
      {message ? (
        <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
          <Alert onClose={handleClose} severity={message.severity}>
            {message.message}
          </Alert>
        </Snackbar>
      ) : null}
      {children}
    </UseSnackbar.Provider>
  );
};
