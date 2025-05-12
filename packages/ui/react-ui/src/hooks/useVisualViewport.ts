//
// Copyright 2023 DXOS.org
//

import { useCallback, type useEffect, useState } from 'react';

import { useResize } from '@dxos/react-hooks';

export const useVisualViewport = (deps?: Parameters<typeof useEffect>[1]) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const handleResize = useCallback(() => {
    if (window.visualViewport) {
      setWidth(window.visualViewport.width);
      setHeight(window.visualViewport.height);
    }
  }, []);

  useResize(handleResize);

  return { width, height };
};
