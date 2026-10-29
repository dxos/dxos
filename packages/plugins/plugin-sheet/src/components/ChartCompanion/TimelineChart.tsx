//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type PlotData, Timeline, matchesTimelineFilter, timelineRange, toTimelineEvents } from '@dxos/react-ui-plot';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { Sheet } from '#types';

import { SheetNamespace } from '../../namespace.ts';

const SPINE_ICONS: Record<Sheet.TimelineSpine, string> = {
  left: 'ph--align-left-simple--regular',
  center: 'ph--align-center-horizontal-simple--regular',
  right: 'ph--align-right-simple--regular',
};

const SCALE_ICONS: Record<Sheet.TimelineScale, string> = {
  log: 'ph--chart-line-up--regular',
  linear: 'ph--chart-line--regular',
  compact: 'ph--rows--regular',
};

export type TimelineChartProps = {
  /** The chart's range as rows of time, category, title, description and image URL. */
  data: PlotData;
  settings?: Sheet.TimelineSettings;
  onChange: (settings: Partial<Sheet.TimelineSettings>) => void;
  /** Shows the toolbar and the filter status bar; a slide shows the timeline alone. */
  chrome?: boolean;
};

/** A timeline chart: its own toolbar for how it is drawn, the timeline, and a status bar that filters events by text. */
export const TimelineChart = ({ data, settings = {}, onChange, chrome = true }: TimelineChartProps) => {
  const { t } = Hooks.useTranslation(SheetNamespace.key);
  const {
    spine = 'center',
    scale = 'compact',
    hidden = [],
    dates = true,
    future = false,
    fontSize = 'auto',
  } = settings;
  const events = useMemo(() => toTimelineEvents(data).events, [data]);

  // The filter is a view of the moment, not a setting of the chart, so it is not saved.
  const [filter, setFilter] = useState('');
  const counts = useMemo(() => {
    const range = timelineRange(events, { start: settings.start, end: settings.end });
    const now = Date.now();
    const shown = events.filter(
      (event) =>
        !hidden.includes(event.column) &&
        range &&
        event.time >= range[0] &&
        event.time <= range[1] &&
        (future || event.time <= now),
    );
    return { total: shown.length, matched: shown.filter((event) => matchesTimelineFilter(event, filter)).length };
  }, [events, hidden, settings.start, settings.end, future, filter]);

  const handleHiddenChange = useCallback((hidden: string[]) => onChange({ hidden }), [onChange]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['timeline-actions.label', { ns: SheetNamespace.key }] })
        .group(
          'spine',
          {
            label: ['timeline-spine.label', { ns: SheetNamespace.key }],
            iconOnly: true,
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: spine,
          },
          (group) =>
            Sheet.TimelineSpine.literals.forEach((value) =>
              group.action(
                value,
                {
                  label: [`timeline-spine.${value}.label`, { ns: SheetNamespace.key }],
                  icon: SPINE_ICONS[value],
                  checked: spine === value,
                },
                () => onChange({ spine: value }),
              ),
            ),
        )
        .group(
          'font-size',
          {
            label: ['timeline-font-size.label', { ns: SheetNamespace.key }],
            icon: 'ph--text-aa--regular',
            iconOnly: true,
            variant: 'dropdownMenu',
            selectCardinality: 'single',
            value: fontSize,
          },
          (group) =>
            Sheet.TimelineFontSize.literals.forEach((value) =>
              group.action(
                value,
                {
                  label: [`timeline-font-size.${value}.label`, { ns: SheetNamespace.key }],
                  checked: fontSize === value,
                },
                () => onChange({ fontSize: value }),
              ),
            ),
        )
        .action(
          'dates',
          {
            label: ['timeline-dates.label', { ns: SheetNamespace.key }],
            icon: 'ph--calendar-dots--regular',
            iconOnly: true,
            variant: 'toggle',
            checked: dates,
          },
          () => onChange({ dates: !dates }),
        )
        .action(
          'future',
          {
            label: ['timeline-future.label', { ns: SheetNamespace.key }],
            icon: 'ph--hourglass-high--regular',
            iconOnly: true,
            variant: 'toggle',
            checked: future,
          },
          () => onChange({ future: !future }),
        )
        // The scale is the main view choice, so it sits apart at the end of the toolbar.
        .separator('gap')
        .group(
          'scale',
          {
            label: ['timeline-scale.label', { ns: SheetNamespace.key }],
            iconOnly: true,
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: scale,
          },
          (group) =>
            Sheet.TimelineScale.literals.forEach((value) =>
              group.action(
                value,
                {
                  label: [`timeline-scale.${value}.label`, { ns: SheetNamespace.key }],
                  icon: SCALE_ICONS[value],
                  checked: scale === value,
                },
                () => onChange({ scale: value }),
              ),
            ),
        )
        .build(),
    [spine, scale, fontSize, dates, future, onChange],
  );

  if (!chrome) {
    return (
      <div className='dx-fill grid overflow-hidden'>
        <Timeline
          data={data}
          options={settings}
          onHiddenChange={handleHiddenChange}
          classNames='px-2 pb-2'
          // The scale is the one view choice a slide keeps, at the end of the tag row.
          actions={
            <ToggleGroup.Root
              type='single'
              value={scale}
              onValueChange={(value: string) => {
                const next = Sheet.TimelineScale.literals.find((literal) => literal === value);
                if (next) {
                  onChange({ scale: next });
                }
              }}
              aria-label={t('timeline-scale.label')}
            >
              {Sheet.TimelineScale.literals.map((value) => (
                <ToggleGroup.Item
                  key={value}
                  value={value}
                  icon={SCALE_ICONS[value]}
                  label={t(`timeline-scale.${value}.label`)}
                  iconOnly
                />
              ))}
            </ToggleGroup.Root>
          }
        />
      </div>
    );
  }

  return (
    <div className='dx-fill grid grid-rows-[min-content_1fr_min-content] overflow-hidden'>
      <ActionToolbar {...menuActions} alwaysActive />
      <Timeline
        data={data}
        options={settings}
        filter={filter}
        onHiddenChange={handleHiddenChange}
        classNames='px-2 pb-2'
      />
      <Toolbar.Root classNames='bg-transparent border-t border-separator'>
        <Field.Root>
          <Input.Root
            placeholder={t('timeline-filter.placeholder')}
            value={filter}
            autoComplete='off'
            spellCheck={false}
            onChange={(event) => setFilter(event.target.value)}
            start={<Icon.Icon icon='ph--magnifying-glass--regular' />}
          />
        </Field.Root>
        {filter.length > 0 && (
          <Button.Root
            icon='ph--x--regular'
            iconOnly
            label={t('timeline-filter.clear.label')}
            onClick={() => setFilter('')}
          />
        )}
        <Typography.Text classNames='shrink-0 px-2 text-sm text-fg-subtle'>
          {filter.trim()
            ? t('timeline-filter.matches.label', { matched: counts.matched, total: counts.total })
            : t('timeline-filter.total.label', { count: counts.total })}
        </Typography.Text>
      </Toolbar.Root>
    </div>
  );
};

TimelineChart.displayName = 'TimelineChart';
