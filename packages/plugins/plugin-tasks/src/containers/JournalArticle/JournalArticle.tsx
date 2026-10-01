//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next, Show, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { Calendar, type CalendarController } from '@dxos/react-ui-calendar';
import { mx } from '@dxos/ui-theme';

import { Journal as JournalComponent, type JournalProps } from '#components';
import { meta } from '#meta';
import { Journal } from '#types';

export type JournalArticleProps = AppSurface.ObjectArticleProps<Journal.Journal>;

export const JournalArticle = ({ role, attendableId: _attendableId, subject: journal }: JournalArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [showCalendar, setShowCalendar] = useState(false);
  const controllerRef = useRef<CalendarController>(null);

  // TODO(burdon): Instead of media query should check physical geometry of plank.
  const [isNotMobile] = useMediaQuery('md');

  const handleSelect = useCallback<NonNullable<JournalProps['onSelect']>>(({ date }) => {
    controllerRef.current?.scrollTo(date);
  }, []);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.ToggleGroup
            type='single'
            value={showCalendar ? 'calendar' : ''}
            onValueChange={(value) => setShowCalendar(value === 'calendar')}
          >
            <Next.ToggleGroup.Item
              value='calendar'
              label={t('toggle-calendar.label')}
              icon='ph--calendar--regular'
              iconOnly
            />
          </Next.Toolbar.ToggleGroup>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        {/* TODO(burdon): Splitter. */}
        <div
          className={mx(
            showCalendar
              ? isNotMobile
                ? 'h-full grid grid-cols-[min-content_1fr] overflow-hidden'
                : 'flex flex-col overflow-hidden'
              : 'contents',
          )}
        >
          <Show when={showCalendar}>
            <Calendar.Root ref={controllerRef}>
              <Next.Panel.Root>
                <Next.Panel.Header>
                  <Calendar.Toolbar />
                </Next.Panel.Header>
                <Next.Panel.Body asChild>
                  <Calendar.Grid rows={isNotMobile ? undefined : 6} />
                </Next.Panel.Body>
              </Next.Panel.Root>
            </Calendar.Root>
          </Show>

          <JournalComponent journal={journal} classNames='dx-document' onSelect={handleSelect} />
        </div>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

JournalArticle.displayName = 'JournalArticle';
