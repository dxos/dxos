//
// Copyright 2022 DXOS.org
//

import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { registerSignalFactory } from '@dxos/echo-signals/react';

import { ClientContext, ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createLocal();

export type ClientDecoratorOptions = {
  clients?: Client[];
  count?: number;
  registerSignalFactory?: boolean;
  className?: string;
};

/**
 * Storybook decorator to setup client for n peers.
 * The story is rendered n times, once for each peer.
 *
 * @returns {DecoratorFunction}
 */
// TODO(burdon): Reconcile with ClientSpaceDecorator.
export const ClientDecorator = (options: ClientDecoratorOptions = {}): DecoratorFunction<ReactRenderer, any> => {
  const { clients, count = 1, className = 'flex place-content-evenly' } = options;
  if (options.registerSignalFactory ?? true) {
    registerSignalFactory();
  }

  if (clients) {
    return (Story, context) => (
      <div className={className}>
        {clients.map((client, index) => (
          <ClientContext.Provider key={index} value={{ client }}>
            {Story({ args: { id: index, count: clients.length, ...context.args } })}
          </ClientContext.Provider>
        ))}
      </div>
    );
  }

  return (Story, context) => (
    <div className={className}>
      {[...Array(count)].map((_, index) => (
        <ClientProvider key={index} services={services}>
          {Story({ args: { id: index, count, ...context.args } })}
        </ClientProvider>
      ))}
    </div>
  );
};
