//
// Copyright 2023 DXOS.org
//

import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { type Label } from '@dxos/react-ui';
import { type TreeData } from '@dxos/react-ui-list';
import { type MaybePromise, type Position } from '@dxos/util';

export type NavTreeItemGraphNode = AppGraphNode.Node<
  any,
  Partial<
    NodeProperties & {
      persistenceClass: string;
      persistenceKey: string;
      acceptPersistenceClass: Set<string>;
      acceptPersistenceKey: Set<string>;
      /** Parents sharing a scope move items between them; a drop from outside it links instead. */
      moveScope: string;
      canDrop: (source: TreeData) => boolean;
      blockInstruction: (source: TreeData, instruction: Instruction) => boolean;
      /** Whether an item added here would only be listed, its parent elsewhere; `from` is the parent it moves out of. */
      isLink: (activeNode: NavTreeItemGraphNode, from?: NavTreeItemGraphNode) => boolean;
      onRearrange: (nextOrder: unknown[]) => MaybePromise<void>;
      /** An item is moving from here to `destinationParent`; called before the destination's `onMoveIn`. */
      onMoveOut: (activeNode: NavTreeItemGraphNode, destinationParent: NavTreeItemGraphNode) => MaybePromise<void>;
      /** An item is moving here from another parent; `index` is its position among this node's children. */
      onMoveIn: (activeNode: NavTreeItemGraphNode, index?: number) => MaybePromise<void>;
      onLink: (activeNode: NavTreeItemGraphNode, index?: number) => MaybePromise<void>;
    }
  >
>;

export type FlattenedActions = {
  actions: AppGraphNode.ActionLike[];
  groupedActions: Record<string, AppGraphNode.Action[]>;
};

type SharedProperties = {
  testId?: string;
  disabled?: boolean;
  position?: Position.Position;
  label: Label;
  className?: string;
  headingClassName?: string;
  icon?: string;
  iconHue?: string;
};

export type NodeProperties = SharedProperties & {
  role?: string;
  error?: string;
  modified?: boolean;
  palette?: string;
  /** Optional item count rendered as a neutral badge after the label. */
  count?: number;
  /** Optional count of new/modified items; when greater than zero it shows as a rose badge in place of `count`. */
  modifiedCount?: number;
};

export type ActionProperties = SharedProperties & {
  disposition?: string | string[];
  hidden?: boolean;
  caller?: string;
  menuType?: 'dropdown';
  keyBinding?: string | KeyBinding;
};

/**
 * Platform-specific key binding.
 */
export type KeyBinding = {
  // NOTE: Keys come from `getHostPlatform` in `@dxos/util`.
  // TODO(thure): Dedupe with the other platform key-binding definitions.
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
