//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database, DXN, Filter, Obj, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import * as MapSurface from '@dxos/plugin-map/MapSurface';
import { useSelection } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { timezones } from '@dxos/react-ui-geo/data';
import * as Button from '@dxos/react-ui/Button';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import config from '../dx.config.ts';

const meta = Plugin.getMetaFromConfig(config);
const GROUP = 'worldClockGroup';
const GROUP_TYPE = `${meta.profile.key}.group`;
const PAGE = 'worldClockPage';

// The type: one Clock per space, holding its clocks, each a timezone and where it is on the map.
const Location = Schema.Struct({ lat: Schema.Number, lng: Schema.Number });
const ClockEntry = Schema.Struct({
  timezone: Schema.String,
  location: Schema.optional(Location),
});
type ClockEntry = Schema.Schema.Type<typeof ClockEntry>;

export class Clock extends Type.makeObject<Clock>(DXN.make('org.example.type.worldClock', '0.2.0'))(
  Schema.Struct({ clocks: Schema.optional(Schema.Array(ClockEntry)) }),
) {}

type Page = { type: typeof PAGE; space: { db: Database.Database } };
const isPage = (data: unknown): data is Page =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === PAGE;

// A timezone's position is its principal city, from the tz database; a zone it does not list has no pin.
const makeEntry = (timezone: string): ClockEntry => ({ timezone, location: timezones[timezone] });

const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

// Every card has one fixed size, so the empty card lines up with the clocks and opening its form moves nothing.
const CARD: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'relative',
  flex: 'none',
  width: 240,
  height: 176,
  padding: 16,
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, currentColor 25%, transparent)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

// 24-hour and zero-padded, so every clock is the same width.
const TIME: Intl.DateTimeFormatOptions = { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' };

type ClockCardProps = {
  timeZone: string;
  now: Date;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

const ClockCard = ({ timeZone, now, selected, onSelect, onDelete }: ClockCardProps) => (
  <div
    data-testid='worldClock.clock'
    aria-selected={selected}
    style={{ ...CARD, cursor: 'pointer', ...(selected && { borderColor: 'rgb(14, 165, 233)' }) }}
    // A focusable button so the keyboard can select a clock as the pointer does.
    role='button'
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onSelect();
      }
    }}
  >
    <div style={{ opacity: 0.7 }}>{now.toLocaleDateString(undefined, { timeZone, dateStyle: 'medium' })}</div>
    <div style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums' }}>
      {now.toLocaleTimeString(undefined, { timeZone, ...TIME })}
    </div>
    <div style={{ opacity: 0.7 }}>{timeZone}</div>
    {/* Last, so it paints above the text it overlaps. */}
    <div style={{ position: 'absolute', top: 4, right: 4 }}>
      <Button.Root
        data-testid='worldClock.delete'
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label='Delete clock'
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      />
    </div>
  </div>
);

// The choices are the zones with a known position, so every clock added gets a pin.
const TimezoneForm = Schema.Struct({
  timezone: Schema.Literals(Object.keys(timezones)).annotate({ title: 'Timezone' }),
});

