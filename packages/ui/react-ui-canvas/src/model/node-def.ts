//
// Copyright 2026 DXOS.org
//

// Kept apart from `registry.ts`, which imports the built-in node views: views look definitions up through
// this module, so loading a view never has to load the registry that refers back to it.

import { animatableProperties } from '@dxos/animation';
import { type AnimatableKind } from '@dxos/animation';
import { type Node } from '@dxos/scene';

import { type NodeDef, type NodeRegistry } from './registry.ts';
import { BASE_ANIMATABLE } from './timeline.ts';

/** The definition of a node's type, when the registry has it. */
export const nodeDef = (registry: NodeRegistry, node: Node): NodeDef | undefined => registry[node.type];

const animatableBySchema = new WeakMap<object, Readonly<Record<string, AnimatableKind>>>();

/**
 * The properties of a node the timeline keys: those its type's schema annotates, or the shared ones for a type the
 * registry does not know.
 */
export const nodeAnimatable = (registry: NodeRegistry, node: Node): Readonly<Record<string, AnimatableKind>> => {
  const schema = nodeDef(registry, node)?.schema;
  if (!schema) {
    return BASE_ANIMATABLE;
  }
  const cached = animatableBySchema.get(schema);
  if (cached) {
    return cached;
  }
  const properties = animatableProperties(schema);
  animatableBySchema.set(schema, properties);
  return properties;
};
