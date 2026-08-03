//
// Copyright 2024 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, type Label, Main, Panel, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { Tabs } from '@dxos/react-ui-tabs';
import { iconSize, mx } from '@dxos/ui-theme';

import { type DeckCompanion, useBreakpoints, useDeckCompanions, useDeckState } from '#hooks';
import { meta } from '#meta';

import { layoutAppliesTopbar } from '../../util';
import { PlankErrorFallback, PlankLoading } from '../Deck/PlankFallback';
import { ToggleComplementarySidebarButton } from './SidebarButton';
import { SidebarResizeHandle } from './SidebarResizeHandle';

const label = ['complementary-sidebar.title', { ns: meta.profile.key }] satisfies Label;

/** The theme property the sidebar's expanded width is read from; `--dx-r1-size` derives from it. */
const SIZE_PROPERTY = '--dx-complementary-sidebar-size';

/** Mirrors the theme default for {@link SIZE_PROPERTY}, used until the user drags the seam. */
const DEFAULT_SIZE = 25;
const MIN_SIZE = 18;
const MAX_SIZE = 60;

export type ComplementarySidebarProps = {
  current?: string;
};

export const ComplementarySidebar = ({ current }: ComplementarySidebarProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const { state, updateState } = useDeckState();
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, !!state.fullscreen);

  const companions = useDeckCompanions();
  const activeCompanion = companions.find((companion) => Attention.getLinkedVariant(companion.id) === current);
  const activeId = activeCompanion && Attention.getLinkedVariant(activeCompanion.id);
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

  const size = state.complementarySidebarSize ?? DEFAULT_SIZE;

  // Publish the committed width where the theme declares it, so the sidebar and everything sized
  // against it (the deck, `--dx-r1-size`) agree. The drag previews the same property directly.
  useEffect(() => {
    document.documentElement.style.setProperty(SIZE_PROPERTY, `${size}rem`);
    return () => {
      document.documentElement.style.removeProperty(SIZE_PROPERTY);
    };
  }, [size]);

  const handleSizeChange = useCallback(
    (next: number) => updateState((state) => ({ ...state, complementarySidebarSize: next })),
    [updateState],
  );

  return (
    <Main.ComplementarySidebar
      label={label}
      classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]']}
    >
      {state.complementarySidebarState === 'expanded' && (
        <SidebarResizeHandle
          classNames='hidden lg:block'
          property={SIZE_PROPERTY}
          side='inline-end'
          size={size}
          minSize={MIN_SIZE}
          maxSize={MAX_SIZE}
          label={t('resize-complementary-sidebar.label')}
          onSizeChange={handleSizeChange}
        />
      )}
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
              <Tabs.IconButton
                key={Attention.getLinkedVariant(companion.id)}
                value={Attention.getLinkedVariant(companion.id)}
                classNames='w-(--dx-rail-action) h-(--dx-rail-action) min-h-0 px-0'
                label={toLocalizedString(companion.properties.label, t)}
                icon={companion.properties.icon}
                iconOnly
                tooltipSide='left'
                data-value={Attention.getLinkedVariant(companion.id)}
                {...(companion.properties.joyride && { 'data-joyride': companion.properties.joyride })}
                variant={
                  activeId === Attention.getLinkedVariant(companion.id)
                    ? state.complementarySidebarState === 'expanded'
                      ? 'primary'
                      : 'ghost'
                    : 'ghost'
                }
                onClick={handleTabClick}
              />
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
              key={Attention.getLinkedVariant(companion.id)}
              value={Attention.getLinkedVariant(companion.id)}
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

  if (Attention.getLinkedVariant(companion.id) !== activeId && !data) {
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
            data-value={Attention.getLinkedVariant(companion.id)}
            variant='default'
          />
          <div className='px-1'>{toLocalizedString(companion.properties.label, t)}</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='bg-r1-surface'>
        <Surface.Surface
          type={AppSurface.deckCompanion(Attention.getLinkedVariant(companion.id))}
          data={data}
          fallback={PlankErrorFallback}
          placeholder={<PlankLoading />}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

ComplementarySidebar.displayName = 'ComplementarySidebar';
