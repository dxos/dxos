//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import {
  type PlotValue,
  Timeline,
  matchesTimelineFilter,
  timelineRange,
  toPlotData,
  toTimelineEvents,
} from '@dxos/react-ui-plot';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';
import { Sheet } from '#types';

const DEFAULT_RANGE = 'A1:C10';

const SPINE_ICONS: Record<Sheet.TimelineSpine, string> = {
  left: 'ph--align-left-simple--regular',
  center: 'ph--align-center-horizontal-simple--regular',
  right: 'ph--align-right-simple--regular',
};

const SCALE_ICONS: Record<Sheet.TimelineScale, string> = {
  linear: 'ph--chart-line--regular',
  log: 'ph--chart-line-up--regular',
};

export type TimelineCompanionProps = {
  /** Scopes the toolbar to the host plank's attention; without one it is always enabled. */
  attendableId?: string;
  timeline?: Sheet.Timeline;
  onChange: (timeline: Sheet.Timeline | undefined) => void;
  /** Computed cell values for a range in A1 notation; a new function identity re-renders the timeline. */
  getValues: (range: string) => PlotValue[][] | undefined;
  /** The sheet's current selection in A1 notation; a new timeline starts from it. */
  selection?: string;
};

/** A timeline of a sheet range with one event per row; the toolbar sets how it is drawn and which categories show. */
export const TimelineCompanion = ({
  attendableId,
  timeline,
  onChange,
  getValues,
  selection,
}: TimelineCompanionProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [editing, setEditing] = useState(false);
  const { spine = 'center', scale = 'linear', hidden = [], dates = true } = timeline ?? {};

  const data = useMemo(() => {
    const values = timeline && getValues(timeline.range);
    return values && toPlotData(values, { header: timeline.header });
  }, [getValues, timeline?.range, timeline?.header]);
  const events = useMemo(() => (data ? toTimelineEvents(data).events : []), [data]);

  // The filter is a view of the moment, not a setting of the timeline, so it is not saved.
  const [filter, setFilter] = useState('');
  const counts = useMemo(() => {
    const range = timelineRange(events, { start: timeline?.start, end: timeline?.end });
    const shown = events.filter(
      (event) => !hidden.includes(event.column) && range && event.time >= range[0] && event.time <= range[1],
    );
    return { total: shown.length, matched: shown.filter((event) => matchesTimelineFilter(event, filter)).length };
  }, [events, hidden, timeline?.start, timeline?.end, filter]);

  const handleUpdate = useCallback(
    (values: Partial<Sheet.Timeline>) => timeline && onChange({ ...timeline, ...values }),
    [timeline, onChange],
  );

  const handleUseSelection = useCallback(
    () =>
      timeline
        ? handleUpdate({ range: selection ?? timeline.range })
        : onChange({ range: selection ?? DEFAULT_RANGE, header: true }),
    [timeline, selection, handleUpdate, onChange],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['timeline-actions.label', { ns: meta.profile.key }] })
        .action(
          'use-selection',
          {
            label: ['use-selection.label', { ns: meta.profile.key }],
            icon: 'ph--selection-plus--regular',
            disabled: !!timeline && (!selection || selection === timeline.range),
          },
          handleUseSelection,
        )
        .subgraph(
          !!timeline &&
            ((builder) =>
              builder
                .group(
                  'spine',
                  {
                    label: ['timeline-spine.label', { ns: meta.profile.key }],
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
                          label: [`timeline-spine.${value}.label`, { ns: meta.profile.key }],
                          icon: SPINE_ICONS[value],
                          checked: spine === value,
                        },
                        () => handleUpdate({ spine: value }),
                      ),
                    ),
                )
                .group(
                  'scale',
                  {
                    label: ['timeline-scale.label', { ns: meta.profile.key }],
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
                          label: [`timeline-scale.${value}.label`, { ns: meta.profile.key }],
                          icon: SCALE_ICONS[value],
                          checked: scale === value,
                        },
                        () => handleUpdate({ scale: value }),
                      ),
                    ),
                )),
        )
        .subgraph(
          !!timeline &&
            ((builder) =>
              builder.action(
                'dates',
                {
                  label: ['timeline-dates.label', { ns: meta.profile.key }],
                  icon: 'ph--calendar-dots--regular',
                  iconOnly: true,
                  variant: 'toggle',
                  checked: dates,
                },
                () => handleUpdate({ dates: !dates }),
              )),
        )
        .separator('gap')
        .action(
          'settings',
          {
            label: ['timeline-settings.label', { ns: meta.profile.key }],
            icon: 'ph--sliders-horizontal--regular',
            iconOnly: true,
            disabled: !timeline,
            variant: 'toggle',
            checked: editing,
          },
          () => setEditing((editing) => !editing),
        )
        .menu('more', (menu) =>
          menu.action(
            'delete',
            {
              label: ['delete-timeline.label', { ns: meta.profile.key }],
              icon: 'ph--trash--regular',
              disabled: !timeline,
            },
            () => onChange(undefined),
          ),
        )
        .build(),
    [timeline, selection, spine, scale, hidden, editing, dates, handleUseSelection, handleUpdate, onChange],
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />
      </Panel.Header>
      <Panel.Body>
        {!timeline ? (
          <Typography.Text classNames='p-2 text-fg-subtle'>{t('no-timeline.message')}</Typography.Text>
        ) : editing ? (
          <Form.Root
            schema={Sheet.Timeline}
            values={timeline}
            onSave={(values) => {
              handleUpdate(values);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          >
            <Form.Viewport scroll>
              <Form.Content>
                <Form.Fields />
                <Form.Actions />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        ) : data ? (
          <Timeline
            data={data}
            options={timeline}
            filter={filter}
            onHiddenChange={(hidden) => handleUpdate({ hidden })}
            classNames='p-2'
          />
        ) : (
          <Typography.Text classNames='p-2 text-fg-subtle'>{t('invalid-range.message')}</Typography.Text>
        )}
      </Panel.Body>
      {timeline && data && !editing && (
        <Panel.Footer>
          <Toolbar.Root classNames='bg-transparent'>
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
        </Panel.Footer>
      )}
    </Panel.Root>
  );
};

TimelineCompanion.displayName = 'TimelineCompanion';
