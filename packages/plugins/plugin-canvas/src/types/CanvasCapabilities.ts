//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { type NodeDefSpec, type NodeType as SceneNodeType } from '@dxos/react-ui-canvas/scene';

import { meta } from '#meta';

// Inline import to avoid the `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** A node type another plugin adds to the canvas: its name and its definition (optionally on a prototype). */
export type NodeTypeContribution = { type: SceneNodeType; spec: NodeDefSpec };

/** Node types contributed to the canvas's palette, properties and content schema; the built-ins are always there. */
export const NodeType = Capability.make<NodeTypeContribution>()(`${meta.profile.key}.capability.nodeType`);
