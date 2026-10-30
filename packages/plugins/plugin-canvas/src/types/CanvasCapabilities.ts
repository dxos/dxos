//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import type { ElementKindSpec } from '@dxos/react-ui-scene/canvas';
import { type NodeType as SceneNodeType } from '@dxos/scene';

import { CanvasNamespace } from '../namespace.ts';

// Inline import to avoid the `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = CanvasNamespace.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()('settings');

/** An element kind another plugin adds to the canvas: its type and its definition (decision 13). */
export type NodeTypeContribution = { type: SceneNodeType; spec: ElementKindSpec };

/** Node types contributed to the canvas's palette, properties and content schema; the built-ins are always there. */
export const NodeType = CanvasNamespace.make<NodeTypeContribution>()('nodeType');
