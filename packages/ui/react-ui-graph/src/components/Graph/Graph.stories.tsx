//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { effect } from '@preact/signals-core';
import { type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type GraphModel, SelectionModel, type Graph } from '@dxos/graph';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import { JsonFilter, SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph as GraphComponent, type GraphController, type GraphProps } from './Graph';
import {
  GraphForceProjector,
  GraphRadialProjector,
  GraphHierarchicalProjector,
  GraphRelationalProjector,
  type GraphRadialProjectorOptions,
  type GraphForceProjectorOptions,
  type GraphLayoutNode,
  type GraphProjector,
  type GraphHierarchicalProjectorOptions,
  type GraphRelationalProjectorOptions,
  type GraphLayoutEdge,
} from '../../graph';
import { type SVGContext } from '../../hooks';
import { convertTreeToGraph, createGraph, createNode, createTree, TestGraphModel, type TestNode } from '../../testing';
import { SVG, type SVGGridProps } from '../SVG';

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

type DefaultStoryProps = GraphProps & {
  debug?: boolean;
  grid?: boolean | SVGGridProps;
  inspect?: boolean;
  singleSelect?: boolean;
  graph: () => Graph;
  projectorType?: ProjectorType;
  projectorOptions?:
    | GraphForceProjectorOptions
    | GraphRadialProjectorOptions
    | GraphHierarchicalProjectorOptions
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
}: DefaultStoryProps) => {
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
    setProjector(new Projector(context.current, projectorOptions, selection));
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
                    color: node.data.type ?? node.type,
                  },
                  classes: {
                    'dx-selected': selection.contains(node.id),
                  },
                }),
                edge: (edge: GraphLayoutEdge<TestNode>) => ({
                  data: {
                    color: edge.type,
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
  selection,
  projector,
  onToggleProjector,
  onRefresh,
  onRepaint,
  onRegenerate,
  onClear,
  onAdd,
  onDelete,
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
      </Toolbar.Root>
      <JsonFilter data={data} classNames='text-sm' />
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
    grid: {
      axis: true,
    },
    drag: true,
    arrows: true,
    graph: () => convertTreeToGraph(createTree({ depth: 3 })),
  },
};

export const Radial: Story = {
  args: {
    debug: true,
    drag: true,
    arrows: true,
    singleSelect: true,
    projectorType: 'hierarchical',
    projectorOptions: {
      duration: 500,
      forces: {
        center: true,
        // radial: {
        //   delay: 500,
        //   radius: 200,
        //   strength: 0.5,
        // },
      },
    },
    graph: () => convertTreeToGraph(createTree({ depth: 4 })),
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
    graph: () => convertTreeToGraph(createTree({ depth: 5 })),
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
    graph: () => createGraph(100, 30, ['1', '2', '3', '4', '5', '6']),
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
    graph: () => createGraph(50, 30),
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
    graph: () => createGraph(30, 10),
  },
};
