//
// Copyright 2023 DXOS.org
//

import { type Action, type ActionLike, type Node } from '@dxos/app-graph';
import { type Label } from '@dxos/react-ui';
import { type MaybePromise, type Position } from '@dxos/util';

export type NavTreeItemGraphNode = Node<
  any,
  Partial<
    NodeProperties & {
      persistenceClass: string;
      persistenceKey: string;
      acceptPersistenceClass: Set<string>;
      acceptPersistenceKey: Set<string>;
      onRearrangeChildren: (nextOrder: NavTreeItemGraphNode[]) => MaybePromise<void>;
      onCopy: (activeNode: NavTreeItemGraphNode, index?: number) => MaybePromise<void>;
      onTransferStart: (activeNode: NavTreeItemGraphNode, index?: number) => MaybePromise<void>;
      onTransferEnd: (activeNode: NavTreeItemGraphNode, destinationParent: NavTreeItemGraphNode) => MaybePromise<void>;
    }
  >
>;

export type FlattenedActions = {
  actions: ActionLike[];
  groupedActions: Record<string, Action[]>;
};

type SharedProperties = {
  testId?: string;
  disabled?: boolean;
  position?: Position;
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
};

export type ActionProperties = SharedProperties & {
  disposition?: string;
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
  // TODO(thure): Dedupe (similar in react-ui-stack/next)
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
