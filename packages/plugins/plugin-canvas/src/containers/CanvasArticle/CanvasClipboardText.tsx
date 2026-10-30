//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef } from 'react';

import {
  getSessionClipboard,
  setSessionClipboard,
  useCanvasDocument,
  useCanvasEditing,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';

import { canvasClipboardFrom, canvasClipboardText, readFragment } from '#model';

const CONSUMER = 'CanvasClipboardText';

export type CanvasClipboardTextProps = {
  /** The element whose paste shortcut reads the system clipboard first. */
  element: HTMLElement | null;
};

/** Whether a key event is typing into a field, which keeps its own clipboard. */
const typing = (event: KeyboardEvent) =>
  event.target instanceof HTMLElement &&
  (event.target.isContentEditable || event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');

/**
 * Carries the 2D canvas's clipboard on the system clipboard as `.dx` text: a copy or cut writes its text, and a paste
 * of scene text copied elsewhere (another canvas, a 3D scene, a document) pastes it. Rendered inside `Canvas.Root`.
 */
export const CanvasClipboardText = ({ element }: CanvasClipboardTextProps) => {
  const registry = useRegistry();
  const { readonly } = useCanvasDocument(CONSUMER);
  const { atoms, commands } = useCanvasEditing(CONSUMER);
  // The text this canvas last wrote, so its own copy pastes from the canvas's clipboard (which counts repeats).
  const written = useRef<string>(undefined);

  useEffect(
    () =>
      registry.subscribe(atoms.clipboard, (clipboard) => {
        if (clipboard && clipboard.pasted === 0) {
          const text = canvasClipboardText(clipboard);
          if (text !== written.current) {
            written.current = text;
            void navigator.clipboard?.writeText(text).catch(() => undefined);
            // The session's clipboard too, so a 3D canvas pastes it where the system clipboard cannot be read.
            const fragment = readFragment(text, '2d');
            fragment && setSessionClipboard({ fragment, text, pasted: 0 });
          }
        }
      }),
    [registry, atoms],
  );

  useEffect(() => {
    if (!element || readonly) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event) || !(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'v') {
        return;
      }
      // The canvas's own paste waits for the system clipboard, which may hold scene text copied elsewhere.
      event.preventDefault();
      event.stopPropagation();
      const read = navigator.clipboard?.readText?.() ?? Promise.resolve(undefined);
      void read
        .catch(() => undefined)
        // A copy from another canvas in this session, when the system clipboard cannot be read.
        .then((text) => text ?? getSessionClipboard()?.text)
        .then((text) => {
          const foreign = text !== undefined && text !== written.current ? canvasClipboardFrom(text) : undefined;
          if (foreign && text !== undefined) {
            written.current = text;
            registry.set(atoms.clipboard, { ...foreign, pasted: 0 });
          }
          commands.paste();
        });
    };
    element.addEventListener('keydown', onKeyDown, { capture: true });
    return () => element.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [element, readonly, registry, atoms, commands]);

  return null;
};
