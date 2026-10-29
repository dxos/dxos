//
// Copyright 2026 DXOS.org
//

import { type Fragment, type Scene } from '@dxos/scene';

import { readFragment } from '#model';

/** What was copied in this session: the fragment, the `.dx` text written for it, and how often it has been pasted. */
export type SceneClipboard = { fragment: Fragment; text: string; pasted: number };

/** How far the `pasted`th paste lands from the copy: a grid step along each ground axis per paste. */
export const pasteOffset = (pasted: number, dim: Scene.Dimension): { x: number; y: number; z?: number } =>
  dim === '3d' ? { x: pasted, y: 0, z: pasted } : { x: pasted * 16, y: pasted * 16 };

/**
 * What the next paste pastes: the copy again, a step further, when the system clipboard still holds its text (or
 * none); otherwise the system clipboard's scene text, read into `dim`, as a fresh copy. Undefined when neither holds one.
 */
export const nextPaste = (
  copied: SceneClipboard | undefined,
  text: string | undefined,
  dim: Scene.Dimension,
): SceneClipboard | undefined => {
  if (text !== undefined && text !== copied?.text) {
    const fragment = readFragment(text, dim);
    if (fragment) {
      return { fragment, text, pasted: 1 };
    }
  }
  if (!copied) {
    return undefined;
  }
  // A copy made in the other dimension pastes through its text, lifted or flattened into this one.
  const fragment = copied.fragment.dim === dim ? copied.fragment : readFragment(copied.text, dim);
  return fragment && { ...copied, fragment, pasted: copied.pasted + 1 };
};

/** The session's clipboard, shared by every canvas, so a copy in one pastes into another. */
let sessionClipboard: SceneClipboard | undefined;

export const getSessionClipboard = (): SceneClipboard | undefined => sessionClipboard;

export const setSessionClipboard = (next: SceneClipboard | undefined): void => {
  sessionClipboard = next;
};
