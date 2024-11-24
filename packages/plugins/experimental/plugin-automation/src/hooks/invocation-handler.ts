//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { getObjectCore, ResultFormat } from '@dxos/echo-db';
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

const callFunction = async (funcUrl: string, trigger: any, data: any) => {
  const body = { event: 'trigger', trigger, data };

  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    log.info('exec', { funcUrl, body, retryCount });
    const response = await fetch(funcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    log.info('response', { status: response.status, body: data });
    if (response.status === 409) {
      retryCount++;
      await sleep(RETRY_DELAY * Math.min(retryCount, 2));
      continue;
    }

    return { status: response.status, data };
  }
  return { status: 500 };
};

export const invokeFunction = async (client: Client, space: Space, trigger: FunctionTrigger, data: any) => {
  try {
    invariant(trigger.spec);
    invariant(trigger.function);

    const script = await space.db.query({ id: trigger.function }, { format: ResultFormat.Plain }).first();
    const { objects: functions } = await space.db
      .query({ __typename: FunctionType.typename }, { format: ResultFormat.Plain })
      .run();
    const func = functions.find((fn) => referenceEquals(fn.source, trigger.function!)) as AnyObjectData | undefined;
    const funcSlug = func?.__meta.keys.find((key) => key.source === USERFUNCTIONS_META_KEY)?.id;
    if (!funcSlug) {
      log.warn('function not deployed', { scriptId: script.id, name: script.name });
      return 404;
    }

    const funcUrl = getFunctionUrl(client.config, funcSlug, space.id);
    const triggerData: AnyObjectData = {
      ...getObjectCore(trigger).toPlainObject(),
      // TODO: Remove when functions can query by DXN.
      promptId: trigger.meta?.prompt?.id,
    };
    // TODO: Remove when functions can add objects and easily modify collections (push, splice).
    return (await callFunction(funcUrl, triggerData, data)).status;
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
