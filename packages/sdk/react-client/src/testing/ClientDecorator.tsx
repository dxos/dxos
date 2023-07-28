//
// Copyright 2022 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { registerSignalFactory } from '@dxos/echo-signals/react';

import { ClientContext, ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createLocal();

export type ClientDecoratorOptions = {
  clients?: Client[];
  count?: number;
  registerSignalFactory?: boolean;
};

/**
 * Storybook decorator to setup client for n peers.
 * The story is rendered n times, once for each peer.
 *
 * @param {number} count Number of peers to join.
 * @returns {DecoratorFunction}
 */
export const ClientDecorator = (options: ClientDecoratorOptions = {}): DecoratorFunction<ReactRenderer, any> => {
  const { clients, count = 1, registerSignalFactory: register = true } = options;
  register && registerSignalFactory();

  if (clients) {
    return (Story, context) => (
      <div className='flex place-content-evenly'>
        {clients.map((client, index) => (
          <ClientContext.Provider key={index} value={{ client }}>
            {Story({ args: { id: index, count: clients.length, ...context.args } })}
          </ClientContext.Provider>
        ))}
      </div>
    );
  }

  return (Story, context) => (
    <div className='flex place-content-evenly'>
      {[...Array(count)].map((_, index) => (
        <ClientProvider key={index} services={services} fallback={() => <p>Loading</p>}>
          {Story({ args: { id: index, count, ...context.args } })}
        </ClientProvider>
      ))}
    </div>
  );
};
