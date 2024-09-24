//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { getObjectCore } from '@dxos/echo-db';
import type { AnyObjectData } from '@dxos/echo-schema';
import { type FunctionTrigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN, LOCAL_SPACE_TAG } from '@dxos/keys';
import { log } from '@dxos/log';
import { FunctionType } from '@dxos/plugin-script';
import { type Client, type Config } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1_000;

export const invokeFunction = async (client: Client, space: Space, trigger: FunctionTrigger, data: any) => {
  try {
    const script = await space.crud.query({ id: trigger.function }).first();
    const { objects: functions } = await space.crud.query({ __typename: FunctionType.typename }).run();
    const func = functions.find((fn) => referenceEquals(fn.source, trigger.function)) as AnyObjectData | undefined;
    const funcSlug = func?.__meta.keys.find((key) => key.source === USERFUNCTIONS_META_KEY)?.id;
    if (!funcSlug) {
      log.warn('function not deployed', { scriptId: script.id, name: script.name });
      return 404;
    }

    const funcUrl = getFunctionUrl(client.config, funcSlug, space.id);

    const triggerData: AnyObjectData = getObjectCore(trigger).toPlainObject();
    const body = {
      event: 'trigger',
      trigger: triggerData,
      data,
    };

    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      log.info('exec', { funcUrl, funcSlug, body, retryCount });
      const response = await fetch(funcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      log.info('response', { status: response.status, body: await response.text() });
      if (response.status === 409) {
        retryCount++;
        await sleep(RETRY_DELAY);
        continue;
      }

      return response.status;
    }

    return 500;
  } catch (err) {
    return 400;
  }
};

const USERFUNCTIONS_META_KEY = 'dxos.org/service/function';

const getFunctionUrl = (config: Config, slug: string, spaceId?: string) => {
  const baseUrl = new URL('functions/', config.values.runtime?.services?.edge?.url);

  // Leading slashes cause the URL to be treated as an absolute path.
  const relativeUrl = slug.replace(/^\//, '');
  const url = new URL(`./${relativeUrl}`, baseUrl.toString());
  spaceId && url.searchParams.set('spaceId', spaceId);
  url.protocol = 'https';
  return url.toString();
};

// TODO(dmaretskyi): Factor out.

type ReferenceLike = { '/': string } | string;

const referenceEquals = (a: ReferenceLike, b: ReferenceLike): boolean => {
  const aDXN = toDXN(a);
  const bDXN = toDXN(b);
  return aDXN.toString() === bDXN.toString();
};

const toDXN = (ref: ReferenceLike): DXN => {
  if (typeof ref === 'string') {
    if (ref.startsWith('dxn:')) {
      return DXN.parse(ref);
    } else {
      return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, ref]);
    }
  }

  invariant(typeof ref['/'] === 'string');
  return DXN.parse(ref['/']);
};
