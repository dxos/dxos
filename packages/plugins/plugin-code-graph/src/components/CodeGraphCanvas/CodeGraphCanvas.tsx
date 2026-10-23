//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import {
  type Arrangement,
  Canvas,
  type CreateProps,
  DYNAMIC_VIEW_ID,
  type DynamicOptions,
  type FreehandProjectionOptions,
  type GraphModel,
  type Node,
  type NodeViewProps,
  type Overlay,
  type Point,
  createCanvasAtoms,
  createDynamicProjection,
  createMemoryStore,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  nodeBase,
} from '@dxos/react-ui-canvas/scene';
import * as Icon from '@dxos/react-ui/Icon';

import { Model, Semantic } from '#graph';
import { type CodeGraph } from '#types';

import { KIND_ICONS } from '../icons.ts';

const CODE_NODE_TYPE = 'code';

/** A box that shows one code-index resource; the node id is the resource's IRI. */
const CodeNode = Schema.Struct({ type: Schema.Literal(CODE_NODE_TYPE), ...nodeBase });

const createCodeNode = (props: CreateProps): Node => ({ type: CODE_NODE_TYPE, ...props });

/** Node views get no host props, so the boxes' data reaches them through context. */
const CodeNodeContext = createContext<{ lookup: (id: string) => CodeGraph.Node | undefined; selected?: string }>({
  lookup: () => undefined,
});

const CodeNodeView = ({ node }: NodeViewProps) => {
  const { lookup, selected } = useContext(CodeNodeContext);
  const resource = lookup(node.id);
  return (
    <div
      className={[
        'dx-cover flex flex-col justify-center gap-0.5 overflow-hidden rounded-md border bg-base-surface px-3',
        selected === node.id ? 'border-accent-text' : 'border-separator',
      ].join(' ')}
      data-testid='code-graph-node'
      title={node.id}
    >
      <div className='flex items-center gap-2 min-w-0'>
        <Icon.Icon icon={KIND_ICONS[resource?.kind ?? 'other']} size='md' />
        <span className='truncate font-medium'>{resource?.label ?? node.id}</span>
      </div>
      {resource?.group && <span className='truncate text-xs text-description'>{resource.group}</span>}
    </div>
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
const LAYOUT: Omit<DynamicOptions, 'nodes'> = {
  createNode: (_node, props) => createCodeNode(props),
  link: { type: 'curve', ends: { end: 'arrow' } },
  size: Semantic.BOX,
  pitch: Semantic.PITCH,
};

const toGraph = (nodes: readonly CodeGraph.Node[], edges: readonly CodeGraph.Edge[]): GraphModel => {
  const ids = new Set(nodes.map(({ id }) => id));
  return {
    nodes: nodes.map(({ id, label }) => ({ id, label })),
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

const samePositions = (left: Record<string, Point>, right: Record<string, Point>) =>
  JSON.stringify(left) === JSON.stringify(right);

export type CodeGraphCanvasProps = {
  nodes: readonly CodeGraph.Node[];
  edges: readonly CodeGraph.Edge[];
  /** Positions laid over the arrangement, by IRI: the illustrator's layout and the user's drags. */
  positions?: Record<string, Point>;
  onPositionsChange?: (positions: Record<string, Point>) => void;
  /** How boxes take their slots when no position is given for them. */
  arrange?: Arrangement;
  /** The box shown highlighted, e.g. the one whose details are open. */
  selected?: string;
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
  selected,
  onOpen,
  onRemove,
  refitKey,
}: CodeGraphCanvasProps) => {
  const atomRegistry = useContext(RegistryContext);
  const lookup = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return (id: string) => byId.get(id);
  }, [nodes]);
  const nodeContext = useMemo(() => ({ lookup, selected }), [lookup, selected]);

  // Owned by this component: the projection's scene atom reads both, so they live while the canvas is mounted.
  const graph = useMemo(() => Atom.make<GraphModel>(toGraph(nodes, edges)), []);
  const overlay = useMemo(() => Atom.make<Overlay>({ positions }), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const atoms = useMemo(() => createCanvasAtoms(DYNAMIC_VIEW_ID), []);

  // Read through a ref so the registry and projection, which the canvas does not expect to change, stay stable.
  const callbacks = useRef({ onOpen, onRemove });
  callbacks.current = { onOpen, onRemove };
  const registry = useMemo(() => createRegistry((id) => callbacks.current.onOpen?.(id)), []);

  useEffect(() => {
    atomRegistry.set(graph, toGraph(nodes, edges));
  }, [atomRegistry, graph, nodes, edges]);

  useEffect(() => {
    if (!samePositions(atomRegistry.get(overlay).positions, positions)) {
      atomRegistry.set(overlay, { positions });
    }
  }, [atomRegistry, overlay, positions]);

  useEffect(
    () =>
      atomRegistry.subscribe(overlay, ({ positions: next }) => {
        if (!samePositions(next, positions)) {
          onPositionsChange?.(next);
        }
      }),
    [atomRegistry, overlay, positions, onPositionsChange],
  );

  const removable = !!onRemove;
  const createProjection = useCallback(
    ({ registry: nodeRegistry, constrained }: FreehandProjectionOptions) =>
      createDynamicProjection({
        registry: nodeRegistry,
        constrained,
        graph,
        overlay,
        options: { ...LAYOUT, nodes: registry, arrange },
        capabilities: { move: true, link: false, delete: removable },
        onDelete: (ids) => {
          // An arrow is a fact in the index, so only boxes can be removed.
          const boxes = ids.filter((id) => !id.includes(Model.EDGE_SEPARATOR));
          if (boxes.length > 0) {
            callbacks.current.onRemove?.(boxes);
          }
        },
      }),
    [graph, overlay, registry, arrange, removable],
  );

  return (
    <CodeNodeContext.Provider value={nodeContext}>
      <Canvas.Root
        store={store}
        root={DYNAMIC_VIEW_ID}
        atoms={atoms}
        nodes={registry}
        createProjection={createProjection}
        backgroundGrid='none'
        refitKey={refitKey}
      >
        <Canvas.Viewport />
        <Canvas.Navigation />
      </Canvas.Root>
    </CodeNodeContext.Provider>
  );
};
