//
// Copyright 2024 DXOS.org
//

import React, {
  Fragment,
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LayoutAction, Surface, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { IconButton, type Label, Main, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';

import { DeckCapabilities } from '../../capabilities';
import { type DeckCompanion, getCompanionId, useBreakpoints, useDeckCompanions, useHoistStatusbar } from '../../hooks';
import { meta } from '../../meta';
import { getMode } from '../../types';
import { layoutAppliesTopbar } from '../../util';
import { PlankContentError, PlankLoading } from '../Plank';

import { ToggleComplementarySidebarButton } from './SidebarButton';

const label = ['complementary sidebar title', { ns: meta.id }] satisfies Label;

export type ComplementarySidebarProps = {
  current?: string;
};

export const ComplementarySidebar = ({ current }: ComplementarySidebarProps) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layout = useCapability(DeckCapabilities.MutableDeckState);
  const layoutMode = getMode(layout.deck);
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const companions = useDeckCompanions();
  const activeCompanion = companions.find((companion) => getCompanionId(companion.id) === current);
  const activeId = activeCompanion && getCompanionId(activeCompanion.id);
  const [internalValue, setInternalValue] = useState(activeId);

  useEffect(() => {
    setInternalValue(activeId);
  }, [activeId]);

  const handleTabClick = useCallback(
    (event: MouseEvent) => {
      const nextValue = event.currentTarget.getAttribute('data-value') as string;
      if (nextValue === activeId) {
        layout.complementarySidebarState = layout.complementarySidebarState === 'expanded' ? 'collapsed' : 'expanded';
      } else {
        setInternalValue(nextValue);
        layout.complementarySidebarState = 'expanded';
        void dispatch(createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', subject: nextValue }));
      }
    },
    [layout, activeId, dispatch],
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
      void dispatch(
        createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', options: { state: 'collapsed' } }),
      );
    }
  }, [activeId, dispatch]);

  return (
    <Main.ComplementarySidebar
      label={label}
      classNames={[
        topbar && 'block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
        hoistStatusbar && 'block-end-[--statusbar-size]',
      ]}
    >
      <Tabs.Root orientation='vertical' verticalVariant='stateless' value={internalValue} classNames='contents'>
        <div
          role='none'
          className='absolute z-[1] inset-block-0 inline-end-0 !is-[--r0-size] pbs-[env(safe-area-inset-top)] pbe-[env(safe-area-inset-bottom)] border-is border-subduedSeparator grid grid-cols-1 grid-rows-[1fr_min-content] bg-baseSurface contain-layout app-drag'
        >
          <Tabs.Tablist classNames='grid grid-cols-1 auto-rows-[--rail-action] p-1 gap-1 !overflow-y-auto'>
            {companions.map((companion) => (
              <Tabs.Tab key={getCompanionId(companion.id)} value={getCompanionId(companion.id)} asChild>
                <IconButton
                  label={toLocalizedString(companion.properties.label, t)}
                  icon={companion.properties.icon}
                  iconOnly
                  tooltipSide='left'
                  data-value={getCompanionId(companion.id)}
                  variant={
                    activeId === getCompanionId(companion.id)
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
        {activeId &&
          companions.map((companion) => (
            <Tabs.Tabpanel
              key={getCompanionId(companion.id)}
              value={getCompanionId(companion.id)}
              classNames='absolute data-[state="inactive"]:-z-[1] inset-block-0 inline-start-0 is-[calc(100%-var(--r0-size))] lg:is-[--r1-size] grid grid-cols-1 grid-rows-[var(--rail-size)_1fr_min-content] pbs-[env(safe-area-inset-top)]'
              {...(layout.complementarySidebarState !== 'expanded' && { inert: true })}
            >
              <ComplementarySidebarPanel
                companion={companion}
                activeId={activeId}
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
  companion: DeckCompanion;
  activeId: string;
  data?: {
    id: string;
    subject: any;
  };
  hoistStatusbar: boolean;
};

const ScrollArea = ({ children }: PropsWithChildren) => {
  return <div className='flex flex-col grow overflow-x-hidden overflow-y-auto scrollbar-thin'>{children}</div>;
};

const ComplementarySidebarPanel = ({ companion, activeId, data, hoistStatusbar }: ComplementarySidebarPanelProps) => {
  const { t } = useTranslation(meta.id);

  if (getCompanionId(companion.id) !== activeId && !data) {
    return null;
  }

  const Wrapper = companion.properties.fixed ? Fragment : ScrollArea;

  return (
    <>
      <h2 className='flex items-center pli-2 border-subduedSeparator border-be font-medium'>
        {toLocalizedString(companion.properties.label, t)}
      </h2>
      <Wrapper>
        <Surface
          role={`deck-companion--${getCompanionId(companion.id)}`}
          data={data}
          fallback={PlankContentError}
          placeholder={<PlankLoading />}
        />
      </Wrapper>
      {!hoistStatusbar && (
        <div
          role='contentinfo'
          className='flex flex-wrap justify-center items-center border-bs border-subduedSeparator pbs-1 pbe-[max(env(safe-area-inset-bottom),0.25rem)]'
        >
          <Surface role='status-bar--r1-footer' limit={1} />
        </div>
      )}
    </>
  );
};
