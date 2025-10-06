//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { select } from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Graph, type GraphModel, SelectionModel } from '@dxos/graph';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { JsonFilter, SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { getHashColor, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/react-ui/testing';

import { Pulsar } from '../../fx';
import {
  GraphForceProjector,
  type GraphForceProjectorOptions,
  GraphHierarchicalProjector,
  type GraphHierarchicalProjectorOptions,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  type GraphProjector,
  GraphRadialProjector,
  type GraphRadialProjectorOptions,
  GraphRelationalProjector,
  type GraphRelationalProjectorOptions,
} from '../../graph';
import { type SVGContext } from '../../hooks';
import { TestGraphModel, type TestNode, convertTreeToGraph, createGraph, createNode, createTree } from '../../testing';
import { SVG, type SVGGridProps } from '../SVG';

import { Graph as GraphComponent, type GraphController, type GraphProps } from './Graph';

import '../../../styles/graph.css';

type ProjectorType = 'force' | 'radial' | 'hierarchical' | 'relational';

type Factory = {
  new (...args: ConstructorParameters<typeof GraphProjector>): GraphProjector<TestNode>;
};

const projectorTypes: Record<ProjectorType, Factory> = {
  force: GraphForceProjector as Factory,
  radial: GraphRadialProjector as Factory,
  hierarchical: GraphHierarchicalProjector as Factory,
  relational: GraphRelationalProjector as Factory,
};

type StoryProps = GraphProps & {
  debug?: boolean;
  grid?: boolean | SVGGridProps;
  inspect?: boolean;
  singleSelect?: boolean;
  graph: () => Graph;
  projectorType?: ProjectorType;
  projectorOptions?:
    | GraphForceProjectorOptions
    | GraphHierarchicalProjectorOptions
    | GraphRadialProjectorOptions
    | GraphRelationalProjectorOptions;
};

