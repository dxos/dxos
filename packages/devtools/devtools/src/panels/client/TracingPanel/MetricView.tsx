//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';
import { AxisOptions, Chart } from 'react-charts';

import { Metric } from '@dxos/protocols/proto/dxos/tracing';

import { JsonTreeView } from '../../../components';

export const MetricView: FC<{ metric: Metric }> = ({ metric }) => {
  if (metric.counter) {
    return (
      <span>
        {metric.name}: {metric.counter.value} {metric.counter.units ?? ''}
      </span>
    );
  } else if (metric.timeSeries) {
    const primaryAxis: AxisOptions<any> = useMemo(
      () => ({ scaleType: 'linear', getValue: (point: any) => point.idx as number }),
      [],
    );
    const secondaryAxes: AxisOptions<any>[] = useMemo(
      () => [{ elementType: 'bar', getValue: (point: any) => point.value as number }],
      [],
    );

    // const format = value => typeof value === 'number' ? value.toFixed(2) : value;

    return (
      <div className='m-2'>
        <div>{metric.name}</div>
        <div className='flex gap-2'>
          <span>total</span>
          <span>
            {JSON.stringify(
              metric.timeSeries.tracks?.reduce((acc, track) => ({ ...acc, [track.name]: track.total }), {}),
            )}
          </span>
        </div>
        <div className='w-full h-[100px] m-2'>
          <Chart
            options={{
              primaryAxis,
              secondaryAxes,
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
  } else if (metric.custom) {
    return <JsonTreeView data={{ [metric.name]: metric.custom.payload }} />;
  } else {
    return <JsonTreeView data={metric} />;
  }
};
