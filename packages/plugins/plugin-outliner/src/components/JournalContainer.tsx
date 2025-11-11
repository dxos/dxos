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
  object,
  showCalendar = true,
}: SurfaceComponentProps<Journal.Journal, { showCalendar?: boolean }>) => {
  const controllerRef = useRef<CalendarController>(null);
  const [isNotMobile] = useMediaQuery('md');

  const handleSelect = useCallback<NonNullable<JournalProps['onSelect']>>(({ date }) => {
    controllerRef.current?.scrollTo(date);
  }, []);

  console.log(isNotMobile);

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
              <Calendar.Header />
              <Calendar.Grid rows={isNotMobile ? undefined : 6} />
            </Calendar.Viewport>
          </Calendar.Root>
        )}

        <JournalComponent journal={object} classNames='container-max-width' onSelect={handleSelect} />
      </div>
    </StackItem.Content>
  );
};

export default JournalContainer;
