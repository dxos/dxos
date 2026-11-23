//
// Copyright 2026 DXOS.org
//

import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const STYLE_NODES = 'style, link[rel="stylesheet"]';

export type PopupWindowProps = PropsWithChildren<{
  /** Window name; reopening with the same name reuses the window. */
  name: string;
  title: string;
  /** `window.open` features. */
  features?: string;
  /** The browser refused to open the window (no user activation, or popups blocked). */
  onBlocked?: () => void;
  /** The user closed the window. */
  onClose?: () => void;
  /** Keys pressed while the window has focus. */
  onKeyDown?: (event: KeyboardEvent) => void;
}>;

/**
 * Renders its children into a second browser window, as a portal, so they share the app's React tree and state. The
 * window gets the app's stylesheets (and any added later, as the dev server injects them) and theme classes, and
 * closes when the component unmounts.
 */
export const PopupWindow = ({
  children,
  name,
  title,
  features = 'popup,width=960,height=720',
  onBlocked,
  onClose,
  onKeyDown,
}: PopupWindowProps) => {
  const [container, setContainer] = useState<HTMLElement>();
  // The callbacks change identity on every render; the window must not reopen when they do.
  const callbacks = useRef({ onBlocked, onClose, onKeyDown });
  callbacks.current = { onBlocked, onClose, onKeyDown };

  useEffect(() => {
    const popup = window.open('', name, features);
    if (!popup) {
      callbacks.current.onBlocked?.();
      return;
    }

    const { document: target } = popup;
    target.head.replaceChildren(
      ...[...document.head.querySelectorAll(STYLE_NODES)].map((node) => node.cloneNode(true)),
    );
    target.documentElement.className = document.documentElement.className;
    target.body.className = document.body.className;
    target.body.style.margin = '0';
    const root = target.createElement('div');
    root.style.height = '100vh';
    root.style.display = 'grid';
    target.body.replaceChildren(root);
    setContainer(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && node.matches(STYLE_NODES)) {
            target.head.appendChild(node.cloneNode(true));
          }
        }
      }
      target.documentElement.className = document.documentElement.className;
    });
    observer.observe(document.head, { childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleKeyDown = (event: KeyboardEvent) => callbacks.current.onKeyDown?.(event);
    const handleClose = () => callbacks.current.onClose?.();
    popup.addEventListener('keydown', handleKeyDown);
    popup.addEventListener('pagehide', handleClose);
    return () => {
      observer.disconnect();
      popup.removeEventListener('keydown', handleKeyDown);
      popup.removeEventListener('pagehide', handleClose);
      popup.close();
      setContainer(undefined);
    };
  }, [name, features]);

  // Kept out of the open effect: reopening would need a user activation the browser no longer has.
  useEffect(() => {
    if (container) {
      container.ownerDocument.title = title;
    }
  }, [container, title]);

  return container ? createPortal(children, container) : null;
};
