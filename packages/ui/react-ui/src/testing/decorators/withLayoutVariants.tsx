//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type ComponentType, type PropsWithChildren } from 'react';

import { mx, surfaceShadow } from '@dxos/react-ui-theme';
import { type Density, type Elevation } from '@dxos/react-ui-types';

type Config = {
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
};

const Container = ({ children, elevation, surface }: PropsWithChildren<{ elevation: Elevation; surface?: string }>) => (
  <div className={mx('rounded-md border border-separator', surface, surfaceShadow({ elevation }))}>{children}</div>
);

const Panel = ({
  Story,
  elevations,
  densities,
  className,
}: { Story: ComponentType } & Config & { className?: string }) => (
  <div className={mx('flex flex-col bs-full p-4 gap-4', className)}>
    {elevations?.map(({ elevation, surface }) =>
      densities?.map((density) => (
        <Container key={`${elevation}--${density}`} surface={surface} elevation={elevation}>
          <Story />
        </Container>
      )),
    )}
  </div>
);

export const withLayoutVariants = ({
  elevations = [
    { elevation: 'base', surface: 'bg-baseSurface' },
    { elevation: 'positioned', surface: 'bg-cardSurface' },
    { elevation: 'dialog', surface: 'bg-modalSurface' },
  ],
  densities = ['coarse'],
}: Config = {}): Decorator => {
  return (Story) => (
    <div className='fixed inset-0 grid grid-cols-2 overflow-y-auto'>
      <Panel Story={Story} className='light' elevations={elevations} densities={densities} />
      <Panel Story={Story} className='dark' elevations={elevations} densities={densities} />
    </div>
  );
};
