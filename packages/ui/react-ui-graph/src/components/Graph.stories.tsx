//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph } from './Graph';
import { Grid } from './Grid';
import { Markers } from './Markers';
import { SVG } from './SVG';
import { SVGRoot } from './SVGRoot';
import { Zoom } from './Zoom';
import { GraphForceProjector, type GraphLayoutNode } from '../graph';
import { createSvgContext } from '../hooks';
import { defaultGridStyles } from '../styles';
import { convertTreeToGraph, createGraph, createTree, seed, TestGraphModel, type TestNode } from '../testing';

import '../../styles/defaults.css';

seed(1);

const meta: Meta<typeof Graph> = {
  title: 'ui/react-ui-graph/Graph',
  component: Graph,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = () => {
  const { themeMode } = useThemeContext();
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGRoot>
      <SVG className={'graph'}>
        <Markers />
        <Grid axis className={defaultGridStyles(themeMode)} />
        <Zoom extent={[1 / 2, 2]}>
          <Graph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGRoot>
  );
};

export const Force = () => {
  const { themeMode } = useThemeContext();
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);
  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector(context, {
        guides: true,
        forces: {
          manyBody: {
            strength: -80,
          },
          link: {
            distance: 40,
            iterations: 5,
          },
          radial: {
            radius: 100,
            strength: 0.02,
          },
        },
        attributes: {
          radius: (node, count) => 6 + Math.log(count + 1) * 4,
        },
      }),
    [],
  );

  return (
    <SVGRoot context={context}>
      <SVG className={'graph'}>
        <Markers />
        <Grid axis className={defaultGridStyles(themeMode)} />
        <Zoom extent={[1 / 2, 2]}>
          <Graph model={model} drag arrows projector={projector} />
        </Zoom>
      </SVG>
    </SVGRoot>
  );
};

export const Select = ({ graph = true }) => {
  const { themeMode } = useThemeContext();
  const selected = useMemo(() => new Set(), []);
  const model = useMemo(() => {
    return graph
      ? new TestGraphModel(createGraph(30, 20))
      : new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })));
  }, []);

  return (
    <SVGRoot>
      <SVG className={'graph'}>
        <Markers />
        <Grid axis className={defaultGridStyles(themeMode)} />
        <Zoom extent={[1 / 2, 2]}>
          <Graph
            model={model}
            drag
            arrows
            labels={{
              text: (node: GraphLayoutNode<TestNode>, highlight: boolean) => {
                return highlight || selected.has(node.id) ? node.data.label : undefined;
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<TestNode>) => ({
                class: selected.has(node.id) ? 'selected' : undefined,
              }),
            }}
            onSelect={(node: GraphLayoutNode<TestNode>) => {
              if (selected.has(node.id)) {
                selected.delete(node.id);
              } else {
                selected.add(node.id);
              }
            }}
          />
        </Zoom>
      </SVG>
    </SVGRoot>
  );
};
