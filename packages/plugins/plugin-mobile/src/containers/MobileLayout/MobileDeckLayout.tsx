//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useState } from 'react';

import { useDeckState } from '@dxos/plugin-deck/hooks';
import { Dialog, PopoverContent, PopoverRoot, Toaster, type ToasterProps } from '@dxos/plugin-deck/overlays';
import { Splitter, type SplitterMode } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';

import { DebugOverlay, MobileLayout } from '#components';

import { MobileDrawer } from './MobileDrawer.tsx';
import { MobileMain } from './MobileMain.tsx';

const MOBILE_DECK_LAYOUT_NAME = 'MobileDeckLayout';

export type MobileDeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

/**
 * Mobile root layout: a navigation stack of the deck's active panels over a companion drawer.
 */
export const MobileDeckLayout = ({ onDismissToast }: MobileDeckLayoutProps) => {
  const { state } = useDeckState();
  const { toasts } = state;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('start');

  // The keyboard owns the splitter mode while it is open (the drawer yields the screen to it), so the
  // drawer state is only projected onto the splitter once the keyboard is closed again.
  const drawerOpen = !!state.complementarySidebarPanel && state.complementarySidebarState !== 'closed';
  useLayoutEffect(() => {
    if (!keyboardOpen) {
      setSplitterMode(!drawerOpen ? 'start' : state.complementarySidebarState === 'expanded' ? 'end' : 'split');
    }
  }, [drawerOpen, state.complementarySidebarState, keyboardOpen]);

  return (
    <DebugOverlay.Root enabled={false}>
      <PopoverRoot>
        <Dnd.Root>
          <MobileLayout.Root
            classNames='dx-expand overflow-hidden grid relative dx-toolbar-surface'
            onKeyboardOpenChange={setKeyboardOpen}
          >
            <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'start' }}>
              <Splitter.Root orientation='vertical' mode={splitterMode} size={24}>
                <Splitter.Panel position='start'>
                  <MobileMain />
                </Splitter.Panel>
                <Splitter.Panel position='end'>
                  <MobileDrawer />
                </Splitter.Panel>
              </Splitter.Root>
              <Dialog />
              <PopoverContent />
              <Toaster toasts={toasts} onDismissToast={onDismissToast} />
            </MobileLayout.Panel>
          </MobileLayout.Root>
        </Dnd.Root>
      </PopoverRoot>
    </DebugOverlay.Root>
  );
};

MobileDeckLayout.displayName = MOBILE_DECK_LAYOUT_NAME;
