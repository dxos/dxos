//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';
import { type AxisOptions, Chart } from 'react-charts';

import { type Metric, type Resource } from '@dxos/protocols/proto/dxos/tracing';

import { ResourceName } from './Resource';
import { JsonTreeView } from '../../../components';

export const MetricsView: FC<{ resource?: Resource }> = ({ resource }) => {
  if (!resource) {
    return null;
  }

  return (
    <div className='px-2'>
      <ResourceName className='text-lg' resource={resource} />

      <div>
        <h4 className='text-md border-b'>Info</h4>
        <JsonTreeView data={resource.info} />
      </div>

      <div>
        <h4 className='text-md border-b'>Metrics</h4>
        {resource.metrics?.map((metric, idx) => (
          <MetricComponent key={idx} metric={metric} />
        ))}
      </div>
    </div>
  );
};

const MetricComponent: FC<{ metric: Metric }> = ({ metric }) => {
  if (metric.counter) {
    return (
      <span>
        {metric.name}: {metric.counter.value} {metric.counter.units ?? ''}
      </span>
    );
  }

  // https://react-charts.tanstack.com/docs/api
  if (metric.timeSeries) {
    const primaryAxis: AxisOptions<any> = useMemo(
      () => ({ scaleType: 'linear', getValue: (point: any) => point.idx as number }),
      [],
    );

    const secondaryAxes: AxisOptions<any>[] = useMemo(
      () => [{ elementType: 'line', getValue: (point: any) => point.value as number }],
      [],
    );

    const data =
      metric.timeSeries.tracks?.map(({ name, points }) => ({
        label: name,
        data: points?.map((p, idx) => ({ idx: points.length - 1 - idx, value: p.value })) ?? [],
      })) ?? [];

    return (
      <div className='m-2'>
        <div>{metric.name}</div>
        <div className='flex gap-2'>
          <span>total</span>
          <span>
            {JSON.stringify(
              metric.timeSeries.tracks?.reduce((acc, track) => ({ ...acc, [track.name]: track.total }), {}),
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

  if (metric.multiCounter) {
    const records = metric.multiCounter.records ?? [];
    records.sort((a, b) => a.key.localeCompare(b.key));
    return (
      <JsonTreeView
        data={{
          [metric.name]: Object.fromEntries(
            records.map(({ key, value }) => [key, `${value.toString()} ${metric.multiCounter?.units ?? ''}`]),
          ),
        }}
      />
    );
  }

  if (metric.custom) {
    return <JsonTreeView data={{ [metric.name]: metric.custom.payload }} />;
  }

  return <JsonTreeView data={metric} />;
};
