//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import type { NodeDefSpec, NodeType as SceneNodeType } from '@dxos/react-ui-canvas/scene';

import { CanvasNamespace } from '../namespace.ts';

// Inline import to avoid the `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = CanvasNamespace.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()('settings');

/** A node type another plugin adds to the canvas: its name and its definition (optionally on a prototype). */
export type NodeTypeContribution = { type: SceneNodeType; spec: NodeDefSpec };

/** Node types contributed to the canvas's palette, properties and content schema; the built-ins are always there. */
export const NodeType = CanvasNamespace.make<NodeTypeContribution>()('nodeType');
