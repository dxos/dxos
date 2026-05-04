//
// Copyright 2026 DXOS.org
//

/**
 * Serializable description of a panel's UI tree.
 *
 * Handlers and reactive values are referenced by id — the page side keeps
 * the live closures, the panel side only sees ids and emits dispatch
 * events back over the bridge.
 */
export type SpecNode = StackNode | ActionNode | DebugNode | InputNode | SelectNode;

export type StackDirection = 'vertical' | 'horizontal';

export type StackNode = {
  type: 'stack';
  props: { direction: StackDirection };
  children: SpecNode[];
};

export type ActionNode = {
  type: 'action';
  id: string;
  props: { name: string; disabled?: boolean };
};

export type DebugNode = {
  type: 'debug';
  props: { value: unknown; label?: string };
};

export type InputNode = {
  type: 'input';
  id: string;
  props: { name: string; value: string; placeholder?: string };
};

export type SelectOption = { label: string; value: string };

export type SelectNode = {
  type: 'select';
  id: string;
  props: { name: string; value: string; options: SelectOption[] };
};

export type PanelInfo = {
  id: string;
  name: string;
};

/**
 * Page-side panel definition. Only `id` and `name` cross the bridge — the
 * lifecycle hooks and render function stay on the page.
 */
export type PanelDefinition = {
  id: string;
  name: string;
  onMount?: (handle: PanelHandle) => void;
  onUnmount?: () => void;
  onRender: () => SpecNode;
};

/**
 * Handle passed to onMount. Calling `update()` re-runs onRender and pushes
 * the new tree to any subscribed panels.
 */
export type PanelHandle = {
  update: () => void;
};

/**
 * Identifies a "leaf" node carrying an id (action / input / select).
 */
export type DispatchableId = string;
