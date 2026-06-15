//
// Copyright 2022 DXOS.org
//

import React, { type ReactNode, memo, useMemo } from 'react';

import { type ZoomExtent, useZoom } from '../../hooks';

export type ZoomProps = {
  extent?: ZoomExtent;
  className?: string;
  children?: ReactNode;
};

/**
 * SVG zoomable component wrapper.
 */
export const Zoom = memo(({ extent, className, children }: ZoomProps) => {
  const options = useMemo(() => ({ extent }), [JSON.stringify(extent)]); // TODO(burdon): Avoid stringify.
  const zoom = useZoom(options);

  return (
    <g ref={zoom.ref as any} className={className}>
      {children}
    </g>
  );
});
