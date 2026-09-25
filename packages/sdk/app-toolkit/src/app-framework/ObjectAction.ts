//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * A menu item one plugin contributes to another plugin's object surface — "analyse this mailbox",
 * "research this sender", "delegate this task to a chat".
 *
 * The contributing plugin owns the behaviour and the host owns the surface, so neither has to import
 * the other: the host defines a capability over this shape, and every plugin that wants a place on
 * that surface contributes one.
 *
 * ```ts
 * export const TaskAction = Capability.make<ObjectAction<Task.Task>>()(`${meta.profile.key}.capability.taskAction`);
 * ```
 */
export type ObjectAction<T> = {
  /** Stable id; the menu item's key, and what the host dispatches on. */
  id: string;
  /** Menu item label, shown verbatim. */
  label: string;
  /** Phosphor icon name. */
  icon?: string;
  /**
   * What to run, in order — a list, because the useful actions are composites (research, then image)
   * and a contributor should not have to model that as one operation.
   *
   * An EMPTY list means the action does not apply to this subject and the host omits the item. One
   * closure decides both applicability and behaviour, so the two cannot disagree.
   *
   * A closure rather than value properties: holding an `Operation.Definition` on the capability value
   * makes the capability atom read recurse.
   */
  createInvocations: (subject: T) => Invocation[];
};

/** One operation and the input to run it with. */
export type Invocation = {
  operation: import('@dxos/compute').Operation.Definition.Any;
  input: unknown;
};
