//
// Copyright 2026 DXOS.org
//

/**
 * The boot shell's parts, which stand in for UI not yet on screen: `layout` for the app before the live diagram
 * shows, `join` for the join dialog while no live one does. Either shows alone or both together.
 */
export type ShellPart = 'layout' | 'join';

export type ShellParts = Readonly<Record<ShellPart, boolean>>;

/** Marks the element that holds each part. */
export const SHELL_PART_ATTRIBUTE = 'data-shell-part';

let parts: ShellParts = { layout: false, join: false };
const listeners = new Set<(parts: ShellParts) => void>();

const update = (next: Partial<ShellParts>) => {
  const merged = { ...parts, ...next };
  if (merged.layout !== parts.layout || merged.join !== parts.join) {
    parts = merged;
    listeners.forEach((listener) => listener(parts));
  }
};

export const getShellParts = (): ShellParts => parts;

/** Called synchronously on each change, so the shell can hide a part in the frame its caller commits. */
export const subscribeShell = (listener: (parts: ShellParts) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const showShell = (...shown: ShellPart[]) => update(Object.fromEntries(shown.map((part) => [part, true])));

/** Dismisses the named parts, or the whole shell; safe to call from a layout effect and more than once. */
export const dismissShell = (...dismissed: ShellPart[]) =>
  update(
    Object.fromEntries((dismissed.length ? dismissed : (['layout', 'join'] as const)).map((part) => [part, false])),
  );

export const isShellShown = (part: ShellPart): boolean => parts[part];

/** Dismisses the join part once a live dialog is on screen in its place; returns a cleanup while it waits. */
export const dismissJoinOnLiveDialog = (): (() => void) | undefined => {
  if (!parts.join) {
    return;
  }
  const shown = () =>
    [...document.querySelectorAll('[role="dialog"]')].some((dialog) => !dialog.closest(`[${SHELL_PART_ATTRIBUTE}]`));
  if (shown()) {
    dismissShell('join');
    return;
  }
  const observer = new MutationObserver(() => {
    if (shown()) {
      observer.disconnect();
      dismissShell('join');
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
