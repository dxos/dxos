//
// Copyright 2022 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { TestBuilder } from '@dxos/client-services/testing';
import { Loading } from '@dxos/react-components';

import { ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createLocal();

export type ClientDecoratorOptions = {
  count?: number;
};

/**
 * Storybook decorator to setup client for n peers.
 * The story is rendered n times, once for each peer.
 *
 * @param {number} count Number of peers to join.
 * @returns {DecoratorFunction}
 */
export const ClientDecorator =
  ({ count = 1 }: ClientDecoratorOptions = {}): DecoratorFunction<ReactRenderer, any> =>
  (Story, context) => {
    return (
      <div className='flex place-content-evenly'>
        {[...Array(count)].map((_, index) => (
          <ClientProvider key={index} services={services} fallback={() => <Loading label='Loading…' />}>
            <Story args={{ id: index, count, ...context.args }} />
          </ClientProvider>
        ))}
      </div>
    );
  };
