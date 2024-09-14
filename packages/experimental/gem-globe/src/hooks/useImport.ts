//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

export const useImport = <T>(cb: () => Promise<T>) => {
  const [data, setData] = useState<T>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const data = await cb();
      setData(data);
    });

    return () => clearTimeout(t);
  }, []);

  return data;
};
