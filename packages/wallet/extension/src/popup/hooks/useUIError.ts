//
// Copyright 2021 DXOS.org
//

import { useSnackbar } from '../contexts';

interface Messages {
  successMessage?: string,
  errorMessage?: string
}

export const useUIError = () => {
  const setSnackbar = useSnackbar();

  return async <T>(
    tryBlock: () => (Promise<T> | T),
    messages: Messages | undefined = undefined) => {
    try {
      const result = await tryBlock();
      if (setSnackbar && messages?.successMessage) {
        setSnackbar({
          message: messages?.successMessage,
          severity: 'success'
        });
      }
      return { result };
    } catch (e) {
      console.error(e);
      if (setSnackbar) {
        setSnackbar({
          message: messages?.errorMessage ?? e.toString(),
          severity: 'error'
        });
      }
    }
  };
};
