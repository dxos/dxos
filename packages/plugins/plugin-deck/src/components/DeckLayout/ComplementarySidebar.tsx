//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, NavigationAction, SLUG_PATH_SEPARATOR, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Main, ScrollArea, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { railGridHorizontal, StackContext, StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';

import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { CloseComplementarySidebarButton } from './SidebarButton';
import { useNode, useNodeActionExpander } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { type Panel } from '../../types';
import { useLayout } from '../LayoutContext';

export type ComplementarySidebarProps = {
  panels: Panel[];
  current?: string;
};

export const ComplementarySidebar = ({ panels, current }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const attended = useAttended();
  const panelIds = useMemo(() => panels.map((p) => p.id), [panels]);
  const activePanelId = panelIds.find((p) => p === current) ?? panels[0].id;
  const activeEntryId = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${activePanelId}` : undefined;
  const { graph } = useGraph();
  const node = useNode(graph, activeEntryId);
  const { t } = useTranslation(DECK_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useNodeActionExpander(node);

  const [internalValue, setInternalValue] = useState(activePanelId);

  useEffect(() => {
    setInternalValue(activePanelId);
  }, [activePanelId]);

  const handleValueChange = useCallback(
    (nextValue: string) => {
      setInternalValue(nextValue);
      void dispatch(createIntent(NavigationAction.Open, { activeParts: { complementary: nextValue } }));
    },
    [dispatch],
  );

  // TODO(burdon): Scroll area should be controlled by surface.
  return (
    <Main.ComplementarySidebar classNames='lg:block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]'>
      <StackContext.Provider value={{ size: 'contain', orientation: 'horizontal', rail: true }}>
        <div role='none' className={mx(railGridHorizontal, 'grid grid-cols-[100%] bs-full')}>
          <Tabs.Root
            orientation='horizontal'
            value={internalValue}
            onValueChange={handleValueChange}
            attendableId={attended[0]}
            classNames='contents'
          >
            <StackItem.Heading classNames='border-be border-separator grid grid-cols-[1fr_min-content] items-stretch'>
              <ScrollArea.Root classNames='flex-1 min-is-0'>
                <ScrollArea.Viewport>
                  <Tabs.Tablist classNames='bs-[--rail-content] is-min items-stretch pis-[max(.5rem,env(safe-area-inset-left))] sm:pis-2'>
                    {panels.map((panel) => (
                      <Tabs.Tab key={panel.id} value={panel.id} classNames='!min-bs-0'>
                        {toLocalizedString(panel.label, t)}
                      </Tabs.Tab>
                    ))}
                  </Tabs.Tablist>
                  <ScrollArea.Scrollbar orientation='horizontal'>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
              <CloseComplementarySidebarButton />
            </StackItem.Heading>
            <ScrollArea.Root>
              <ScrollArea.Viewport>
                {panels.map((panel) => (
                  <Tabs.Tabpanel key={panel.id} value={panel.id} classNames='pbe-[env(safe-area-inset-bottom)]'>
                    {panel.id === activePanelId && node && (
                      <Surface
                        key={activeEntryId}
                        role={`complementary--${activePanelId}`}
                        data={{
                          id: activeEntryId,
                          subject: node.properties.object ?? node.properties.space,
                          popoverAnchorId,
                        }}
                        fallback={PlankContentError}
                        placeholder={<PlankLoading />}
                      />
                    )}
                  </Tabs.Tabpanel>
                ))}
                <ScrollArea.Scrollbar orientation='vertical'>
                  <ScrollArea.Thumb />
                </ScrollArea.Scrollbar>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Tabs.Root>
        </div>
      </StackContext.Provider>
    </Main.ComplementarySidebar>
  );
};
