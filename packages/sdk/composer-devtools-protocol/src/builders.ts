//
// Copyright 2026 DXOS.org
//

import type {
  ActionNode,
  DebugNode,
  DispatchableId,
  InputNode,
  SelectNode,
  SelectOption,
  SpecNode,
  StackDirection,
  StackNode,
} from './spec';

/**
 * Per-render context: collects handlers registered by leaf builders so the
 * host can route dispatch events back. Set by the host before invoking
 * `onRender()` and cleared after.
 */
export type RenderContext = {
  registerAction: (handler: () => void) => DispatchableId;
  registerInput: (handler: (value: string) => void) => DispatchableId;
  registerSelect: (handler: (value: string) => void) => DispatchableId;
};

let currentContext: RenderContext | undefined;

export const withRenderContext = <T>(ctx: RenderContext, fn: () => T): T => {
  const prev = currentContext;
  currentContext = ctx;
  try {
    return fn();
  } finally {
    currentContext = prev;
  }
};

const requireContext = (): RenderContext => {
  if (!currentContext) {
    throw new Error('Builders may only be used inside a panel render pass.');
  }
  return currentContext;
};

export const stack = (
  props: { direction: StackDirection },
  children: SpecNode[],
): StackNode => ({
  type: 'stack',
  props,
  children,
});

export const action = (
  props: { name: string; disabled?: boolean },
  handler: () => void,
): ActionNode => ({
  type: 'action',
  id: requireContext().registerAction(handler),
  props,
});

export const debug = (props: { value: unknown; label?: string }): DebugNode => ({
  type: 'debug',
  props,
});

export const input = (
  props: { name: string; value: string; placeholder?: string },
  onChange: (value: string) => void,
): InputNode => ({
  type: 'input',
  id: requireContext().registerInput(onChange),
  props,
});

export const select = (
  props: { name: string; value: string; options: SelectOption[] },
  onChange: (value: string) => void,
): SelectNode => ({
  type: 'select',
  id: requireContext().registerSelect(onChange),
  props,
});
