//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { Splitter, type SplitterMode } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { Dialog } from '../Dialog';
import { MobileLayout } from '../MobileLayout';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';

export const SimpleLayout = () => {
  const { state } = useSimpleLayoutState();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('upper');

  const drawerRef = useRef<HTMLDivElement>(null);

  // When a keyboard-triggering element gains focus, update the Splitter mode immediately
  // (BEFORE the keyboard event fires). This ensures the Splitter layout has already settled
  // by the time the container height starts its CSS transition, preventing a compound
  // visual glitch caused by two simultaneous layout changes.
  const handleFocusedElementChange = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        const drawerHasFocus = drawerRef.current?.contains(element);
        setSplitterMode(drawerHasFocus ? 'lower' : 'upper');
      }
    },
    [drawerRef],
  );

  // Restore Splitter mode when keyboard closes.
  useLayoutEffect(() => {
    if (!keyboardOpen) {
      setSplitterMode(state.drawerState === 'closed' ? 'upper' : state.drawerState === 'open' ? 'both' : 'lower');
    }
  }, [state.drawerState, keyboardOpen]);

  return (
    <PopoverRoot>
      <Mosaic.Root classNames='dx-container grid relative'>
        <MobileLayout.Root
          classNames='bg-toolbar-surface'
          onKeyboardOpenChange={(nextKeyboardOpen: boolean) => setKeyboardOpen(nextKeyboardOpen)}
          onFocusedElementChange={handleFocusedElementChange}
        >
          <MobileLayout.Panel
            safe={{ top: true, bottom: splitterMode === 'upper' }}
            // classNames='border border-green-500'
          >
            <Splitter.Root mode={splitterMode} ratio={0.55}>
              <Splitter.Panel position='upper'>
                <Main />
              </Splitter.Panel>
              <Splitter.Panel position='lower' ref={drawerRef}>
                <Drawer />
              </Splitter.Panel>
            </Splitter.Root>
            <Dialog />
            <PopoverContent />
          </MobileLayout.Panel>
        </MobileLayout.Root>
      </Mosaic.Root>
    </PopoverRoot>
  );
};
