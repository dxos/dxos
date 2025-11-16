//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { useMediaQuery } from '@dxos/react-ui';
import { Calendar, type CalendarController } from '@dxos/react-ui-calendar';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { type Journal } from '../types';

import { Journal as JournalComponent, type JournalProps } from './Journal';

export const JournalContainer = ({
  subject,
  showCalendar = true,
}: SurfaceComponentProps<Journal.Journal, { showCalendar?: boolean }>) => {
  const controllerRef = useRef<CalendarController>(null);

  // TODO(burdon): Instead of media query should check physical geometry of plank.
  const [isNotMobile] = useMediaQuery('md');

  const handleSelect = useCallback<NonNullable<JournalProps['onSelect']>>(({ date }) => {
    controllerRef.current?.scrollTo(date);
  }, []);

  return (
    <StackItem.Content>
      <div
        className={mx(
          showCalendar
            ? isNotMobile
              ? 'bs-full grid grid-cols-[min-content_1fr] overflow-hidden'
              : 'flex flex-col overflow-hidden'
            : 'contents',
        )}
      >
        {showCalendar && (
          <Calendar.Root ref={controllerRef}>
            <Calendar.Viewport>
              <Calendar.Toolbar />
              <Calendar.Grid rows={isNotMobile ? undefined : 6} />
            </Calendar.Viewport>
          </Calendar.Root>
        )}

        <JournalComponent journal={subject} classNames='container-max-width' onSelect={handleSelect} />
      </div>
    </StackItem.Content>
  );
};

export default JournalContainer;
