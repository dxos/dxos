//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type PlotValue } from '@dxos/react-ui-plot';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';
import { Sheet } from '#types';

import { ChartView } from './ChartView.tsx';

const DEFAULT_RANGE = 'A1:B5';

// The list opens showing whole rows; a two-line row is 3.5rem.
const LIST_ROW_HEIGHT = 3.5;
const LIST_ROWS = 3;

/** A chart as the companion lists it. */
export type ChartItem = Sheet.ChartProperties & { id: string };

export type ChartCompanionProps = {
  /** Scopes the toolbar to the host plank's attention; without one it is always enabled. */
  attendableId?: string;
  charts: readonly ChartItem[];
  /** Adds a chart and returns its id. */
  onAdd: (props: Sheet.ChartProperties) => string;
  onUpdate: (id: string, props: Partial<Sheet.ChartProperties>) => void;
  onDelete: (id: string) => void;
  /** Computed cell values for a range in A1 notation; a new function identity re-renders the chart. */
  getValues: (range: string) => PlotValue[][] | undefined;
  /** The sheet's current selection in A1 notation; new charts start from it. */
  selection?: string;
  /** Called with a chart's range when it is chosen, so the host can select it in the sheet. */
  onSelectRange?: (range: string) => void;
};

/** Master-detail editor of a sheet's charts: the list of ranges above, the selected chart and its settings below. */
export const ChartCompanion = ({
  attendableId,
  charts,
  onAdd,
  onUpdate,
  onDelete,
  getValues,
  selection,
  onSelectRange,
}: ChartCompanionProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [selected, setSelected] = useState<string | undefined>(charts[0]?.id);
  const [editing, setEditing] = useState(false);
  const current = charts.find((chart) => chart.id === selected) ?? charts[0];

  const handleAdd = useCallback(() => {
    setSelected(onAdd({ range: selection ?? DEFAULT_RANGE, type: 'bar', header: true }));
  }, [selection, onAdd]);

  const handleDelete = useCallback(() => {
    const index = charts.findIndex((chart) => chart.id === current?.id);
    if (current && index >= 0) {
      const next = charts.filter((chart) => chart.id !== current.id);
      onDelete(current.id);
      setSelected(next[Math.min(index, next.length - 1)]?.id);
    }
  }, [charts, current, onDelete]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      setEditing(false);
      const chart = charts.find((chart) => chart.id === id);
      if (chart) {
        onSelectRange?.(chart.range);
      }
    },
    [charts, onSelectRange],
  );

  const handleUpdate = useCallback(
    (values: Partial<Sheet.ChartProperties>) => current && onUpdate(current.id, values),
    [current, onUpdate],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['chart-actions.label', { ns: meta.profile.key }] })
        .action('add', { label: ['add-chart.label', { ns: meta.profile.key }], icon: 'ph--plus--regular' }, handleAdd)
        .action(
          'use-selection',
          {
            label: ['use-selection.label', { ns: meta.profile.key }],
            icon: 'ph--selection-plus--regular',
            disabled: !current || !selection || selection === current.range,
          },
          () => selection && handleUpdate({ range: selection }),
        )
        .separator('gap')
        .menu('more', (menu) =>
          menu.action(
            'delete',
            {
              label: ['delete-chart.label', { ns: meta.profile.key }],
              icon: 'ph--trash--regular',
              disabled: !current,
            },
            handleDelete,
          ),
        )
        .build(),
    [current, selection, handleAdd, handleUpdate, handleDelete],
  );

  const items = useMemo(
    () =>
      charts.map((chart) => ({
        value: chart.id,
        label: chart.name || chart.range,
        description: t('chart-description.label', { range: chart.range, type: t(`chart-type.${chart.type}.label`) }),
      })),
    [charts, t],
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />
      </Panel.Header>
      <Panel.Body asChild>
        <Splitter.Root
          orientation='vertical'
          defaultSize={LIST_ROWS * LIST_ROW_HEIGHT}
          minSize={LIST_ROW_HEIGHT}
          resizable
        >
          <Splitter.Panel position='start' asChild>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport>
                <Listbox.Root items={items} value={current?.id} onValueChange={handleSelect}>
                  <Listbox.Content aria-label={t('chart-list.label')}>
                    {items.map((item) => (
                      <Listbox.Item key={item.value} id={item.value} data-testid='chart-companion.item'>
                        <Listbox.ItemIcon icon={chartIcon(charts.find((chart) => chart.id === item.value)?.type)} />
                        <Listbox.ItemText />
                        <Listbox.ItemDescription />
                        <SystemButton.Edit
                          variant='ghost'
                          iconOnly
                          onClick={() => {
                            handleSelect(item.value);
                            setEditing(true);
                          }}
                        />
                      </Listbox.Item>
                    ))}
                  </Listbox.Content>
                  <Listbox.Empty>{t('no-charts.message')}</Listbox.Empty>
                </Listbox.Root>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Splitter.Panel>
          <Splitter.ResizeTrigger aria-label={t('resize-chart-list.label')} />
          <Splitter.Panel position='end'>
            {current ? (
              <ChartDetail
                key={current.id}
                chart={current}
                editing={editing}
                getValues={getValues}
                onUpdate={(values) => {
                  handleUpdate(values);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <Typography.Text classNames='p-2 text-fg-subtle'>{t('no-chart-selected.message')}</Typography.Text>
            )}
          </Splitter.Panel>
        </Splitter.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

ChartCompanion.displayName = 'ChartCompanion';

type ChartDetailProps = Pick<ChartCompanionProps, 'getValues'> & {
  chart: ChartItem;
  editing: boolean;
  onUpdate: (values: Partial<Sheet.ChartProperties>) => void;
  onCancel: () => void;
};

/** The selected chart, or its settings form while editing. */
const ChartDetail = ({ chart, editing, getValues, onUpdate, onCancel }: ChartDetailProps) => {
  const { id: _id, ...values } = chart;
  return editing ? (
    <Form.Root schema={Sheet.ChartProperties} values={values} onSave={onUpdate} onCancel={onCancel}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Fields />
          <Form.Actions />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  ) : (
    <ChartView chart={values} getValues={getValues} onUpdate={onUpdate} />
  );
};

const chartIcon = (type?: Sheet.ChartType) => {
  switch (type) {
    case 'pie':
      return 'ph--chart-pie--regular';
    case 'xy':
      return 'ph--chart-line--regular';
    case 'scatter':
      return 'ph--chart-scatter--regular';
    case 'heatmap':
      return 'ph--squares-four--regular';
    case 'radar':
      return 'ph--chart-polar--regular';
    case 'map':
      return 'ph--globe-hemisphere-west--regular';
    case 'timeline':
      return 'ph--line-segments--regular';
    case 'bar':
    default:
      return 'ph--chart-bar--regular';
  }
};
