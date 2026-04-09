//
// Copyright 2025 DXOS.org
//

import React, { useLayoutEffect, useRef, useState } from 'react';

import { Splitter, type SplitterMode } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '#hooks';

import { DebugOverlay } from '../DebugOverlay';
import { Dialog } from '../Dialog';
import { MobileLayout } from '../MobileLayout';
import { PopoverContent, PopoverRoot } from '../Popover';
import { Drawer } from './Drawer';
import { Main } from './Main';

export const SimpleLayout = () => {
  const { state } = useSimpleLayoutState();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('top');

  const drawerRef = useRef<HTMLDivElement>(null);

  // Restore Splitter mode when keyboard closes.
  useLayoutEffect(() => {
    if (!keyboardOpen) {
      setSplitterMode(state.drawerState === 'closed' ? 'top' : state.drawerState === 'open' ? 'split' : 'bottom');
    }
  }, [state.drawerState, keyboardOpen]);

  return (
    <DebugOverlay.Root enabled={false}>
      <PopoverRoot>
        <Mosaic.Root classNames='dx-container grid relative'>
          <MobileLayout.Root
            classNames='bg-toolbar-surface'
            onKeyboardOpenChange={(nextKeyboardOpen) => setKeyboardOpen(nextKeyboardOpen)}
          >
            <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'top' }}>
              <Splitter.Root mode={splitterMode} ratio={0.55}>
                <Splitter.Panel position='top'>
                  <Main />
                </Splitter.Panel>
                <Splitter.Panel position='bottom' ref={drawerRef}>
                  <Drawer />
                </Splitter.Panel>
              </Splitter.Root>
              <Dialog />
              <PopoverContent />
            </MobileLayout.Panel>
          </MobileLayout.Root>
        </Mosaic.Root>
      </PopoverRoot>
    </DebugOverlay.Root>
  );
};
