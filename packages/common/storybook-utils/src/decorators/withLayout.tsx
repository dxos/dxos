//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type PropsWithChildren, type JSX, type FC } from 'react';

import { type Density, DensityProvider, type ThemedClassName } from '@dxos/react-ui';
import { Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type ProviderOptions = {
  fullscreen?: boolean;
  density?: Density;
  tooltips?: boolean;
};

const defaultOptions: ProviderOptions = {
  density: 'fine',
};

type Provider = (children: JSX.Element, options: ProviderOptions) => JSX.Element;

const providers: Provider[] = [
  (children, options) => {
    return options.tooltips ? <Tooltip.Provider>{children}</Tooltip.Provider> : children;
  },
  (children, options) => {
    return options?.density ? <DensityProvider density={options.density}>{children}</DensityProvider> : children;
  },
];

export type ContainerProps = ThemedClassName<PropsWithChildren<Pick<ProviderOptions, 'fullscreen'>>>;

export type WithLayoutProps = ThemedClassName<ProviderOptions & { Container?: FC<ContainerProps> }>;

/**
 * Decorator to layout the story container, adding optional providers.
 */
export const withLayout = ({
  classNames,
  fullscreen,
  Container = fullscreen ? FixedContainer : DefaultContainer,
  ...providedOptions
}: WithLayoutProps = {}): Decorator => {
  // TODO(burdon): Inspect "fullscreen" parameter in context.
  return (Story, _context) => {
    const children = (
      <Container classNames={classNames} fullscreen={fullscreen}>
        <Story />
      </Container>
    );

    const options = defaultsDeep({}, providedOptions, defaultOptions);
    return providers.reduceRight((acc, provider) => provider(acc, options), children);
  };
};

export const DefaultContainer: FC<ContainerProps> = ({ children, classNames }) => {
  return (
    <div role='none' className={mx(classNames)}>
      {children}
    </div>
  );
};

export const FixedContainer: FC<ContainerProps> = ({ children, classNames }) => {
  return (
    <div role='none' className={mx('fixed inset-0 flex overflow-hidden', classNames)}>
      {children}
    </div>
  );
};

export const ColumnContainer: FC<ContainerProps> = ({ children, classNames = 'w-[30rem]', ...props }) => {
  return (
    <FixedContainer classNames='bg-baseSurface justify-center' {...props}>
      <div role='none' className={mx('flex flex-col h-full overflow-y-auto bg-modalSurface', classNames)}>
        {children}
      </div>
    </FixedContainer>
  );
};
