//
// Copyright 2023 DXOS.org

import format from 'date-fns/format';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import { DotsNine, List, Table } from 'phosphor-react';
import React from 'react';
import { Calendar as ReactBigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';

import { getSize } from '@dxos/react-components';

import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

/**
 * https://jquense.github.io/react-big-calendar/examples/index.html?path=/story/about-big-calendar--page
 */
export const Calendar = () => {
  // TODO(burdon): Import from bot.
  const events: any[] = [
    {
      title: 'Demo',
      start: new Date(2023, 0, 15, 18, 0, 0),
      end: new Date(2023, 0, 15, 19, 30, 0),
      allDay: false
    },
    {
      title: 'The Jonan Show',
      start: new Date(2023, 0, 16, 11, 0, 0),
      end: new Date(2023, 0, 16, 12, 0, 0),
      allDay: false
    },
    {
      title: 'Stand-up',
      start: new Date(2023, 0, 17, 10, 0, 0),
      end: new Date(2023, 0, 17, 10, 30, 0),
      allDay: false
    },
    {
      title: 'Meet with Blueyard',
      start: new Date(2023, 0, 18, 12, 0, 0),
      end: new Date(2023, 0, 18, 13, 30, 0),
      allDay: false
    }
  ];

  return (
    <div className='flex flex-1 flex-col justify-center overflow-hidden m-2'>
      <div className='flex flex-1'>
        <div className='flex-1' />
        <div>
          <button>
            <List className={getSize(6)} />
          </button>
          <button>
            <DotsNine className={getSize(6)} />
          </button>
          <button>
            <Table className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex w-[600px] overflow-hidden [&>div]:w-full'>
        <ReactBigCalendar
          // date={new Date(2023, 0, 15)}
          defaultView={Views.DAY}
          toolbar={false}
          localizer={localizer}
          events={events}
          startAccessor='start'
          endAccessor='end'
        />
      </div>
    </div>
  );
};
