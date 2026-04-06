//
// Copyright 2024 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getCompanionVariant } from '@dxos/app-toolkit';
import { IconButton, type Label, Main, Panel, toLocalizedString, Toolbar, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';
import { iconSize, mx } from '@dxos/ui-theme';

import { type DeckCompanion, useBreakpoints, useDeckCompanions, useDeckState, useHoistStatusbar } from '../../hooks';
import { meta } from '../../meta';
import { getMode } from '#types';
import { layoutAppliesTopbar } from '../../util';
import { PlankErrorFallback, PlankLoading } from '../Plank';

import { ToggleComplementarySidebarButton } from './SidebarButton';

const label = ['complementary-sidebar.title', { ns: meta.id }] satisfies Label;

export type ComplementarySidebarProps = {
  current?: string;
};

export const ComplementarySidebar = ({ current }: ComplementarySidebarProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.id);
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const companions = useDeckCompanions();
  const activeCompanion = companions.find((companion) => getCompanionVariant(companion.id) === current);
  const activeId = activeCompanion && getCompanionVariant(activeCompanion.id);
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
      classNames={[
        topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]',
        hoistStatusbar && 'bottom-(--dx-statusbar-size)',
      ]}
    >
      {/* TODO(burdon): asChild. */}
      <Tabs.Root orientation='vertical' value={internalValue} classNames='contents'>
        <div
          data-tauri-drag-region
          role='none'
          style={iconSize(5)}
          className={mx(
            'absolute z-20 inset-y-0 end-0 w-(--dx-r0-size)!',
            'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s border-subdued-separator',
            'grid grid-cols-1 grid-rows-[1fr_min-content] bg-toolbar-surface dx-contain-layout dx-app-drag',
          )}
        >
          {/* TODO(burdon): ScrollArea. */}
          <Tabs.Tablist classNames='grid grid-cols-1 auto-rows-(--dx-rail-action) overflow-y-auto'>
            {companions.map((companion) => (
              <Tabs.Tab key={getCompanionVariant(companion.id)} value={getCompanionVariant(companion.id)} asChild>
                <IconButton
                  label={toLocalizedString(companion.properties.label, t)}
                  icon={companion.properties.icon}
                  iconOnly
                  tooltipSide='left'
                  data-value={getCompanionVariant(companion.id)}
                  variant={
                    activeId === getCompanionVariant(companion.id)
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
          {!hoistStatusbar && (
            <div
              role='none'
              className='grid grid-cols-1 auto-rows-(--dx-rail-item) gap-0.5 overflow-y-auto'
              style={iconSize(4)}
            >
              <Surface.Surface role='status-indicator' />
            </div>
          )}
          <div role='none' className='hidden lg:grid grid-cols-1 auto-rows-(--dx-rail-action) p-1'>
            <ToggleComplementarySidebarButton />
          </div>
        </div>
        {activeId &&
          companions.map((companion) => (
            <Tabs.Panel
              key={getCompanionVariant(companion.id)}
              value={getCompanionVariant(companion.id)}
              classNames={[
                'absolute data-[state="inactive"]:-z-[1] overflow-hidden',
                'inset-y-0 start-0 w-[calc(100%-var(--dx-r0-size))] lg:w-(--dx-r1-size)',
              ]}
              {...(state.complementarySidebarState !== 'expanded' && { inert: true })}
            >
              <ComplementarySidebarPanel
                companion={companion}
                activeId={activeId}
                data={data}
                hoistStatusbar={hoistStatusbar}
              />
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
  hoistStatusbar: boolean;
};

const ComplementarySidebarPanel = ({ companion, activeId, data, hoistStatusbar }: ComplementarySidebarPanelProps) => {
  const { t } = useTranslation(meta.id);

  if (getCompanionVariant(companion.id) !== activeId && !data) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild size='lg'>
        <Toolbar.Root classNames='bg-modal-surface border-b border-subdued-separator'>
          <IconButton
            label={toLocalizedString(companion.properties.label, t)}
            icon={companion.properties.icon}
            iconOnly
            tooltipSide='left'
            data-value={getCompanionVariant(companion.id)}
            classNames='h-10 w-10'
            variant='default'
          />
          <div role='none' className='px-1'>
            {toLocalizedString(companion.properties.label, t)}
          </div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='bg-base-surface'>
        <Surface.Surface
          role={`deck-companion--${getCompanionVariant(companion.id)}`}
          data={data}
          fallback={PlankErrorFallback}
          placeholder={<PlankLoading />}
        />
      </Panel.Content>
      {!hoistStatusbar && (
        <Panel.Statusbar classNames='px-1' size='sm'>
          <Surface.Surface role='status-bar--r1-footer' limit={1} />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
