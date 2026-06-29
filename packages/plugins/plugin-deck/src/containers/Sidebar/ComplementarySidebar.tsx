//
// Copyright 2024 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Label, IconButton, Main, Panel, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { iconSize, mx } from '@dxos/ui-theme';

import { type DeckCompanion, useBreakpoints, useDeckCompanions, useDeckState } from '#hooks';
import { meta } from '#meta';
import { getMode } from '#types';

import { layoutAppliesTopbar } from '../../util';
import { PlankErrorFallback, PlankLoading } from '../Deck/PlankFallback';
import { ToggleComplementarySidebarButton } from './SidebarButton';

const label = ['complementary-sidebar.title', { ns: meta.profile.key }] satisfies Label;

export type ComplementarySidebarProps = {
  current?: string;
};

export const ComplementarySidebar = ({ current }: ComplementarySidebarProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);

  const companions = useDeckCompanions();
  const activeCompanion = companions.find((companion) => getLinkedVariant(companion.id) === current);
  const activeId = activeCompanion && getLinkedVariant(activeCompanion.id);
  const [internalValue, setInternalValue] = useState(activeId);

  useEffect(() => {
    setInternalValue(activeId);
  }, [activeId]);

  const handleTabClick = useCallback(
    (event: MouseEvent) => {
      const nextValue = event.currentTarget.getAttribute('data-value') as string;
      if (nextValue === activeId) {
        updateState((state) => ({
          ...state,
          complementarySidebarState: state.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded',
        }));
      } else {
        setInternalValue(nextValue);
        updateState((state) => ({ ...state, complementarySidebarState: 'expanded' }));
        void invokePromise(LayoutOperation.UpdateComplementary, { subject: nextValue });
      }
    },
    [state.complementarySidebarState, activeId, invokePromise, updateState],
  );

  const data = useMemo(
    () =>
      activeCompanion && {
        id: activeCompanion.id,
        subject: activeCompanion.data,
      },
    [activeCompanion?.id, activeCompanion?.data],
  );

  useEffect(() => {
    if (!activeId) {
      void invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
    }
  }, [activeId, invokePromise]);

  return (
    <Main.ComplementarySidebar
      label={label}
      classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]']}
    >
      {/* R0 Tabs */}
      <Tabs.Root classNames='contents' orientation='vertical' value={internalValue}>
        <div
          data-tauri-drag-region
          style={iconSize(5)}
          className={mx(
            'absolute z-1 inset-y-0 end-0 w-(--dx-r0-size)!',
            'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s border-subdued-separator',
            'grid grid-cols-1 grid-rows-[1fr_min-content] bg-r0-surface dx-contain-layout dx-app-drag',
          )}
        >
          <Tabs.Tablist classNames='grid grid-cols-1 auto-rows-(--dx-rail-action) overflow-y-auto scrollbar-none gap-1 p-1'>
            {companions.map((companion) => (
              <Tabs.Tab key={getLinkedVariant(companion.id)} value={getLinkedVariant(companion.id)} asChild>
                <IconButton
                  classNames='w-(--dx-rail-action) h-(--dx-rail-action) min-h-0 px-0'
                  label={toLocalizedString(companion.properties.label, t)}
                  icon={companion.properties.icon}
                  iconOnly
                  tooltipSide='left'
                  data-value={getLinkedVariant(companion.id)}
                  {...(companion.properties.joyride && { 'data-joyride': companion.properties.joyride })}
                  variant={
                    activeId === getLinkedVariant(companion.id)
                      ? state.complementarySidebarState === 'expanded'
                        ? 'primary'
                        : 'ghost'
                      : 'ghost'
                  }
                  onClick={handleTabClick}
                />
              </Tabs.Tab>
            ))}
          </Tabs.Tablist>
          <div
            className='grid grid-cols-1 auto-rows-(--dx-rail-item) py-0.5 gap-0.5 overflow-y-auto scrollbar-none'
            style={iconSize(4)}
          >
            <Surface.Surface type={AppSurface.StatusIndicator} />
          </div>
          <div className='hidden lg:grid grid-cols-1 auto-rows-(--dx-rail-action) p-1'>
            <ToggleComplementarySidebarButton />
          </div>
        </div>

        {/* R1 Content. */}
        {activeId &&
          companions.map((companion) => (
            <Tabs.Panel
              key={getLinkedVariant(companion.id)}
              value={getLinkedVariant(companion.id)}
              classNames={[
                'absolute data-[state="inactive"]:-z-[1] overflow-hidden',
                'inset-y-0 start-0 w-full lg:w-(--dx-r1-size)',
              ]}
              {...(state.complementarySidebarState !== 'expanded' && { inert: true })}
            >
              <ComplementarySidebarPanel companion={companion} activeId={activeId} data={data} />
            </Tabs.Panel>
          ))}
      </Tabs.Root>
    </Main.ComplementarySidebar>
  );
};

type ComplementarySidebarPanelProps = {
  companion: DeckCompanion;
  activeId: string;
  data?: {
    id: string;
    subject: any;
  };
};

const ComplementarySidebarPanel = ({ companion, activeId, data }: ComplementarySidebarPanelProps) => {
  const { t } = useTranslation(meta.profile.key);

  if (getLinkedVariant(companion.id) !== activeId && !data) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild size='lg'>
        <Toolbar.Root style={iconSize(5)} classNames='bg-header-surface'>
          <IconButton
            classNames='w-(--dx-rail-action) h-(--dx-rail-action) min-h-0 px-0'
            label={toLocalizedString(companion.properties.label, t)}
            icon={companion.properties.icon}
            iconOnly
            tooltipSide='left'
            data-value={getLinkedVariant(companion.id)}
            variant='default'
          />
          <div className='px-1'>{toLocalizedString(companion.properties.label, t)}</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='bg-r1-surface'>
        <Surface.Surface
          type={AppSurface.deckCompanion(getLinkedVariant(companion.id))}
          data={data}
          fallback={PlankErrorFallback}
          placeholder={<PlankLoading />}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
