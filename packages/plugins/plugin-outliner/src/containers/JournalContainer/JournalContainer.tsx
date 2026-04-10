//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { Calendar, type CalendarController } from '@dxos/react-ui-calendar';
import { mx } from '@dxos/ui-theme';

import { Journal as JournalComponent, type JournalProps } from '#components';
import { meta } from '#meta';
import { type Journal } from '#types';

export type JournalContainerProps = AppSurface.ObjectArticleProps<Journal.Journal>;

export const JournalContainer = ({
  role,
  attendableId: _attendableId,
  subject: journal,
}: JournalContainerProps) => {
  const { t } = useTranslation(meta.id);
  const [showCalendar, setShowCalendar] = useState(false);
  const controllerRef = useRef<CalendarController>(null);

  // TODO(burdon): Instead of media query should check physical geometry of plank.
  const [isNotMobile] = useMediaQuery('md');

  const handleSelect = useCallback<NonNullable<JournalProps['onSelect']>>(({ date }) => {
    controllerRef.current?.scrollTo(date);
  }, []);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.ToggleGroup
            type='single'
            value={showCalendar ? 'calendar' : ''}
            onValueChange={(value) => setShowCalendar(value === 'calendar')}
          >
            <Toolbar.ToggleGroupIconItem
              value='calendar'
              label={t('toggle-calendar.label')}
              icon='ph--calendar--regular'
              iconOnly
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
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
          {showCalendar && (
            <Calendar.Root ref={controllerRef}>
              <Panel.Root>
                <Panel.Toolbar asChild>
                  <Calendar.Toolbar />
                </Panel.Toolbar>
                <Panel.Content asChild>
                  <Calendar.Grid rows={isNotMobile ? undefined : 6} />
                </Panel.Content>
              </Panel.Root>
            </Calendar.Root>
          )}

          <JournalComponent journal={journal} classNames='dx-document' onSelect={handleSelect} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
