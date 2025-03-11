//
// Copyright 2024 DXOS.org
//

import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  Fragment,
} from 'react';

import {
  createIntent,
  LayoutAction,
  Surface,
  useAppGraph,
  useCapabilities,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Main, useTranslation, toLocalizedString, IconButton, ScrollArea as NaturalScrollArea } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { byPosition } from '@dxos/util';

import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { ToggleComplementarySidebarButton } from './SidebarButton';
import { DeckCapabilities } from '../../capabilities';
import { useNode } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { type Panel } from '../../types';
import { layoutAppliesTopbar, useBreakpoints, useHoistStatusbar } from '../../util';

export type ComplementarySidebarProps = {
  current?: string;
};

export const ComplementarySidebar = ({ current }: ComplementarySidebarProps) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layout = useCapability(DeckCapabilities.MutableDeckState);
  const attended = useAttended();
  const { graph } = useAppGraph();
  const node = useNode(graph, attended[0]);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  const hoistStatusbar = useHoistStatusbar(breakpoint);

  const panels = useCapabilities(DeckCapabilities.ComplementaryPanel);
  const availablePanels = panels
    .filter((panel) => {
      if (!node || !panel.filter) {
        return true;
      }

      return panel.filter(node);
    })
    .toSorted(byPosition);
  const activePanelId = availablePanels.find((panel) => panel.id === current)?.id ?? availablePanels[0]?.id;
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

  const data = useMemo(
    () =>
      node && {
        id: node.id,
        subject: node.data,
        workspace: layout.activeDeck,
        popoverAnchorId: layout.popoverAnchorId,
      },
    [node, layout.popoverAnchorId],
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
          className='absolute z-[1] inset-block-0 inline-end-0 !is-[--r0-size] pbs-[env(safe-area-inset-top)] pbe-[env(safe-area-inset-bottom)] border-is border-separator grid grid-cols-1 grid-rows-[1fr_min-content] bg-baseSurface contain-layout app-drag'
        >
          <Tabs.Tablist classNames='grid grid-cols-1 auto-rows-[--rail-action] p-1 gap-1 !overflow-y-auto'>
            {availablePanels.map((panel) => (
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
        {availablePanels.map((panel) => (
          <Tabs.Tabpanel
            key={panel.id}
            value={panel.id}
            classNames='absolute data-[state="inactive"]:-z-[1] inset-block-0 inline-start-0 is-[calc(100%-var(--r0-size))] lg:is-[--r1-size] grid grid-cols-1 grid-rows-[var(--rail-size)_1fr_min-content] pbs-[env(safe-area-inset-top)]'
            {...(layout.complementarySidebarState !== 'expanded' && { inert: 'true' })}
          >
            <ComplementarySidebarPanel
              panel={panel}
              activePanelId={activePanelId}
              data={data}
              hoistStatusbar={hoistStatusbar}
            />
          </Tabs.Tabpanel>
        ))}
      </Tabs.Root>
    </Main.ComplementarySidebar>
  );
};

type ComplementarySidebarPanelProps = {
  panel: Panel;
  activePanelId: string;
  data?: {
    id: string;
    subject: any;
    workspace: string;
    popoverAnchorId?: string;
  };
  hoistStatusbar: boolean;
};

const ScrollArea = ({ children }: PropsWithChildren) => {
  return (
    <NaturalScrollArea.Root>
      <NaturalScrollArea.Viewport>{children}</NaturalScrollArea.Viewport>
      <NaturalScrollArea.Scrollbar orientation='vertical'>
        <NaturalScrollArea.Thumb />
      </NaturalScrollArea.Scrollbar>
    </NaturalScrollArea.Root>
  );
};

const ComplementarySidebarPanel = ({ panel, activePanelId, data, hoistStatusbar }: ComplementarySidebarPanelProps) => {
  const { t } = useTranslation(DECK_PLUGIN);

  if (panel.id !== activePanelId || !data) {
    return null;
  }

  const Wrapper = panel.fixed ? Fragment : ScrollArea;

  return (
    <>
      <h2 className='flex items-center pli-2 border-separator border-be'>{toLocalizedString(panel.label, t)}</h2>
      <Wrapper>
        <Surface
          role={`complementary--${activePanelId}`}
          data={data}
          fallback={PlankContentError}
          placeholder={<PlankLoading />}
        />
      </Wrapper>
      {!hoistStatusbar && (
        <div
          role='contentinfo'
          className='flex flex-wrap justify-center items-center border-bs border-separator pbs-1 pbe-[max(env(safe-area-inset-bottom),0.25rem)]'
        >
          <Surface role='status-bar--r1-footer' limit={1} />
        </div>
      )}
    </>
  );
};
