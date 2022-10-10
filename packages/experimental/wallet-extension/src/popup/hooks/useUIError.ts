//
// Copyright 2021 DXOS.org
//

import { useSnackbar } from './useSnackbar.js';

// TODO(burdon): Rewrite and replace useSnackbar.

interface Messages {
  onSuccessMessage?: string // To display when the requests passes successfully.
  onTimeoutMessage?: string // To display when the request times out.
  onErrorMessage?: string // To display when some other error happens. Prints actual error by default.
}

export const useUIError = () => {
  const setSnackbar = useSnackbar();

  return async <T>(
    tryBlock: () => (Promise<T> | T),
    messages: Messages | undefined = undefined) => {
    try {
      const result = await tryBlock();
      if (setSnackbar && messages?.onSuccessMessage) {
        setSnackbar({
          message: messages?.onSuccessMessage,
          severity: 'success'
        });
      }
      return { result };
    } catch (err: any) {
      console.error(err);
      if (!setSnackbar) {
        return;
      }

      if (err.toString().toLowerCase().includes('timeout')) {
        setSnackbar({
          message: messages?.onTimeoutMessage ?? err.toString(),
          severity: 'warning'
        });
      } else {
        setSnackbar({
          message: messages?.onErrorMessage ?? err.toString(),
          severity: 'error'
        });
      }
    }
  };
};
