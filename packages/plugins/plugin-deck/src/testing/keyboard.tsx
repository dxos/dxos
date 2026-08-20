//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';

/**
 * Simulates the iOS keyboard in stories: focusing a text control dispatches the `keyboard` event and
 * sets the CSS variables that `MobileLayout.Root` reads from the native (Tauri) keyboard observer.
 */
export const WithKeyboard = ({ children }: PropsWithChildren) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    return combine(
      addEventListener(document, 'focusin', (event: FocusEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          setKeyboardOpen(true);
        }
      }),
      addEventListener(document, 'focusout', (event: FocusEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          setKeyboardOpen(false);
        }
      }),
    );
  }, []);

  useEffect(() => {
    const keyboardHeight = keyboardOpen ? 300 : 0;
    document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
    document.documentElement.style.setProperty('--kb-open', keyboardOpen ? '1' : '0');

    window.dispatchEvent(
      new CustomEvent('keyboard', {
        detail: {
          type: keyboardOpen ? 'show' : 'hide',
          height: keyboardHeight,
          duration: 300,
        },
      }),
    );
  }, [keyboardOpen]);

  return <div className='h-screen relative'>{children}</div>;
};
