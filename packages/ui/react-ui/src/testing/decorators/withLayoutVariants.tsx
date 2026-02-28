//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type ComponentType, type PropsWithChildren } from 'react';

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type Density, type Elevation } from '@dxos/ui-types';

type Config = {
  elevations?: { elevation: Elevation; surface?: string }[];
  densities?: Density[];
};

const Container = ({ children, elevation, surface }: PropsWithChildren<{ elevation: Elevation; surface?: string }>) => (
  <div className={mx('rounded-sm', surface, surfaceShadow({ elevation }))}>{children}</div>
);

const Panel = ({
  Story,
  elevations,
  densities,
  className,
}: { Story: ComponentType } & Config & { className?: string }) => {
  return (
    <div className={mx('flex flex-col h-full p-8 gap-8', className)}>
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
  elevations = [
    { elevation: 'dialog', surface: 'bg-modal-surface' },
    { elevation: 'positioned', surface: 'bg-card-surface' },
    { elevation: 'base', surface: 'bg-base-surface' },
  ],
  densities = ['coarse'],
}: Config = {}): Decorator => {
  return (Story) => <Panel Story={Story} elevations={elevations} densities={densities} />;
};
