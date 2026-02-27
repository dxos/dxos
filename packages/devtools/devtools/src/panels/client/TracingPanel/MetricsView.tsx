//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';
import { type AxisOptions, Chart } from 'react-charts';

import { type Metric, type Resource } from '@dxos/protocols/buf/dxos/tracing_pb';

import { JsonView } from '../../../components';

import { ResourceName } from './Resource';

export const MetricsView: FC<{ resource?: Resource }> = ({ resource }) => {
  if (!resource) {
    return null;
  }

  return (
    <div className='divide-y divide-separator'>
      <div className='p-1'>
        <ResourceName className='text-lg' resource={resource} />
        <JsonView data={resource.info} />
      </div>

      <div className='p-1'>
        <h4>Metrics</h4>
        {resource.metrics?.map((metric, idx) => (
          <MetricComponent key={idx} metric={metric} />
        ))}
      </div>
    </div>
  );
};

const MetricComponent: FC<{ metric: Metric }> = ({ metric }) => {
  if (metric.Value.case === 'counter') {
    const counter = metric.Value.value;
    return (
      <span>
        {metric.name}: {counter.value} {counter.units ?? ''}
      </span>
    );
  }

  // TODO(burdon): Consider using https://react-charts.tanstack.com/docs/api
  if (metric.Value.case === 'timeSeries') {
    const timeSeries = metric.Value.value;
    const primaryAxis: AxisOptions<any> = useMemo(
      () => ({ scaleType: 'linear', getValue: (point: any) => point.idx as number }),
      [],
    );

    const secondaryAxes: AxisOptions<any>[] = useMemo(
      () => [{ elementType: 'line', getValue: (point: any) => point.value as number }],
      [],
    );

    const data =
      timeSeries.tracks?.map(({ name, points }: { name: string; points: any[] }) => ({
        label: name,
        data: points?.map((p: any, idx: number) => ({ idx: points.length - 1 - idx, value: p.value })) ?? [],
      })) ?? [];

    return (
      <div className='m-2'>
        <div>{metric.name}</div>
        <div className='flex gap-2'>
          <span>total</span>
          <span>
            {JSON.stringify(
              timeSeries.tracks?.reduce(
                (acc: Record<string, number>, track: any) => ({ ...acc, [track.name]: track.total }),
                {},
              ),
              (key: string, value: any) => {
                return typeof value === 'number' ? value.toFixed(2) : value;
              },
            )}
          </span>
        </div>
        <div className='w-full h-[160px] m-2'>
          <Chart
            options={{
              primaryAxis,
              secondaryAxes,
              interactionMode: 'closest',
              data,
            }}
          />
        </div>
      </div>
    );
  }

  if (metric.Value.case === 'multiCounter') {
    const multiCounter = metric.Value.value;
    const records = [...(multiCounter.records ?? [])];
    records.sort((a, b) => a.key.localeCompare(b.key));
    return (
      <JsonView
        data={{
          [metric.name]: Object.fromEntries(
            records.map(({ key, value }) => [key, `${value.toString()} ${multiCounter.units ?? ''}`]),
          ),
        }}
      />
    );
  }

  if (metric.Value.case === 'custom') {
    return <JsonView data={{ [metric.name]: metric.Value.value.payload }} />;
  }

  return <JsonView data={metric} />;
};
