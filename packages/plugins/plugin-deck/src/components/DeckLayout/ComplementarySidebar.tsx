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
import { mx } from '@dxos/react-ui-theme';

import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { ToggleComplementarySidebarButton } from './SidebarButton';
import { DeckCapabilities } from '../../capabilities';
import { useNode, useNodeActionExpander } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { SLUG_PATH_SEPARATOR, type Panel } from '../../types';
import { layoutAppliesTopbar, useBreakpoints } from '../../util';

export type ComplementarySidebarProps = {
  panels: Panel[];
  current?: string;
};

const actionsContainer = 'grid grid-cols-1 auto-rows-[--rail-action] p-1 gap-1 !overflow-y-auto';

export const ComplementarySidebar = ({ panels, current }: ComplementarySidebarProps) => {
  const layout = useCapability(DeckCapabilities.MutableDeckState);
  const attended = useAttended();
  const panelIds = useMemo(() => panels.map((p) => p.id), [panels]);
  const activePanelId = panelIds.find((p) => p === current) ?? panels[0].id;
  const activeEntryId = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${activePanelId}` : undefined;
  const { graph } = useAppGraph();
  const node = useNode(graph, activeEntryId);
  const { t } = useTranslation(DECK_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useNodeActionExpander(node);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);

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
      classNames={topbar ? 'block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]' : undefined}
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
          className='absolute z-[1] inset-block-0 inline-end-0 !is-[--r0-size] border-is border-separator grid grid-cols-1 grid-rows-[1fr_min-content] bg-base contain-layout app-drag'
        >
          <Tabs.Tablist classNames={actionsContainer}>
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
          <div role='none' className={mx(actionsContainer, 'hidden lg:grid')}>
            <ToggleComplementarySidebarButton />
          </div>
        </div>
        {panels.map((panel) => (
          <Tabs.Tabpanel
            key={panel.id}
            value={panel.id}
            classNames='absolute data-[state="inactive"]:-z-[1] inset-block-0 inline-start-0 is-[calc(100%-var(--r0-size))] lg:is-[--r1-size] grid grid-cols-1 grid-rows-[var(--rail-size)_1fr]'
          >
            <h2 className='flex items-center pli-2 border-separator border-be'>{toLocalizedString(panel.label, t)}</h2>
            <ScrollArea.Root>
              <ScrollArea.Viewport>
                {panel.id === activePanelId && node && (
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
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation='vertical'>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Tabs.Tabpanel>
        ))}
      </Tabs.Root>
    </Main.ComplementarySidebar>
  );
};