const DefaultStory = ({
  debug,
  grid,
  inspect,
  singleSelect,
  graph: _graph,
  projectorType: _projectorType = 'force',
  projectorOptions,
  ...props
}: StoryProps) => {
  const graphRef = useRef<GraphController | null>(null);
  const context = useRef<SVGContext>(null);

  // Models.
  const [model, setModel] = useState<GraphModel | undefined>(() => new TestGraphModel(_graph?.()));
  const selection = useMemo(() => new SelectionModel(singleSelect), [singleSelect]);

  // Projector.
  const [projectorType, setProjectorType] = useState<ProjectorType>(_projectorType);
  const [projector, setProjector] = useState<GraphProjector<TestNode>>();
  useEffect(() => {
    if (!context.current) {
      return;
    }

    const Projector = projectorTypes[projectorType];
    setProjector((projector) => new Projector(context.current, projectorOptions, selection, projector?.layout));
  }, [context.current, selection, projectorType, projectorOptions]);

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

  const handleSelect = useCallback<GraphProps['onSelect']>(
    (node) => {
      if (selection.contains(node.id)) {
        selection.remove(node.id);
      } else {
        selection.add(node.id);
      }

      graphRef.current?.repaint();
    },
    [selection, projector],
  );

  const handleAdd = useCallback(() => {
    if (model) {
      const graph = model.graph;
      if (Math.random() < 0.5) {
        model.addNode(createNode());
      } else if (graph.nodes.length) {
        const source = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
        const target = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
        if (source !== target) {
          model.addEdge({ source: source.id, target: target.id });
        }
      }
    }
  }, [model]);

  const handleDelete = useCallback(() => {
    if (model) {
      const graph = model.graph;
      if (graph) {
        const node = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
        if (node) {
          model.removeNode(node.id);
        }
      }
    }
  }, [model]);

  const handleRegenerate = useCallback(() => {
    setModel(new TestGraphModel(_graph?.()));
  }, [_graph]);

  const handleClear = useCallback(() => {
    setModel(undefined);
  }, []);

  const handleRefresh = useCallback(() => {
    graphRef.current?.refresh();
  }, []);

  const handleRepaint = useCallback(() => {
    graphRef.current?.repaint();
  }, []);

  const handleToggleProjector = useCallback(() => {
    setProjectorType((projectorType) => {
      const keys = Object.keys(projectorTypes) as ProjectorType[];
      const index = keys.indexOf(projectorType);
      return keys[index + 1] ?? keys[0];
    });
  }, []);

  const active = useMemo(() => new SelectionModel(), []);
  const handlePing = useCallback(() => {
    for (const id of active.selected.value) {
      const node = graphRef.current?.findNode(id);
      if (node) {
        Pulsar.remove(select(node));
      }
    }

    active.clear();
    for (const id of selection.selected.value) {
      const node = graphRef.current?.findNode(id);
      if (node) {
        active.add(id);
        const r = parseFloat(select(node).select('circle').attr('r') ?? '8');
        Pulsar.create(select(node), r);
      }
    }
  }, [selection, active]);

  return (
    <Popover.Root open={!!popover} onOpenChange={(state) => !state && setPopover(undefined)}>
      <div className={mx('w-full grid divide-x divide-separator', debug && 'grid-cols-[1fr_30rem]')}>
        <SVG.Root ref={context}>
          <SVG.Markers />
          {grid && <SVG.Grid {...(typeof grid === 'boolean' ? { axis: grid } : grid)} />}
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
                    color: getHashColor(node.data?.type ?? node.type)?.color,
                  },
                  classes: {
                    'dx-selected': selection.contains(node.id),
                  },
                }),
                edge: (edge: GraphLayoutEdge<TestNode>) => ({
                  data: {
                    color: getHashColor(edge.data?.type ?? edge.type)?.color,
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
            selection={selection}
            projector={projectorType}
            onToggleProjector={handleToggleProjector}
            onRefresh={handleRefresh}
            onRepaint={handleRepaint}
            onRegenerate={handleRegenerate}
            onClear={handleClear}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onPing={handlePing}
          />
        )}
      </div>

      <Popover.VirtualTrigger virtualRef={popoverAnchorRef} />
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <Card.SurfaceRoot role='card--popover'>
            <SyntaxHighlighter
              language='json'
              classNames='text-xs mlb-cardSpacingBlock pli-cardSpacingInline bg-transparent'
              code={JSON.stringify(popover, null, 2)}
            />
          </Card.SurfaceRoot>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

const Debug = ({
  model,
  selection,
  projector,
  onToggleProjector,
  onRefresh,
  onRepaint,
  onRegenerate,
  onClear,
  onAdd,
  onDelete,
  onPing,
}: {
  model?: GraphModel;
  selection: SelectionModel;
  projector: ProjectorType;
  onToggleProjector: () => void;
  onRefresh: () => void;
  onRepaint: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onPing: () => void;
}) => {
  const [data, setData] = useState({});
  useEffect(() => {
    effect(() => {
      setData({
        projector,
        selection: selection.toJSON(),
        model: model?.toJSON(),
      });
    });
  }, [model, selection, projector]);

  return (
    <div className='flex flex-col overflow-hidden'>
      <Toolbar.Root>
        <IconButton onClick={onToggleProjector} size={5} label='Projector' icon='ph--graph--regular' iconOnly />
        <IconButton onClick={onRefresh} size={5} label='Refresh' icon='ph--arrow-clockwise--regular' iconOnly />
        <IconButton onClick={onRepaint} size={5} label='Repaint' icon='ph--paint-roller--regular' iconOnly />
        <IconButton onClick={onRegenerate} size={5} label='Regenerate' icon='ph--arrows-clockwise--regular' iconOnly />
        <IconButton onClick={onClear} size={5} label='Clear' icon='ph--trash--regular' iconOnly />
        <IconButton onClick={onAdd} size={5} label='Add' icon='ph--plus--regular' iconOnly />
        <IconButton onClick={onDelete} size={5} label='Delete' icon='ph--x--regular' iconOnly />
        <IconButton onClick={onPing} size={5} label='Delete' icon='ph--crosshair-simple--regular' iconOnly />
      </Toolbar.Root>
      <JsonFilter data={data} classNames='text-sm' />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-graph/Graph',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    graph: () => convertTreeToGraph(createTree({ depth: 3 })),
    debug: true,
    grid: {
      axis: true,
    },
    drag: true,
    arrows: true,
  },
};

export const Projector: Story = {
  args: {
    graph: () => convertTreeToGraph(createTree({ depth: 4 })),
    debug: true,
    drag: true,
    arrows: true,
    singleSelect: true,
    projectorType: 'hierarchical',
    projectorOptions: {
      duration: 500,
    },
  },
};

export const Force: Story = {
  args: {
    graph: () => convertTreeToGraph(createTree({ depth: 5 })),
    debug: true,
    drag: true,
    projectorOptions: {
      guides: true,
      attributes: {
        radius: (node, count) => 3 + Math.log(count + 1) * 3,
      },
      radius: 400,
      forces: {
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
  },
};

export const Select: Story = {
  args: {
    graph: () => createGraph(100, 30, ['type-1', 'type-2', 'type-3', 'type-4', 'type-5', 'type-6']),
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
  },
};

export const WithSubgraphs: Story = {
  args: {
    graph: () => createGraph(50, 30),
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
  },
};

export const WithPopover: Story = {
  args: {
    graph: () => createGraph(30, 10),
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
  },
};

export const Empty = () => (
  <SVG.Root>
    <SVG.Markers />
    <SVG.Grid axis />
    <SVG.Zoom extent={[1 / 4, 4]}>
      <GraphComponent />
    </SVG.Zoom>
  </SVG.Root>
);
