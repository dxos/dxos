//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';
import { AxisOptions, Chart } from 'react-charts';

import { Metric, Resource } from '@dxos/protocols/proto/dxos/tracing';

import { JsonTreeView } from '../../../components';
import { ResourceName } from './Resource';

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

    // TODO(burdon): Change to line?
    const secondaryAxes: AxisOptions<any>[] = useMemo(
      () => [{ elementType: 'line', getValue: (point: any) => point.value as number }],
      [],
    );

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
              data:
                metric.timeSeries.tracks?.map((track) => ({
                  label: track.name,
                  data: track.points?.map((p, idx) => ({ idx, value: p.value })) ?? [],
                })) ?? [],
            }}
          />
        </div>
      </div>
    );
  }

  if (metric.custom) {
    return <JsonTreeView data={{ [metric.name]: metric.custom.payload }} />;
  }

  return <JsonTreeView data={metric} />;
};
