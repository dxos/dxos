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
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('start');

  const drawerRef = useRef<HTMLDivElement>(null);

  // Restore Splitter mode when keyboard closes.
  useLayoutEffect(() => {
    if (!keyboardOpen) {
      setSplitterMode(state.drawerState === 'closed' ? 'start' : state.drawerState === 'open' ? 'split' : 'end');
    }
  }, [state.drawerState, keyboardOpen]);

  return (
    <DebugOverlay.Root enabled={false}>
      <PopoverRoot>
        <Mosaic.Root>
          <MobileLayout.Root
            classNames='dx-container grid relative bg-toolbar-surface'
            onKeyboardOpenChange={(nextKeyboardOpen) => setKeyboardOpen(nextKeyboardOpen)}
          >
            <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'start' }}>
              <Splitter.Root orientation='vertical' mode={splitterMode} ratio={0.55}>
                <Splitter.Panel position='start'>
                  <Main />
                </Splitter.Panel>
                <Splitter.Panel position='end' ref={drawerRef}>
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
