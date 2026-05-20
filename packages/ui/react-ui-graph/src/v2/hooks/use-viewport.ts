//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useEngineContext } from '../context';

export const useViewport = () => {
  const engine = useEngineContext();
  const [state, setState] = useState({
    size: engine.viewport.size,
    scale: engine.viewport.scale,
  });
  useEffect(() => {
    const offResize = engine.viewport.resized.on((size) =>
      setState((s) => ({ ...s, size })),
    );
    const offTransform = engine.viewport.transformed.on((t) =>
      setState((s) => ({ ...s, scale: t.k })),
    );
    return () => {
      offResize();
      offTransform();
    };
  }, [engine]);
  return state;
};
