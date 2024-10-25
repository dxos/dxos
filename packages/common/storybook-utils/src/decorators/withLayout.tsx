//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type JSX } from 'react';

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

export type WithFullscreenProps = ThemedClassName<ProviderOptions>;

/**
 * Decorator to layout the story container, adding optional providers.
 */
export const withLayout = ({ classNames, fullscreen, ..._options }: WithFullscreenProps = {}): Decorator => {
  // TODO(burdon): Inspect "fullscreen" parameter in context.
  return (Story, _context) => {
    const options = defaultsDeep({}, _options, defaultOptions);
    const children = (
      // NOTE: Do not change the flex direction to flex-col by default.
      <div role='none' className={mx(fullscreen && 'fixed inset-0 flex overflow-hidden', classNames)}>
        <Story />
      </div>
    );

    return providers.reduceRight((acc, provider) => provider(acc, options), children);
  };
};
