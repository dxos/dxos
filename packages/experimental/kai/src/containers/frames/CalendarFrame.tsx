//
// Copyright 2023 DXOS.org

import format from 'date-fns/format';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import { Article, Clock, GridFour, SquareHalf, Tray, User } from 'phosphor-react';
import React, { useMemo, useState } from 'react';
import { dateFnsLocalizer, Calendar as ReactBigCalendar, Event, Views } from 'react-big-calendar';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

// import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSpace } from '../../hooks';
import { Contact, Event as EventType } from '../../proto';
import { ContactCard } from '../cards';

const mapEvents = (event: EventType) => ({
  title: event.title,
  start: new Date(event.start),
  end: new Date(event.end),
  resource: event
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
  { view: Views.DAY, Icon: Article },
  { view: Views.AGENDA, Icon: Tray }
];

/**
 * https://jquense.github.io/react-big-calendar/examples/index.html?path=/story/about-big-calendar--page
 */
export const CalendarFrame = () => {
  const space = useSpace();
  const events = useQuery(space, EventType.filter()).map(mapEvents);
  // TODO(burdon): Manage global state persistently.
  const [view, setView] = useState<any>(Views.MONTH);
  const [contact, setContact] = useState<Contact>();

  const components: any = useMemo(
    () => ({
      agenda: {
        event: ({ event }: { event: Event }) => (
          <div className='flex flex-col overflow-hidden'>
            <div>{event.title}</div>
            <div className='flex flex-col'>
              {(event.resource as EventType).members.map((member) => (
                <div key={member[id]} className='flex items-center overflow-hidden cursor-pointer'>
                  <div className='flex items-center mr-1 text-blue-500'>
                    <button onClick={() => setContact(member)}>
                      <User />
                    </button>
                  </div>
                  <div className='overflow-hidden text-ellipsis whitespace-nowrap w-[100px] text-blue-500'>
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      },

      // TODO(burdon): Remove time (currently via CSS).
      event: ({ event }: { event: Event }) => {
        return <div>{event.title}</div>;
      }
    }),
    []
  );

  return (
    <div className='flex flex-1 flex-col justify-center overflow-hidden'>
      <div className='flex m-2 pl-2 pr-2'>
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

      <div className={mx('flex flex-1 overflow-hidden p-4')}>
        <div className={mx('flex flex-1 overflow-y-auto', '[&>div]:w-full [&>div>div>table]:hidden')}>
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
        {view === Views.AGENDA && contact && (
          <div className='flex flex-1 border-l hidden md:flex pl-4'>
            <ContactCard contact={contact} />
          </div>
        )}
      </div>
    </div>
  );
};
