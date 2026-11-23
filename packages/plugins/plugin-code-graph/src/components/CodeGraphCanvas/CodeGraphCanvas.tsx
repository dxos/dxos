//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ReactNode, createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';

import {
  type Arrangement,
  type CreateProps,
  type GraphLayoutOptions,
  type GraphModel,
  type GraphShape,
  type NodeViewProps,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas';
import { Graph2DView } from '@dxos/react-ui-canvas-editor';
import * as HoverCard from '@dxos/react-ui/HoverCard';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { type Layer, type Node, type Point, nodeBase } from '@dxos/scene';

import { Kind, Model, Semantic } from '#graph';
import { type CodeGraph } from '#types';

import { KIND_ICONS } from '../icons.ts';

const CODE_NODE_TYPE = 'code';

/** Frame node ids, apart from box ids, which are IRIs. */
const FRAME_PREFIX = 'frame:';
const frameId = (group: string) => `${FRAME_PREFIX}${group}`;
const isFrame = (id: string) => id.startsWith(FRAME_PREFIX);

/** A box that shows one code-index resource; the node id is the resource's IRI. */
const CodeNode = Schema.Struct({ type: Schema.Literal(CODE_NODE_TYPE), ...nodeBase });

const createCodeNode = (props: CreateProps): Node => ({ type: CODE_NODE_TYPE, ...props });

/** Package frames sit on a layer of their own under the boxes and arrows, as the illustrator draws them. */
const BACKDROP_LAYER: Layer = { id: 'backdrop', name: 'Packages', z: 'a0' };
const GRAPH_LAYER: Layer = { id: 'graph', name: 'Code', z: 'a1' };

/** A package's frame as the canvas's own diagram shape: the illustrator's tinted box and title, locked in place. */
const frameShape = (frame: Semantic.Frame): GraphShape => ({
  type: 'diagram',
  size: frame.size,
  label: frame.label,
  layer: BACKDROP_LAYER.id,
  locked: true,
  fields: { element: frame.element, ...(frame.heading && { heading: frame.heading }) },
});

/** Node views get no host props, so the boxes' data reaches them through context. */
const CodeNodeContext = createContext<{
  lookup: (id: string) => CodeGraph.Node | undefined;
  kinds: Record<string, string>;
  selected?: string;
  renderPreview?: (id: string) => ReactNode;
}>({
  lookup: () => undefined,
  kinds: {},
});

const CodeNodeView = ({ node }: NodeViewProps) => {
  const { lookup, kinds, selected, renderPreview } = useContext(CodeNodeContext);
  const resource = lookup(node.id);
  const kind = kinds[node.id] ?? Kind.describe({ coarse: resource?.kind ?? 'other' });
  const box = (
    <Layout.Flex
      asChild
      column
      justify='center'
      classNames={[
        'dx-cover overflow-hidden rounded-md border bg-base-surface px-3',
        selected === node.id ? 'border-accent-text' : 'border-separator',
      ]}
    >
      <div data-testid='code-graph-node'>
        <Layout.Flex align='center' gap='sm' classNames='min-w-0'>
          <Icon.Icon icon={KIND_ICONS[resource?.kind ?? 'other']} size='md' />
          <span className='truncate font-medium'>{resource ? Kind.titleOf(resource) : node.id}</span>
        </Layout.Flex>
        <Layout.Flex>
          <Tag.Tag hue={Kind.hueOf(kind)}>{kind}</Tag.Tag>
        </Layout.Flex>
      </div>
    </Layout.Flex>
  );
  if (!renderPreview) {
    return box;
  }
  return (
    <HoverCard.Root positioning={{ placement: 'right-start' }}>
      <HoverCard.Trigger asChild>{box}</HoverCard.Trigger>
      <HoverCard.Content arrow={false} classNames='p-0'>
        {renderPreview(node.id)}
      </HoverCard.Content>
    </HoverCard.Root>
  );
};

const createRegistry = (open: (id: string) => void) =>
  createNodeRegistry(
    {
      ...defaultNodeTypes,
      [CODE_NODE_TYPE]: {
        name: 'Code',
        icon: 'ph--code--regular',
        schema: CodeNode,
        component: CodeNodeView,
        create: createCodeNode,
        defaultSize: { width: 3, height: 1 },
        resizable: false,
        palette: false,
        portsPerSide: 1,
        openable: true,
        hostOpen: (node) => () => open(node.id),
        bare: true,
      },
    },
    defaultNodePrototypes,
  );

/** Boxes and pitch match the illustrator layout's, so its positions land on boxes the same size. */
const LAYOUT: GraphLayoutOptions = {
  size: Semantic.BOX,
  pitch: Semantic.PITCH,
  layers: [BACKDROP_LAYER, GRAPH_LAYER],
  link: { type: 'curve', ends: { end: 'arrow' }, layer: GRAPH_LAYER.id },
};

const toGraph = (
  nodes: readonly CodeGraph.Node[],
  edges: readonly CodeGraph.Edge[],
  frames: readonly Semantic.Frame[],
): GraphModel => {
  const ids = new Set(nodes.map(({ id }) => id));
  return {
    // Frames first, so they paint under the boxes.
    nodes: [
      ...frames.map(({ group }) => ({ id: frameId(group), label: group })),
      ...nodes.map(({ id, label }) => ({ id, label })),
    ],
    edges: edges
      .filter(({ from, to }) => ids.has(from) && ids.has(to))
      .map((edge) => ({
        id: Model.edgeId(edge),
        from: edge.from,
        to: edge.to,
        // Dependencies dash, as the illustrator draws them; containment and other facts are solid.
        ...(edge.kind &&
          edge.kind !== 'declares' &&
          edge.kind !== 'inPackage' && { style: { lineStyle: 'dashed' as const } }),
      })),
  };
};

const EMPTY_KINDS: Record<string, string> = {};
const EMPTY_FRAMES: readonly Semantic.Frame[] = [];

/** Where a frame's centre goes in a canvas's positions. */
export const framePositions = (frames: readonly Semantic.Frame[]): Record<string, Point> =>
  Object.fromEntries(frames.map(({ group, center }) => [frameId(group), center]));

export type CodeGraphCanvasProps = {
  nodes: readonly CodeGraph.Node[];
  edges: readonly CodeGraph.Edge[];
  /** Positions laid over the arrangement, by IRI: the illustrator's layout and the user's drags. */
  positions?: Record<string, Point>;
  onPositionsChange?: (positions: Record<string, Point>) => void;
  /** How boxes take their slots when no position is given for them. */
  arrange?: Arrangement;
  /** Package frames, drawn under the boxes and arrows; their centres come in `positions` under the frame's id. */
  frames?: readonly Semantic.Frame[];
  /** What each box is (`capability`, `file`), by IRI; boxes not listed show their coarse kind. */
  kinds?: Record<string, string>;
  /** The box shown highlighted, e.g. the one whose details are open. */
  selected?: string;
  /** The card shown while the pointer rests on a box; mounted only while it is open. */
  renderPreview?: (id: string) => ReactNode;
  /** Double-clicking a box. */
  onOpen?: (id: string) => void;
  /** Boxes deleted on the canvas; without it they cannot be. */
  onRemove?: (ids: string[]) => void;
  /** Changing it reframes the view on the boxes, e.g. once an asynchronous layout lands; edits never refit by themselves. */
  refitKey?: string | number;
};

/**
 * The code graph on a canvas: the dynamic projection that feature maps use, with one box per resource. Boxes move,
 * and deleting changes the model rather than the picture.
 */
export const CodeGraphCanvas = ({
  nodes,
  edges,
  positions = {},
  onPositionsChange,
  arrange = 'crossings',
  frames = EMPTY_FRAMES,
  kinds = EMPTY_KINDS,
  selected,
  renderPreview,
  onOpen,
  onRemove,
  refitKey,
}: CodeGraphCanvasProps) => {
  const lookup = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return (id: string) => byId.get(id);
  }, [nodes]);
  const nodeContext = useMemo(
    () => ({ lookup, kinds, selected, renderPreview }),
    [lookup, kinds, selected, renderPreview],
  );

  // Read through a ref so the registry, which the viewport does not expect to change, stays stable.
  const callbacks = useRef({ onOpen, onRemove });
  // After commit, so a render React discards never leaves its callbacks behind.
  useLayoutEffect(() => {
    callbacks.current = { onOpen, onRemove };
  }, [onOpen, onRemove]);
  const registry = useMemo(() => createRegistry((id) => callbacks.current.onOpen?.(id)), []);

  const graph = useMemo(() => toGraph(nodes, edges, frames), [nodes, edges, frames]);
  const layout = useMemo<GraphLayoutOptions>(() => {
    const framesById = new Map(frames.map((frame) => [frameId(frame.group), frame]));
    return {
      ...LAYOUT,
      arrange,
      shape: (node) => {
        const frame = framesById.get(node.id);
        return frame ? frameShape(frame) : { type: CODE_NODE_TYPE, layer: GRAPH_LAYER.id };
      },
    };
  }, [frames, arrange]);

  const handleDelete = useCallback((ids: string[]) => {
    // An arrow is a fact in the index, so only boxes can be removed.
    const boxes = ids.filter((id) => !id.includes(Model.EDGE_SEPARATOR) && !isFrame(id));
    if (boxes.length > 0) {
      callbacks.current.onRemove?.(boxes);
    }
  }, []);

  return (
    <CodeNodeContext.Provider value={nodeContext}>
      <Graph2DView
        graph={graph}
        layout={layout}
        nodes={registry}
        positions={positions}
        onPositionsChange={onPositionsChange}
        onDelete={onRemove ? handleDelete : undefined}
        refitKey={refitKey}
      />
    </CodeNodeContext.Provider>
  );
};
