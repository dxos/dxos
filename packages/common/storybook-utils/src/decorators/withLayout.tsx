//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, type JSX, type PropsWithChildren } from 'react';

import { type Density, DensityProvider, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type ProviderOptions = {
  fullscreen?: boolean;
  density?: Density;
};

const defaultOptions: ProviderOptions = {
  density: 'fine',
};

type Provider = (children: JSX.Element, options: ProviderOptions) => JSX.Element;

const providers: Provider[] = [
  (children, options) => {
    return options?.density ? <DensityProvider density={options.density}>{children}</DensityProvider> : children;
  },
];

export type ContainerProps = ThemedClassName<PropsWithChildren<Pick<ProviderOptions, 'fullscreen'>>>;

export type WithLayoutProps = ThemedClassName<ProviderOptions & { Container?: FC<ContainerProps> }>;

/**
 * Decorator to layout the story container, adding optional providers.
 * @deprecated
 */
export const withLayout = ({
  classNames,
  fullscreen,
  Container = fullscreen ? FullscreenContainer : DefaultContainer,
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

// TODO(burdon): Use consistently.
export const layoutCentered = 'bg-deckSurface justify-center overflow-y-auto';

export const DefaultContainer = ({ children, classNames }: ContainerProps) => {
  return (
    <div role='none' className={mx(classNames)}>
      {children}
    </div>
  );
};

export const FullscreenContainer = ({ children, classNames }: ContainerProps) => {
  return (
    <div role='none' className={mx('fixed inset-0 flex overflow-hidden', classNames)}>
      {children}
    </div>
  );
};

export const ColumnContainer = ({ children, classNames = 'w-[30rem]', ...props }: ContainerProps) => {
  return (
    <FullscreenContainer classNames='justify-center bg-modalSurface' {...props}>
      <div role='none' className={mx('flex flex-col h-full overflow-y-auto bg-baseSurface', classNames)}>
        {children}
      </div>
    </FullscreenContainer>
  );
};

/**
 * Default decorator (add to preview.ts)
 */
// TODO(burdon): Add theme here.
export const withLayout2 =
  (): Decorator =>
  (Story, { parameters: { layout, classNames } }) => {
    switch (layout) {
      // Fullscreen.
      case 'fullscreen':
        return (
          <div role='none' className='fixed inset-0 flex overflow-hidden'>
            <Story />
          </div>
        );

      // Single column.
      case 'column':
        return (
          <div role='none' className='fixed inset-0 flex justify-center overflow-hidden bg-deckSurface'>
            <div role='none' className={mx(classNames ?? 'bs-full is-[40rem]')}>
              <Story />
            </div>
          </div>
        );

      default:
        return <Story />;
    }
  };
