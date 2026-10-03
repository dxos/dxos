//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { type ComponentType, type PropsWithChildren } from 'react';

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type Density, type Elevation, type ThemedClassName } from '@dxos/ui-types';

type Config = ThemedClassName<{
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
}>;

const Container = ({ children, elevation, surface }: PropsWithChildren<{ elevation: Elevation; surface?: string }>) => (
  <div className={mx('p-4 rounded-sm', surface, surfaceShadow({ elevation }))}>{children}</div>
);

const Panel = ({ Story, classNames, elevations, densities }: ThemedClassName<{ Story: ComponentType } & Config>) => {
  return (
    <div className={mx('flex flex-col h-full p-8 gap-8', classNames)}>
      {elevations?.map(({ elevation, surface }) =>
        densities?.map((density) => (
          <Container key={`${elevation}--${density}`} surface={surface} elevation={elevation}>
            <Story />
          </Container>
        )),
      )}
    </div>
  );
};

export const withLayoutVariants = ({
  classNames,
  densities = ['md'],
  elevations = [
    {
      elevation: 'dialog',
      surface: 'dx-modal-surface',
    },
    {
      elevation: 'positioned',
      surface: 'dx-card-surface',
    },
    {
      elevation: 'base',
      surface: 'dx-base-surface',
    },
  ],
}: Config = {}): Decorator => {
  return (Story) => <Panel Story={Story} classNames={classNames} elevations={elevations} densities={densities} />;
};
