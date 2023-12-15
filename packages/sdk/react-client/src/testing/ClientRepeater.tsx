//
// Copyright 2022 DXOS.org
//

import React, { type FC } from 'react';

import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { registerSignalFactory } from '@dxos/echo-signals/react';

import { ClientContext, ClientProvider } from '../client';

const testBuilder = new TestBuilder();
const services = () => testBuilder.createLocal();

export type RepeatedComponentProps = { id: number; count: number };

export type ClientRepeaterProps<P extends RepeatedComponentProps> = {
  clients?: Client[];
  count?: number;
  registerSignalFactory?: boolean;
  className?: string;
  Component: FC<any>;
  args?: Omit<P, 'id' | 'count'>;
};

/**
 * Utility component for Storybook stories which sets up clients for n peers.
 * The `Component` property is rendered n times, once for each peer.
 */
// TODO(burdon): Reconcile with ClientSpaceDecorator.
export const ClientRepeater = <P extends RepeatedComponentProps>(props: ClientRepeaterProps<P>) => {
  const { clients, count = 1, className = 'flex w-full place-content-evenly', Component } = props;
  if (props.registerSignalFactory ?? true) {
    registerSignalFactory();
  }

  if (clients) {
    return (
      <div className={className}>
        {clients.map((client, index) => (
          <ClientContext.Provider key={index} value={{ client }}>
            <Component id={index} count={clients.length} {...props.args} />
          </ClientContext.Provider>
        ))}
      </div>
    );
  } else {
    return (
      <div className={className}>
        {[...Array(count)].map((_, index) => {
          return (
            <ClientProvider key={index} services={services}>
              <Component id={index} count={count} {...props.args} />
            </ClientProvider>
          );
        })}
      </div>
    );
  }
};
