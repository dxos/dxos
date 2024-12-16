//
// Copyright 2024 DXOS.org
//

import { type CSSProperties, useMemo } from 'react';

import { useEditorContext } from '../hooks';

export type TransformResult = { styles: CSSProperties };

/**
 * Creates the 2D transformation matrix based on the current offset and scale.
 */
export const useTransform = (): TransformResult => {
  const { width, height, scale, offset } = useEditorContext();
  const styles = useMemo<CSSProperties>(() => {
    return {
      // NOTE: Order is important.
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      visibility: width && height ? 'visible' : 'hidden',
    };
  }, [scale, offset]);

  return { styles };
};
