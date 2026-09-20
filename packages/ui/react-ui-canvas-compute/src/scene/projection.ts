//
// Copyright 2026 DXOS.org
//

//
// The compute projection (MIGRATION.md M3, DESIGN.md §3): freehand semantics over the scene store, and
// every structural intent mirrored into the compute graph, which is what the editor's `GraphMonitor`
// did from the outside. The positioned scene it emits carries each node's runtime ports: a node whose
// compute node declares input / output schemas gets one port per property.
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { DefaultInput, DefaultOutput } from '@dxos/conductor';
import { toEffectSchema } from '@dxos/echo/JsonSchema';
import {
  type FreehandProjectionOptions,
  type Intent,
  type Link,
  type Node,
  type Projection,
  type Scene,
  createFreehandProjection,
  endpointNode,
  reduceIntent,
} from '@dxos/react-ui-canvas/scene';

import { type ComputeGraphController, deleteTriggerObjects, syncCreate, syncDelete, syncLink } from '../graph/index.ts';
import { type ComputeShape, createFunctionAnchors, parseAnchorId } from '../shapes/index.ts';
import { anchorsToPorts } from './ports.ts';

export type ComputeProjectionOptions = FreehandProjectionOptions & {
  controller: ComputeGraphController;
};

/** The compute node id a scene node carries, when it is a compute shape. */
const computeId = (node: Node | undefined): string | undefined =>
  node && 'node' in node && typeof node.node === 'string' ? node.node : undefined;

/** The compute edge a link stands for: both ends on compute nodes, the ports naming the properties. */
const computeLink = (scene: Scene, link: Link) => {
  const sourceNode = endpointNode(link.source);
  const targetNode = endpointNode(link.target);
  const source = computeId(sourceNode ? scene.nodes[sourceNode] : undefined);
  const target = computeId(targetNode ? scene.nodes[targetNode] : undefined);
  if (!source || !target) {
    return undefined;
  }
  const output = 'port' in link.source ? parseAnchorId(link.source.port ?? '')[1] : undefined;
  const input = 'port' in link.target ? parseAnchorId(link.target.port ?? '')[1] : undefined;
  return { source, target, ...(output ? { output } : {}), ...(input ? { input } : {}) };
};

/**
 * Freehand over the store plus the compute graph kept in step: `create` makes the compute node and writes
 * its id into the shape, `link` adds the edge, `delete` removes both. The scene atom re-emits on every
 * controller update so runtime ports (and the components reading runtime state) follow.
 */
export const createComputeProjection = ({
  registry,
  store,
  sceneId,
  controller,
}: ComputeProjectionOptions): Projection => {
  const freehand = createFreehandProjection({ registry, store, sceneId });
  const model = controller.graph;

  // The compute graph is not an atom: the scene re-derives on every controller update instead.
  const scene = Atom.keepAlive(
    Atom.make((get) => {
      const current = get(freehand.scene);
      const nodes = Object.fromEntries(
        Object.values(current.nodes).map((node) => [node.id, withRuntimePorts(controller, node)]),
      );
      return { ...current, nodes };
    }),
  );
  controller.update.on(() => registry.refresh(scene));

  const apply = (intent: Intent): void => {
    switch (intent.kind) {
      case 'create': {
        const computeNode = syncCreate(model, intent.node);
        const node = computeNode ? { ...intent.node, node: computeNode.id } : intent.node;
        freehand.apply({ kind: 'create', node });
        break;
      }
      case 'link': {
        const current = registry.get(freehand.scene);
        const edge = computeLink(current, intent.link);
        if (edge) {
          syncLink(model, edge);
        }
        freehand.apply(intent);
        break;
      }
      case 'delete': {
        const current = registry.get(freehand.scene);
        const after = reduceIntent(current, intent);
        const nodes = Object.values(current.nodes).filter((node) => after.nodes[node.id] === undefined);
        const links = Object.values(current.links).filter((link) => after.links[link.id] === undefined);
        const nodeIds = nodes.map(computeId).filter((id): id is string => id !== undefined);
        const edges = links.map((link) => computeLink(current, link)).filter((edge) => edge !== undefined);
        syncDelete(model, nodeIds, edges);
        deleteTriggerObjects(model, nodes.filter(isComputeShape));
        freehand.apply(intent);
        break;
      }
      case 'batch':
        // Applied one by one so each create / link / delete reaches the compute graph.
        intent.intents.forEach(apply);
        break;
      default:
        freehand.apply(intent);
    }
  };

  return {
    scene,
    apply,
    capabilities: freehand.capabilities,
    snapshot: freehand.snapshot,
    restore: freehand.restore,
  };
};

const isComputeShape = (node: Node): node is Node & ComputeShape => typeof node.type === 'string';

/**
 * The node with the ports its compute node's runtime schemas define, one per property; a node without
 * schemas keeps its definition's ports (the registry supplies them when `ports` is absent).
 */
const withRuntimePorts = (controller: ComputeGraphController, node: Node): Node => {
  const id = computeId(node);
  if (!id) {
    return node;
  }
  const computeNode = model(controller).getNode(id);
  if (!computeNode?.inputSchema && !computeNode?.outputSchema) {
    return node;
  }
  const inputSchema = computeNode.inputSchema ? toEffectSchema(computeNode.inputSchema) : DefaultInput;
  const outputSchema = computeNode.outputSchema ? toEffectSchema(computeNode.outputSchema) : DefaultOutput;
  return { ...node, ports: anchorsToPorts(createFunctionAnchors(node, inputSchema, outputSchema), node.size) };
};

const model = (controller: ComputeGraphController) => controller.graph;
