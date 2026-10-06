//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import type * as Plugin from '@dxos/app-framework/Plugin';
import { PluginManagerHost } from '@dxos/app-framework/testing';
import { useClient } from '@dxos/react-client';

import { ClientPlugin } from '#plugin';
import { type ClientOptions } from '#types';

export type ClientPluginManagerProps = PropsWithChildren<{
  /** Distinguishes this client's manager from the others in the story. */
  id: string;
  /** Plugins beside `ClientPlugin`, built per client since plugin instances hold state. */
  plugins: () => Plugin.Plugin[];
  /** Options for the `ClientPlugin` that adopts the client. */
  clientOptions?: Omit<ClientOptions.ClientPluginOptions, 'client'>;
}>;

/**
 * Hosts `children` in a plugin app whose `ClientPlugin` adopts the enclosing `ClientProvider`'s
 * client, so a multi-client story runs the real plugins once per client. Use it as
 * `withMultiClientProvider({ wrapper })`.
 */
export const ClientPluginManager = ({ id, plugins, clientOptions, children }: ClientPluginManagerProps) => {
  const client = useClient();
  const options = useMemo(
    () => ({ plugins: [ClientPlugin({ ...clientOptions, client }), ...plugins()] }),
    // The plugins are rebuilt only with the client: a new manager per render would never settle.
    [client],
  );

  return (
    // Story layouts are `fixed inset-0`; layout containment confines each client's app to its own cell.
    <div className='relative overflow-hidden contain-layout'>
      <PluginManagerHost id={id} options={options}>
        {children}
      </PluginManagerHost>
    </div>
  );
};
