//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

export type ThrowErrorProps = {
  delay?: number;
};

/**
 * Use this to debug the error boundary.
 */
export const ThrowError = ({ delay = 1_000 }: ThrowErrorProps) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (delay < 0) {
      return;
    }

    const t = setTimeout(() => {
      setError(new Error(`Error thrown by ThrowError after ${delay}ms`));
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (error) {
    throw error;
  }

  return null;
};
