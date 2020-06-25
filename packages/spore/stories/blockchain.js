//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, button } from "@storybook/addon-knobs";

import {
  FullScreen,
  SVG,
  createTree,
  useGrid,
  useObjectMutator
} from '@dxos/gem-core';

import {
  RadialLayout,
  GuideProjector,
  CircleProjector,
  useDefaultStyles,
  useLayout
} from '../src';

export default {
  title: 'Blockchain',
  decorators: [withKnobs]
};

debug.enable('spore:*');

//
// Actions
//

const useDataButton = (generate, label = 'Refresh') => {
  const [data, setData, getData, updateData] = useObjectMutator(generate());
  button(label, () => setData(generate()));
  return [data, setData, getData, updateData];
};

/**
 * Blockchain layout.
 */
export const withBlockchain = () => {
  const classes = useDefaultStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;

  const [data] = useDataButton(() => createTree(5, 6));

  const links = useRef();
  const nodes = useRef();
  const guides = useRef();

  const layout = new RadialLayout();
  const projector = new CircleProjector();
  const guideProjector = new GuideProjector();
  const grid = useGrid({ width, height });
  useLayout(layout, grid, data, data => {
    guideProjector.update(grid, data, { group: guides.current });
    projector.update(grid, data, {
      links: links.current,
      nodes: nodes.current
    });
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <g className={classes.tree}>
          <g ref={guides} className={classes.guides} />
          <g ref={links} />
          <g ref={nodes} />
        </g>
      </SVG>
    </FullScreen>
  );
};
