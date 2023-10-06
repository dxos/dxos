//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { useDroppable } from '@dnd-kit/core';
import React, { PropsWithChildren } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/aurora-theme';

import { Mosaic, MosaicContainerProps, useContainer } from '../../mosaic';
import { Position } from '../Grid';

type CanvasRootProps = PropsWithChildren<MosaicContainerProps<any, Position>>;

const CanvasRoot = ({ id, children, className }: CanvasRootProps) => {
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });

  const handleDrop = () => {
    console.log('Canvas drop');
  };

  return (
    <Mosaic.Container {...{ id, onDrop: handleDrop, Component: Mosaic.DefaultComponent }}>
      <div ref={containerRef} className={mx('flex grow overflow-auto', className)}>
        {children}
      </div>
    </Mosaic.Container>
  );
};

const CanvasViewport = () => {
  const { id } = useContainer();
  const { setNodeRef } = useDroppable({ id, data: { container: id } });
  // const { ref } = useSvgContext();
  // useEffect(() => {
  //   console.log(ref);
  // }, [ref]);

  return (
    <div ref={setNodeRef} className='flex grow'>
      {/* <SVG> */}
      {/*  <Grid /> */}
      {/* </SVG> */}
    </div>
  );
};

export const Canvas = {
  Root: CanvasRoot,
  Viewport: CanvasViewport,
};

export type { CanvasRootProps };
