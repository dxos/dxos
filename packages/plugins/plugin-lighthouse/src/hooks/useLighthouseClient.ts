//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';

import { type Engine, type Extension, type LighthouseClient } from '#client';
import { LighthouseCapabilities, type Research } from '#types';

import { getEndpoint } from '../util/endpoint.ts';

/**
 * The client for a Research's connection, from the registered factory that handles its URL; undefined while the
 * connection or its credential loads, or when the Research has none.
 */
export const useLighthouseClient = (research: Research.Research): LighthouseClient | undefined => {
  const [connectionRef] = useObject(research, 'connection');
  const [connection] = useObject(connectionRef);
  const [accessToken] = useObject(connection?.accessToken);
  const factories = Hooks.useCapabilities(LighthouseCapabilities.ClientFactory);
  const url = accessToken ? getEndpoint(accessToken).url : undefined;
  const token = accessToken?.token;
  return useMemo(() => {
    if (url === undefined) {
      return undefined;
    }
    const endpoint = { url, token };
    return factories.find((factory) => factory.match(url))?.make(endpoint);
  }, [factories, url, token]);
};

/** A read the client answers once (engines, extensions), kept for the client's lifetime. */
const useOnce = <T>(
  client: LighthouseClient | undefined,
  read: (client: LighthouseClient) => Effect.Effect<T, unknown>,
) => {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    setValue(undefined);
    if (!client) {
      return;
    }
    let live = true;
    void EffectEx.runPromise(read(client).pipe(Effect.option)).then((result) => {
      if (live && result._tag === 'Some') {
        setValue(result.value);
      }
    });
    return () => {
      live = false;
    };
  }, [client, read]);
  return value;
};

const readEngines = (client: LighthouseClient) => client.listEngines();
const readExtensions = (client: LighthouseClient) => client.listExtensions();

/** The search engines the server's plugins contribute. */
export const useEngines = (client: LighthouseClient | undefined): Engine[] | undefined => useOnce(client, readEngines);

/** The extended ontologies the server offers. */
export const useExtensions = (client: LighthouseClient | undefined): Extension[] | undefined =>
  useOnce(client, readExtensions);
