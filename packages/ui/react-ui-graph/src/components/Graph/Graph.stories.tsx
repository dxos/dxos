//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { effect } from '@preact/signals-core';
import { type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type GraphModel, SelectionModel, type Graph } from '@dxos/graph';
import { Popover, Toolbar } from '@dxos/react-ui';
import { JsonFilter, SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph as GraphComponent, type GraphController, type GraphProps } from './Graph';
import {
  GraphForceProjector,
  GraphRadialProjector,
  type GraphForceProjectorOptions,
  type GraphLayoutNode,
  type GraphProjector,
} from '../../graph';
import { type SVGContext } from '../../hooks';
import { convertTreeToGraph, createGraph, createTree, TestGraphModel, type TestNode } from '../../testing';
import { SVG } from '../SVG';

import '../../../styles/graph.css';

type DefaultStoryProps = GraphProps & {
  debug?: boolean;
  grid?: boolean;
  inspect?: boolean;
  graph: Graph;
  projectorOptions?: GraphForceProjectorOptions;
};

const DefaultStory = ({ debug, grid, inspect, graph, projectorOptions, ...props }: DefaultStoryProps) => {
  const graphRef = useRef<GraphController | null>(null);
  const model = useMemo(() => new TestGraphModel(graph), [graph]);
  const context = useRef<SVGContext>(null);

  const selected = useMemo(() => new SelectionModel(), []);

  const [projectorType, setProjectorType] = useState<'force' | 'radial'>('force');
  const [projector, setProjector] = useState<GraphProjector<TestNode>>();
  useEffect(() => {
    if (!context.current) {
      return;
    }

    switch (projectorType) {
      case 'force':
        setProjector(new GraphForceProjector(context.current, projectorOptions));
        break;
      case 'radial':
        setProjector(new GraphRadialProjector(context.current, projectorOptions));
        break;
    }
  }, [context.current, projectorType, projectorOptions]);

  const popoverAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [popover, setPopover] = useState<any>();

  // Dismiss popover when SVG context transform changes.
  useEffect(() => {
    if (!context.current) {
      return;
    }

    return context.current.resized.on(() => setPopover(undefined));
  }, [context]);

  const handleInspect = useCallback<GraphProps['onInspect']>((node, event) => {
    setPopover(undefined);
    popoverAnchorRef.current = null;

    queueMicrotask(() => {
      popoverAnchorRef.current = event.target as HTMLButtonElement;
      setPopover(node.data);
    });
  }, []);

  const handleSelect = useCallback<GraphProps['onSelect']>((node) => {
    if (selected.contains(node.id)) {
      selected.remove(node.id);
    } else {
      selected.add(node.id);
    }

    graphRef.current?.repaint();
  }, []);

  return (
    <Popover.Root open={!!popover} onOpenChange={(state) => !state && setPopover(undefined)}>
      <div className={mx('w-full grid divide-x divide-separator', debug && 'grid-cols-[1fr_30rem]')}>
        <SVG.Root ref={context}>
          <SVG.Markers />
          {grid && <SVG.Grid axis />}
          <SVG.Zoom extent={[1 / 4, 4]}>
            <GraphComponent
              ref={graphRef}
              model={model}
              projector={projector}
              labels={{
                text: (node: GraphLayoutNode<TestNode>) => node.data.label,
              }}
              attributes={{
                node: (node: GraphLayoutNode<TestNode>) => ({
                  data: {
                    color: node.data.type,
                  },
                  classes: {
                    'dx-selected': selected.contains(node.id),
                  },
                }),
              }}
              onInspect={inspect ? handleInspect : undefined}
              onSelect={handleSelect}
              {...props}
            />
          </SVG.Zoom>
        </SVG.Root>

        {debug && (
          <Debug
            model={model}
            projector={projectorType}
            selected={selected}
            onRefresh={() => {
              graphRef.current?.refresh();
            }}
            onAdd={() => {
              if (graph.nodes.length) {
                const source = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
                const target = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
                if (source !== target) {
                  model.addEdge({ source: source.id, target: target.id });
                }
              }
            }}
            onDelete={() => {
              const node = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
              if (node) {
                model.removeNode(node.id);
              }
            }}
            onToggleProjector={() => {
              setProjectorType((projectorType) => (projectorType === 'force' ? 'radial' : 'force'));
            }}
          />
        )}
      </div>

      <Popover.VirtualTrigger virtualRef={popoverAnchorRef} />
      <Popover.Content classNames='popover-card-width' onOpenAutoFocus={(event) => event.preventDefault()}>
        <SyntaxHighlighter classNames='text-sm' language='json' code={JSON.stringify(popover, null, 2)} />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

const Debug = ({
  model,
  projector,
  selected,
  onRefresh,
  onAdd,
  onDelete,
  onToggleProjector,
}: {
  model: GraphModel;
  projector: 'force' | 'radial';
  selected: SelectionModel;
  onRefresh: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onToggleProjector: () => void;
}) => {
  const [data, setData] = useState({});
  useEffect(() => {
    effect(() => {
      setData({
        projector,
        selected: selected.toJSON(),
        model: model.toJSON(),
      });
    });
  }, [model, selected, projector]);

  return (
    <div className='flex flex-col overflow-hidden'>
      <JsonFilter data={data} classNames='text-sm' />
      <Toolbar.Root>
        <Toolbar.Button onClick={onRefresh}>Refresh</Toolbar.Button>
        <Toolbar.Button onClick={onAdd}>Add</Toolbar.Button>
        <Toolbar.Button onClick={onDelete}>Delete</Toolbar.Button>
        <Toolbar.Button onClick={onToggleProjector}>Projector</Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
};

const meta: Meta<DefaultStoryProps> = {
  title: 'ui/react-ui-graph/Graph',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<DefaultStoryProps>;

export const Default: Story = {
  args: {
    debug: true,
    grid: false,
    drag: true,
    arrows: true,
    graph: convertTreeToGraph(createTree({ depth: 3 })),
  },
};

export const Empty: Story = {
  render: () => (
    <SVG.Root>
      <SVG.Markers />
      <SVG.Grid axis />
      <SVG.Zoom extent={[1 / 4, 4]}>
        <GraphComponent />
      </SVG.Zoom>
    </SVG.Root>
  ),
};

export const Force: Story = {
  args: {
    debug: true,
    drag: true,
    delay: 500,
    projectorOptions: {
      guides: true,
      attributes: {
        radius: (node, count) => 3 + Math.log(count + 1) * 3,
      },
      radius: 400,
      forces: {
        center: {
          strength: 0.6,
        },
        collide: {
          strength: 1,
        },
        manyBody: {
          strength: -80,
        },
        link: {
          distance: 20,
          iterations: 10,
          strength: 0.2,
        },
        radial: {
          delay: 500,
          radius: 300,
          strength: 0.5,
        },
      },
    },
    graph: convertTreeToGraph(createTree({ depth: 5 })),
  },
};

export const Select: Story = {
  args: {
    debug: false,
    drag: true,
    grid: true,
    subgraphs: true,
    projectorOptions: {
      forces: {
        collide: true,
        x: {
          strength: 0.02,
        },
        y: {
          strength: 0.02,
        },
      },
    },
    graph: createGraph(100, 30, ['1', '2', '3', '4', '5', '6']),
  },
};

export const WithSubgraphs: Story = {
  args: {
    debug: true,
    drag: true,
    subgraphs: true,
    projectorOptions: {
      forces: {
        radial: {
          radius: 200,
          strength: 0.05,
        },
      },
    },
    graph: createGraph(50, 30),
  },
};

export const WithPopover: Story = {
  args: {
    debug: false,
    drag: true,
    inspect: true,
    grid: true,
    subgraphs: true,
    projectorOptions: {
      forces: {
        collide: true,
        point: true,
      },
    },
    graph: createGraph(30, 10),
  },
};
