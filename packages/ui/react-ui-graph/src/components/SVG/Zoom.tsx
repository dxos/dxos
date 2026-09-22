//
// Copyright 2022 DXOS.org
//

import React, { type ReactNode, memo, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type ZoomExtent, useZoom } from '../../hooks/index.ts';

export type ZoomProps = ThemedClassName<{
  extent?: ZoomExtent;
  children?: ReactNode;
}>;

/**
 * SVG zoomable component wrapper.
 */
export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {
  const options = useMemo(() => ({ extent }), [JSON.stringify(extent)]); // TODO(burdon): Avoid stringify.
  const zoom = useZoom(options);

  return (
    <g ref={zoom.ref as any} className={mx(classNames)}>
      {children}
    </g>
  );
});
