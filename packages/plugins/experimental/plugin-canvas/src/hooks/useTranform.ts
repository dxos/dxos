//
// Copyright 2024 DXOS.org
//

import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { useEditorContext } from '../hooks';

export type TransformResult = { ready: boolean; styles: CSSProperties };

/**
 * Creates the 2D transformation matrix based on the current offset and scale.
 */
export const useTransform = (): TransformResult => {
  const { width, height, scale, offset, setTransform } = useEditorContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    setTransform(({ scale }) => ({ scale, offset: { x: width / 2, y: height / 2 } }));
    setReady(true);
  }, [width, height]);

  const styles = useMemo(
    () => ({
      // NOTE: Order is important.
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    }),
    [scale, offset],
  );

  return { ready, styles };
};