const AddClock = ({ onAdd }: { onAdd: (timeZone: string) => void }) => {
  const [adding, setAdding] = useState(false);
  return (
    <div
      data-testid='worldClock.new'
      style={{ ...CARD, borderStyle: 'dashed', alignItems: adding ? 'stretch' : 'center' }}
    >
      {adding ? (
        <Form.Root
          schema={TimezoneForm}
          onSave={({ timezone }) => {
            onAdd(timezone);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        >
          <Form.Content>
            <Form.Fields />
            <Form.Actions />
          </Form.Content>
        </Form.Root>
      ) : (
        <Button.Root
          data-testid='worldClock.add'
          variant='ghost'
          icon='ph--plus--regular'
          iconOnly
          size='xl'
          iconSize='xl'
          label='Add clock'
          onClick={() => setAdding(true)}
        />
      )}
    </div>
  );
};

const WorldClockArticle = ({ db }: { db?: Database.Database }) => {
  const now = useNow();
  const { invokePromise } = Hooks.useOperationInvoker();
  const [clock] = useQuery(db, Filter.type(Clock));
  // `useQuery` re-renders when the set of objects changes; `useObject` is what re-renders on a field change.
  const [stored] = useObject(clock, 'clocks');
  const clocks = stored ?? [makeEntry(localZone())];
  // The selection lives in the view state under the clock's URI, where the map surface reads it.
  const contextId = clock ? Obj.getURI(clock) : undefined;
  const selected = useSelection(contextId, 'single');
  const select = (timezone: string) =>
    contextId && void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single', id: timezone } });

  // Created on the first change rather than on first view: the query is empty until it has loaded.
  const save = (next: ClockEntry[]) => {
    if (clock) {
      Obj.update(clock, (clock) => {
        clock.clocks = next;
      });
    } else {
      db?.add(Obj.make(Clock, { clocks: next }));
    }
  };
  const add = (timezone: string) =>
    !clocks.some((entry) => entry.timezone === timezone) && save([...clocks, makeEntry(timezone)]);
  const remove = (timezone: string) => save(clocks.filter((entry) => entry.timezone !== timezone));

  // West to east, so the row reads left to right like the map; a clock with no position goes last.
  const sorted = [...clocks].sort(
    (left, right) =>
      (left.location?.lng ?? Number.POSITIVE_INFINITY) - (right.location?.lng ?? Number.POSITIVE_INFINITY),
  );

  const markers = clocks.flatMap(({ timezone, location }) =>
    location ? [{ id: timezone, title: timezone, location }] : [],
  );

  return (
    // The map fills the page above the row of clocks; a grid, since the scroll area fills whatever cell it is in.
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'minmax(0, 1fr) min-content' }}>
      <div style={{ minHeight: 0 }}>
        <Surface.Surface type={MapSurface.World} data={{ markers, subject: clock, view: 'map' }} limit={1} />
      </div>
      <ScrollArea.Root orientation='horizontal' width='thin'>
        <ScrollArea.Viewport>
          <div style={{ display: 'flex', gap: 16, padding: 16 }}>
            {sorted.map(({ timezone }) => (
              <ClockCard
                key={timezone}
                timeZone={timezone}
                now={now}
                selected={timezone === selected}
                onSelect={() => select(timezone)}
                onDelete={() => remove(timezone)}
              />
            ))}
            <AddClock onAdd={add} />
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

export default Plugin.define(meta).pipe(
  // Registered before the other modules, so the space can store a Clock.
  Plugin.addModule(AppCapability.schema([Clock])),
  Plugin.addModule({
    id: 'appGraph',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.AppGraphBuilder],
    activate: () =>
      Effect.gen(function* () {
        // A WORLD CLOCK heading in each space's navtree, between CONTENT and SYSTEM.
        const group = yield* AppGraphBuilder.createExtension({
          id: 'worldClockGroup',
          match: AppNodeMatcher.whenSpace,
          connector: (space) =>
            Effect.succeed([
              AppNode.makeGroup({ id: GROUP, type: GROUP_TYPE, label: 'World Clock', space, position: 400 }),
            ]),
        });
        // The Clocks page in that group; the URL binding is what lets the deck open it.
        const page = yield* AppGraphBuilder.createExtension({
          id: 'worldClockPage',
          match: AppNodeMatcher.whenNavTreeGroup(GROUP_TYPE),
          url: { key: PAGE, kind: 'singleton', path: [GROUP] },
          connector: (space) =>
            Effect.succeed([
              AppGraphNode.make({
                id: PAGE,
                type: `${meta.profile.key}.page`,
                data: { type: PAGE, space },
                properties: {
                  label: 'Clocks',
                  icon: 'ph--clock--regular',
                  selectable: true,
                  draggable: false,
                  droppable: false,
                  space,
                },
              }),
            ]),
        });
        return [Capability.contribute(AppCapabilities.AppGraphBuilder, [...group, ...page])];
      }),
  }),
  Plugin.addModule({
    id: 'surface',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.ReactSurface,
          Surface.create({
            id: 'worldClockArticle',
            filter: AppSurface.subject(AppSurface.Article, isPage),
            component: WorldClockArticle,
            props: ({ data: { subject } }) => ({ db: subject.space.db }),
          }),
        ),
      ]),
  }),
  // Ships the spec, so Plugins → Registry offers Open Specification.
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: () => import('../PLUGIN.mdl?raw'),
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);
