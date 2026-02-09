//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Mosaic, Splitter, type SplitterMode } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';
import { MobileLayout } from './MobileLayout';

// TODO(burdon): Mobile/Desktop variance?
export const SimpleLayout = () => {
  const { state } = useSimpleLayoutState();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('upper');
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (keyboardOpen) {
      // Determine which panel has focus and expand that one.
      const activeElement = document.activeElement;
      const drawerHasFocus = drawerRef.current?.contains(activeElement);
      setSplitterMode(drawerHasFocus ? 'lower' : 'upper');
    } else {
      setSplitterMode(state.drawerState === 'closed' ? 'upper' : state.drawerState === 'open' ? 'both' : 'lower');
    }
  }, [state.drawerState, keyboardOpen]);

  return (
    <Mosaic.Root classNames='contents'>
      <MobileLayout onKeyboardOpenChange={(state) => setKeyboardOpen(state)}>
        <PopoverRoot>
          <Splitter.Root mode={splitterMode} ratio={0.5}>
            <Splitter.Panel position='upper'>
              <Main />
            </Splitter.Panel>
            <Splitter.Panel position='lower' ref={drawerRef}>
              <Drawer />
            </Splitter.Panel>
          </Splitter.Root>
          <Dialog />
          <PopoverContent />
        </PopoverRoot>
      </MobileLayout>
    </Mosaic.Root>
  );
};
