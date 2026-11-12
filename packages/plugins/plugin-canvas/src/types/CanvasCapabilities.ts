//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import type { ElementKindSpec } from '@dxos/react-ui-canvas';
import type { LibraryItem as EditorLibraryItem } from '@dxos/react-ui-canvas-editor';
import { type Scene, type NodeType as SceneNodeType } from '@dxos/scene';

import { CanvasNamespace } from '../namespace.ts';

// Inline import to avoid the `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = CanvasNamespace.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()('settings');

/** An element kind another plugin adds to the canvas: its type and its definition (decision 13). */
export type NodeTypeContribution = { type: SceneNodeType; spec: ElementKindSpec };

/**
 * The tools panel group a contributed kind is offered in unless its `spec.group` names another, so a plugin's tools
 * stand apart from the canvas's own shapes. A kind that replaces a built-in is offered where the built-in was.
 */
export const EXTENSIONS_GROUP = 'Extensions';

/** Node types contributed to the canvas's palette, properties and content schema; the built-ins are always there. */
export const NodeType = CanvasNamespace.make<NodeTypeContribution>()('nodeType');

/** An object the editor's library tool offers, for the canvases of one dimension. */
export type LibraryItemContribution = EditorLibraryItem & { dim: Scene.Dimension };

/** Objects contributed to the canvas's library tool; a pick defines one in the canvas's model, then places it. */
export const LibraryItem = CanvasNamespace.make<LibraryItemContribution>()('libraryItem');
