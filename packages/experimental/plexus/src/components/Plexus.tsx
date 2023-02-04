//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { Markers, convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore';

export type PlexusParam = {
  data?: object;
};

// TODO(burdon): Test click and transition.

export const Plexus = ({ data }: PlexusParam) => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Grid axis />
        <Zoom extent={[1, 4]}>
          {/* <GemGraph model={model} drag arrows /> */}
          <Demo />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

const items = [{ id: 'item-1' }, { id: 'item-2' }, { id: 'item-3' }];

const styles = {
  circle: {
    stroke: 'red',
    strokeWidth: 2
  }
};

const Demo = () => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  useEffect(() => {
    d3.select(graphRef.current)
      .selectAll('circle')
      .data(items)
      .join((enter) => enter.append('circle').attr('class', 'circle').attr('r', 30));
  }, []);

  return <g ref={graphRef} className='[&>*]:fill-none [&>*]:stroke-0' />;
};
