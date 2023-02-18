//
// Copyright 2023 DXOS.org
//

import { useMemo, useState } from 'react';

// TODO(burdon): Factor out.

export const throttledTimeout = (cb: () => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(cb, delay);
  };
};

export const useTimeout = (delay: number, onChange?: (pending: boolean) => void): [boolean, () => void] => {
  const [pending, setPending] = useState(false);
  const trigger = useMemo(() => {
    return throttledTimeout(() => {
      setPending(false);
      onChange?.(false);
    }, delay);
  }, []);

  return [
    pending,
    () => {
      setPending(true);
      onChange?.(true);
      trigger();
    }
  ];
};
