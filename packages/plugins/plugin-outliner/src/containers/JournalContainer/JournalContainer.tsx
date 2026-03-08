//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useMediaQuery, Panel } from '@dxos/react-ui';
import { Calendar, type CalendarController } from '@dxos/react-ui-calendar';
import { mx } from '@dxos/ui-theme';

import { Journal as JournalComponent, type JournalProps } from '../../components/Journal';
import { type Journal } from '../../types';

export type JournalContainerProps = SurfaceComponentProps<Journal.Journal> & { showCalendar?: boolean };

export const JournalContainer = ({ role, subject: journal, showCalendar = true }: JournalContainerProps) => {
  const controllerRef = useRef<CalendarController>(null);

  // TODO(burdon): Instead of media query should check physical geometry of plank.
  const [isNotMobile] = useMediaQuery('md');

  const handleSelect = useCallback<NonNullable<JournalProps['onSelect']>>(({ date }) => {
    controllerRef.current?.scrollTo(date);
  }, []);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
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
              <Calendar.Viewport>
                <Calendar.Toolbar />
                <Calendar.Grid rows={isNotMobile ? undefined : 6} />
              </Calendar.Viewport>
            </Calendar.Root>
          )}

          <JournalComponent journal={journal} classNames='dx-article' onSelect={handleSelect} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
