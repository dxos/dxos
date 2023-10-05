//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { useDroppable } from '@dnd-kit/core';
import React, { PropsWithChildren, useEffect } from 'react';

import { Grid, SVG, SVGContextProvider, useSvgContext } from '@dxos/gem-core';

import { DefaultComponent, MosaicContainer, MosaicContainerProps, useContainer } from '../../dnd';
import { Position } from '../Grid';

type CanvasRootProps = PropsWithChildren<MosaicContainerProps<any, Position>>;

const CanvasRoot = ({ id, children }: CanvasRootProps) => {
  const handleDrop = () => {
    console.log('Canvas drop');
  };

  return (
    <MosaicContainer container={{ id, onDrop: handleDrop, Component: DefaultComponent }}>
      <SVGContextProvider>{children}</SVGContextProvider>
    </MosaicContainer>
  );
};

const CanvasViewport = () => {
  const { id } = useContainer();
  const { setNodeRef } = useDroppable({ id, data: { container: id } });
  const { ref } = useSvgContext();
  useEffect(() => {
    console.log(ref);
  }, [ref]);

  return (
    <div ref={setNodeRef} className='flex grow'>
      <SVG>
        <Grid />
      </SVG>
    </div>
  );
};

export const Canvas = {
  Root: CanvasRoot,
  Viewport: CanvasViewport,
};

export type { CanvasRootProps };
