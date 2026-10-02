//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { useEffect, useState } from 'react';

type ThrowErrorProps = {
  error?: () => Error;
  delay?: number;
};

/**
 * Use this to debug the error boundary.
 */
const ThrowError = ({ delay = 1_000, ...props }: ThrowErrorProps) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (delay < 0) {
      return;
    }

    const t = setTimeout(() => {
      setError(generator({ delay, ...props }));
    }, delay);
    return () => clearTimeout(t);
  }, [delay, generator]);

  if (error) {
    throw error;
  }

  return null;
};

const generator = ({ error, delay }: ThrowErrorProps) => {
  return error?.() ?? new Error(`Error generated after ${delay}ms`);
};

export { ThrowError as Root };
export type { ThrowErrorProps as RootProps };
