//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { createSvgContext, FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';

import {
  convertTreeToGraph,
  createGraph,
  createTree,
  seed,
  Graph,
  GraphForceProjector,
  GraphLayoutNode,
  Markers,
  TestGraphModel,
  TestNode
} from '../src';

export default {
  title: 'gem-spore/Graph'
};

seed(1);

export const Primary = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1 / 2, 2]}>
            <Graph model={model} drag arrows />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Secondary = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);
  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector(context, {
        guides: true,
        forces: {
          manyBody: {
            strength: -80
          },
          link: {
            distance: 40,
            iterations: 5
          },
          radial: {
            radius: 100,
            strength: 0.02
          }
        },
        attributes: {
          radius: (node, count) => 6 + Math.log(count + 1) * 4
        }
      }),
    []
  );

  return (
    <FullScreen>
      <SVGContextProvider context={context}>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1 / 2, 2]}>
            <Graph model={model} drag arrows projector={projector} />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Tertiary = ({ graph = true }) => {
  const selected = useMemo(() => new Set(), []);
  const model = useMemo(() => {
    return graph
      ? new TestGraphModel(createGraph(30, 20))
      : new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })));
  }, []);

  return (
    <FullScreen>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom extent={[1 / 2, 2]}>
            <Graph
              model={model}
              drag
              arrows
              labels={{
                text: (node: GraphLayoutNode<TestNode>, highlight: boolean) => {
                  return highlight || selected.has(node.id) ? node.data.label : undefined;
                }
              }}
              attributes={{
                node: (node: GraphLayoutNode<TestNode>) => ({
                  class: selected.has(node.id) ? 'selected' : undefined
                })
              }}
              onSelect={(node: GraphLayoutNode<TestNode>) => {
                if (selected.has(node.id)) {
                  selected.delete(node.id);
                } else {
                  selected.add(node.id);
                }
                model.update();
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </FullScreen>
  );
};
