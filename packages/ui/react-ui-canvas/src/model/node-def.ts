//
// Copyright 2026 DXOS.org
//

// Kept apart from `registry.ts`, which imports the built-in node views: views look definitions up through
// this module, so loading a view never has to load the registry that refers back to it.

import { type NodeDef, type NodeRegistry } from './registry.ts';
import { type Node } from './types.ts';

/** The definition of a node's type, when the registry has it. */
export const nodeDef = (registry: NodeRegistry, node: Node): NodeDef | undefined => registry[node.type];
