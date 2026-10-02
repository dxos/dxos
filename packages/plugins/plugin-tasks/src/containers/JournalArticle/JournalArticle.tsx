//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Calendar, type CalendarController } from '@dxos/react-ui-calendar';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Show from '@dxos/react-ui/Show';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { Journal as JournalComponent, type JournalProps } from '#components';
import { meta } from '#meta';
import { Journal } from '#types';

export type JournalArticleProps = AppSurface.ObjectArticleProps<Journal.Journal>;

export const JournalArticle = ({ role, attendableId: _attendableId, subject: journal }: JournalArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [showCalendar, setShowCalendar] = useState(false);
  const controllerRef = useRef<CalendarController>(null);

  // TODO(burdon): Instead of media query should check physical geometry of plank.
  const [isNotMobile] = Hooks.useMediaQuery('md');

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
          <Show.Root when={showCalendar}>
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
          </Show.Root>

          <JournalComponent journal={journal} classNames='dx-document' onSelect={handleSelect} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

JournalArticle.displayName = 'JournalArticle';
