//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useState } from 'react';

import * as Hooks from '@dxos/plugin-deck/Hooks';
import * as Overlays from '@dxos/plugin-deck/Overlays';
import { Dnd } from '@dxos/react-ui-dnd';
import * as Splitter from '@dxos/react-ui/Splitter';

import { DebugOverlay, MobileLayout } from '#components';

import { MobileDrawer } from './MobileDrawer.tsx';
import { MobileMain } from './MobileMain.tsx';

const MOBILE_DECK_LAYOUT_NAME = 'MobileDeckLayout';

export type MobileDeckLayoutProps = Pick<Overlays.ToasterProps, 'onDismissToast'>;

/**
 * Mobile root layout: a navigation stack of the deck's active panels over a companion drawer.
 */
export const MobileDeckLayout = ({ onDismissToast }: MobileDeckLayoutProps) => {
  const { state } = Hooks.useDeckState();
  const { toasts } = state;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<Splitter.Mode>('start');

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
      <Overlays.PopoverRoot>
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
              <Overlays.Dialog />
              <Overlays.PopoverContent />
              <Overlays.Toaster toasts={toasts} onDismissToast={onDismissToast} />
            </MobileLayout.Panel>
          </MobileLayout.Root>
        </Dnd.Root>
      </Overlays.PopoverRoot>
    </DebugOverlay.Root>
  );
};

MobileDeckLayout.displayName = MOBILE_DECK_LAYOUT_NAME;
