//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import * as Plot from '@observablehq/plot';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import { unixDay } from 'd3';
import React, { type ComponentType, lazy, Suspense } from 'react';

import { types } from '@braneframe/types';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): The requested module '/node_modules/.cache/.vite-storybook/deps/d3.js?v=a04af487' does not provide an export named 'unixDay'
// TODO(burdon): Failed to fetch dynamically imported module: http://localhost:9009/src/components/Plot.stories.tsx?t=1698508451079
// [ERROR] No matching export in "node_modules/.pnpm/d3@7.8.5/node_modules/d3/src/index.js" for import "unixDay"
//
//     node_modules/.pnpm/@observablehq+plot@0.6.11/node_modules/@observablehq/plot/src/time.js:2:39:
//       2 │ ...utcSecond, utcMinute, utcHour, unixDay, utcWeek, utcMonth, utcYear} f...
//         ╵                                   ~~~~~~~~
console.log({ Plot }); // Error from @observablehq/plot
console.log({ unixDay }); // OK since imported directly.

faker.seed(1);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const data = [
  {
    species: 'Adelie',
    island: 'Torgersen',
    culmen_length_mm: 39.1,
    culmen_depth_mm: 18.7,
    flipper_length_mm: 181,
    body_mass_g: 3750,
    sex: 'MALE',
  },
  {
    species: 'Adelie',
    island: 'Torgersen',
    culmen_length_mm: 39.5,
    culmen_depth_mm: 17.4,
    flipper_length_mm: 186,
    body_mass_g: 3800,
    sex: 'FEMALE',
  },
];

const Test = lazy(() => {
  return new Promise<{ default: ComponentType<any> }>((resolve) => {
    // const x = import('@observablehq/plot');
    resolve({ default: () => <div>Test</div> });
  });
});

const Story = () => {
  //   const containerRef = useRef<HTMLDivElement>(null);
  //   useEffect(() => {
  //     if (data === undefined) {
  //     }
  //
  //     const plot = Plot.plot({
  //       y: { grid: true },
  //       color: { scheme: 'burd' },
  //       marks: [Plot.ruleY([0]), Plot.dot(data, { x: 'Date', y: 'Anomaly', stroke: 'Anomaly' })],
  //     });
  //
  //     containerRef.current!.append(plot);
  //     return () => plot.remove();
  //   }, [data]);
  //
  //   return <div ref={containerRef} />;

  return (
    <Suspense>
      <Test />
    </Suspense>
  );
};

export default {
  component: Story,
  render: Story,
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
