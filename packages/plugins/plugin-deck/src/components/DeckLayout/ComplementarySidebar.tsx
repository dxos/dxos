//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';

import {
  createIntent,
  LayoutAction,
  Surface,
  useAppGraph,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Main, useTranslation, toLocalizedString, IconButton, ScrollArea } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';

import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { ToggleComplementarySidebarButton } from './SidebarButton';
import { DeckCapabilities } from '../../capabilities';
import { useNode, useNodeActionExpander } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { SLUG_PATH_SEPARATOR, type Panel } from '../../types';
import { layoutAppliesTopbar, useBreakpoints, useHoistStatusbar } from '../../util';

export type ComplementarySidebarProps = {
  panels: Panel[];
  current?: string;
};

export const ComplementarySidebar = ({ panels, current }: ComplementarySidebarProps) => {
  const layout = useCapability(DeckCapabilities.MutableDeckState);
  const panelIds = useMemo(() => panels.map((panel) => panel.id), [panels]);
  const activePanelId = panelIds.find((panelId) => panelId === current) ?? panels[0].id;
  const attended = useAttended();
  const activeEntryId = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${activePanelId}` : undefined;
  const { graph } = useAppGraph();
  const node = useNode(graph, activeEntryId);
  const { t } = useTranslation(DECK_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useNodeActionExpander(node);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  const hoistStatusbar = useHoistStatusbar(breakpoint);

  const [internalValue, setInternalValue] = useState(activePanelId);

  useEffect(() => {
    setInternalValue(activePanelId);
  }, [activePanelId]);

  const handleTabClick = useCallback(
    (event: MouseEvent) => {
      const nextValue = event.currentTarget.getAttribute('data-value') as string;
      if (nextValue === activePanelId) {
        layout.complementarySidebarState = layout.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded';
      } else {
        setInternalValue(nextValue);
        layout.complementarySidebarState = 'expanded';
        void dispatch(createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', subject: nextValue }));
      }
    },
    [layout, activePanelId, dispatch],
  );

  // TODO(burdon): Scroll area should be controlled by surface.
  return (
    <Main.ComplementarySidebar
      classNames={[
        topbar && 'block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
        hoistStatusbar && 'block-end-[--statusbar-size]',
      ]}
    >
      <Tabs.Root
        orientation='vertical'
        verticalVariant='stateless'
        value={internalValue}
        attendableId={attended[0]}
        classNames='contents'
      >
        <div
          role='none'
          className='absolute z-[1] inset-block-0 inline-end-0 !is-[--r0-size] border-is border-separator grid grid-cols-1 grid-rows-[1fr_min-content] bg-baseSurface contain-layout app-drag'
        >
          <Tabs.Tablist classNames='grid grid-cols-1 auto-rows-[--rail-action] p-1 gap-1 !overflow-y-auto'>
            {panels.map((panel) => (
              <Tabs.Tab key={panel.id} value={panel.id} asChild>
                <IconButton
                  label={toLocalizedString(panel.label, t)}
                  icon={panel.icon}
                  size={5}
                  iconOnly
                  tooltipSide='left'
                  data-value={panel.id}
                  variant={
                    activePanelId === panel.id
                      ? layout.complementarySidebarState === 'expanded'
                        ? 'primary'
                        : 'default'
                      : 'ghost'
                  }
                  onClick={handleTabClick}
                />
              </Tabs.Tab>
            ))}
          </Tabs.Tablist>
          {!hoistStatusbar && (
            <div role='none' className='grid grid-cols-1 auto-rows-[--rail-item] p-1 overflow-y-auto'>
              <Surface role='status-bar--r0-footer' limit={1} />
            </div>
          )}
          <div role='none' className='hidden lg:grid grid-cols-1 auto-rows-[--rail-action] p-1'>
            <ToggleComplementarySidebarButton />
          </div>
        </div>
        {panels.map((panel) => (
          <Tabs.Tabpanel
            key={panel.id}
            value={panel.id}
            classNames='absolute data-[state="inactive"]:-z-[1] inset-block-0 inline-start-0 is-[calc(100%-var(--r0-size))] lg:is-[--r1-size] grid grid-cols-1 grid-rows-[var(--rail-size)_1fr_min-content]'
            {...(layout.complementarySidebarState !== 'expanded' && { inert: 'true' })}
          >
            {panel.id === activePanelId && node && (
              <>
                <h2 className='flex items-center pli-2 border-separator border-be'>
                  {toLocalizedString(panel.label, t)}
                </h2>
                <ScrollArea.Root>
                  <ScrollArea.Viewport>
                    <Surface
                      key={activeEntryId}
                      role={`complementary--${activePanelId}`}
                      data={{
                        id: activeEntryId,
                        subject: node.properties.object ?? node.properties.space,
                        popoverAnchorId: layout.popoverAnchorId,
                      }}
                      fallback={PlankContentError}
                      placeholder={<PlankLoading />}
                    />
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar orientation='vertical'>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
                {!hoistStatusbar && (
                  <div
                    role='contentinfo'
                    className='flex flex-wrap justify-center items-center border-bs border-separator plb-1'
                  >
                    <Surface role='status-bar--r1-footer' limit={1} />
                  </div>
                )}
              </>
            )}
          </Tabs.Tabpanel>
        ))}
      </Tabs.Root>
    </Main.ComplementarySidebar>
  );
};
