//
// Copyright 2023 DXOS.org

import format from 'date-fns/format';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import { Clock, GridFour, List, SquareHalf } from 'phosphor-react';
import React, { useState } from 'react';
import { dateFnsLocalizer, Calendar as ReactBigCalendar, Event, Views } from 'react-big-calendar';

import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

// import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSpace } from '../hooks';
import { Event as EventType } from '../proto';

const mapEvents = (event: EventType) => ({
  title: event.title,
  start: new Date(event.start),
  end: new Date(event.end)
});

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

const views = [
  { view: Views.MONTH, Icon: GridFour },
  { view: Views.WEEK, Icon: SquareHalf },
  { view: Views.AGENDA, Icon: List }
];

// TODO(burdon): Custom views:
//  - https://jquense.github.io/react-big-calendar/examples/index.html?path=/docs/examples--example-8
//  - https://github.com/jquense/react-big-calendar/blob/master/stories/demos/exampleCode/rendering.js
//  - https://jquense.github.io/react-big-calendar/examples/index.html?path=/docs/guides-creating-custom-views--page

const components: any = {
  agenda: {
    event: ({ event }: { event: Event }) => (
      <div className='flex'>
        <div>{event.title}</div>
      </div>
    )
  },

  // TODO(burdon): Remove time.
  event: ({ event }: { event: Event }) => {
    return <div>{event.title}</div>;
  }
};

/**
 * https://jquense.github.io/react-big-calendar/examples/index.html?path=/story/about-big-calendar--page
 */
export const CalendarView = () => {
  const { space } = useSpace();
  const events = useQuery(space, EventType.filter()).map(mapEvents);
  const [view, setView] = useState<any>(Views.AGENDA);

  return (
    <div className='flex flex-1 flex-col justify-center overflow-hidden'>
      <div className='flex m-2'>
        <div>
          <button>
            <Clock className={getSize(6)} />
          </button>
        </div>
        <div className='flex-1' />
        <div>
          {views.map(({ view: v, Icon }) => (
            <button key={v} className={mx('text-gray-300', v === view && 'text-gray-700')} onClick={() => setView(v)}>
              <Icon weight='light' className={getSize(6)} />
            </button>
          ))}
        </div>
      </div>

      <div className={mx('flex flex-1 overflow-hidden [&>div]:w-full', '[&>div>div>table]:hidden')}>
        <ReactBigCalendar
          // date={new Date(2023, 0, 15)}
          view={view}
          onView={(view: any) => setView(view)} // Required
          toolbar={false}
          localizer={localizer}
          events={events}
          startAccessor='start'
          endAccessor='end'
          components={components}
        />
      </div>
    </div>
  );
};
