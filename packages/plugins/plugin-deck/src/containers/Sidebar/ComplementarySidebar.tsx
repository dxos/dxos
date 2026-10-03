//
// Copyright 2024 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import {
  Button,
  type Label,
  Main,
  Panel,
  Tabs,
  Toolbar,
  toLocalizedString,
  useMainLandmark,
  useTranslation,
} from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { iconSize, mx } from '@dxos/ui-theme';

import { PlankLoading } from '#components';
import { type DeckCompanion, useBreakpoints, useDeckCompanions, useDeckState } from '#hooks';
import { meta } from '#meta';

import { isDeckCompanionMounted, layoutAppliesTopbar } from '../../util/index.ts';
import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';
import { ToggleComplementarySidebarButton } from './SidebarButton.tsx';

const label = ['complementary-sidebar.title', { ns: meta.profile.key }] satisfies Label;

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
  const [selectedVariant, setSelectedVariant] = useState(activeId);

  useEffect(() => {
    setSelectedVariant(activeId);
  }, [activeId]);

  const handleTabClick = useCallback(
    (event: MouseEvent) => {
      const nextValue = event.currentTarget.getAttribute('data-value') as string;
      if (nextValue === selectedVariant) {
        updateState((state) => ({
          ...state,
          complementarySidebarState: state.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded',
        }));
      } else {
        setSelectedVariant(nextValue);
        updateState((state) => ({ ...state, complementarySidebarState: 'expanded' }));
        void invokePromise(LayoutOperation.UpdateComplementary, { subject: nextValue });
      }
    },
    [state.complementarySidebarState, selectedVariant, invokePromise, updateState],
  );

  const hasPersistedPanel = current !== undefined;
  useEffect(() => {
    if (!hasPersistedPanel) {
      void invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
    }
  }, [hasPersistedPanel, invokePromise]);

  // R0 follows the R1 panel beside it.
  const railLandmark = useMainLandmark(2.5);

  return (
    <Main.ComplementarySidebar
      // The rail and the panel are focus areas of their own.
      landmark={false}
      label={label}
      classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]']}
    >
      {/* R0 Tabs */}
      <Tabs.Root classNames='contents' orientation='vertical' value={selectedVariant} keepMounted>
        <div
          {...railLandmark}
          data-tauri-drag-region='deep'
          style={iconSize(5)}
          className={mx(
            'absolute z-5 inset-y-0 end-0 w-(--dx-r0-size)!',
            'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s border-separator-subtle',
            'grid grid-cols-1 grid-rows-[1fr_min-content] dx-r0-surface dx-contain-layout dx-app-drag',
          )}
        >
          <Tabs.List classNames='grid grid-cols-1 justify-items-center auto-rows-(--dx-rail-action) overflow-y-auto scrollbar-none gap-1 p-1'>
            {companions.map((companion) => (
              <Tabs.Trigger
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
                  selectedVariant === Attention.getLinkedVariant(companion.id)
                    ? state.complementarySidebarState === 'expanded'
                      ? 'primary'
                      : 'ghost'
                    : 'ghost'
                }
                onClick={handleTabClick}
              />
            ))}
          </Tabs.List>
          <div
            className='grid grid-cols-1 justify-items-center auto-rows-(--dx-rail-item) py-0.5 gap-0.5 overflow-y-auto scrollbar-none'
            style={iconSize(4)}
          >
            <Surface.Surface type={AppSurface.StatusIndicator} />
          </div>
          <div className='hidden lg:grid grid-cols-1 justify-items-center auto-rows-(--dx-rail-action) p-1'>
            {/* Rail-action sized like the tab triggers above it, so the glyphs share one centre line. */}
            <ToggleComplementarySidebarButton classNames='w-(--dx-rail-action) h-(--dx-rail-action) min-h-0 px-0' />
          </div>
        </div>

        {/* R1 Content. */}
        {companions.map((companion) => (
          <ComplementarySidebarContent
            key={Attention.getLinkedVariant(companion.id)}
            value={Attention.getLinkedVariant(companion.id)}
            selected={selectedVariant === Attention.getLinkedVariant(companion.id)}
            inert={state.complementarySidebarState !== 'expanded'}
          >
            <ComplementarySidebarPanel
              companion={companion}
              mounted={isDeckCompanionMounted({
                mount: companion.properties.mount,
                variant: Attention.getLinkedVariant(companion.id),
                selectedVariant,
                sidebarState: state.fullscreen ? 'closed' : state.complementarySidebarState,
              })}
            />
          </ComplementarySidebarContent>
        ))}
      </Tabs.Root>
    </Main.ComplementarySidebar>
  );
};

type ComplementarySidebarPanelProps = {
  companion: DeckCompanion;
  mounted: boolean;
};

const ComplementarySidebarPanel = ({ companion, mounted }: ComplementarySidebarPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ id: companion.id, subject: companion.data }), [companion.id, companion.data]);

  if (!mounted) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root size='lg' style={iconSize(5)} classNames='dx-header-surface'>
          <Button
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
      </Panel.Header>
      <Panel.Body classNames='dx-r1-surface'>
        <Surface.Surface
          type={AppSurface.deckCompanion(Attention.getLinkedVariant(companion.id))}
          data={data}
          fallback={PlankErrorFallback}
          placeholder={<PlankLoading />}
        />
      </Panel.Body>
    </Panel.Root>
  );
};

ComplementarySidebar.displayName = 'ComplementarySidebar';

type ComplementarySidebarContentProps = PropsWithChildren<{ value: string; selected: boolean; inert: boolean }>;

/** An R1 panel; the selected one is a focus area of the shell (the hidden ones stay mounted beneath it). */
const ComplementarySidebarContent = ({ value, selected, inert, children }: ComplementarySidebarContentProps) => {
  const landmark = useMainLandmark(2);
  return (
    <Tabs.Content
      {...(selected && !inert && landmark)}
      value={value}
      classNames={[
        'absolute data-[state="inactive"]:-z-[1] overflow-hidden',
        'inset-y-0 start-0 w-full lg:w-(--dx-r1-size)',
      ]}
      {...(inert && { inert: true })}
    >
      {children}
    </Tabs.Content>
  );
};
