//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { Mutex } from '@dxos/async';
import { Context } from '@dxos/context';
import { createSubscriptionTrigger, type TriggerFactory } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';

import { invokeFunction } from './invocation-handler';
import { FunctionTrigger } from '../types';

const registerTriggersMutex = new Mutex();

export const useLocalTriggerManager = (space: Space) => {
  const client = useClient();

  // TODO(burdon): Factor out, creating context for plugin (runs outside of component).
  const [registry] = useState(new Map<string, Context>());
  const triggers = useQuery(space, Filter.schema(FunctionTrigger));
  useEffect(() => {
    setTimeout(async () => {
      // Mark-and-sweep removing disabled triggers.
      await registerTriggersMutex.executeSynchronized(async () => {
        const deprecated = new Set(Array.from(registry.keys()));
        log('triggers', {
          deprecated,
          all: triggers.map((t) => t.id),
          enabled: triggers.filter((t) => t.enabled).map((t) => t.id),
        });

        for (const trigger of triggers) {
          if (trigger.enabled) {
            if (registry.has(trigger.id)) {
              deprecated.delete(trigger.id);
              continue;
            }
            log.info('activating trigger', trigger.id);

            const ctx = new Context();
            registry.set(trigger.id, ctx);
            const triggerSpec = trigger.spec;
            invariant(triggerSpec);

            let triggerFactory: TriggerFactory<any>;
            if (triggerSpec.type === 'subscription') {
              triggerFactory = createSubscriptionTrigger;
            } else {
              log.info('unsupported trigger', { type: triggerSpec.type });
              continue;
            }

            await triggerFactory(ctx, space, trigger.spec, (data: any) => {
              return invokeFunction(client, space, trigger, data);
            });
          }
        }

        for (const id of deprecated) {
          const ctx = registry.get(id);
          if (ctx) {
            await ctx.dispose();
            registry.delete(id);
          }
        }
      });
    });
  }, [JSON.stringify(triggers)]);

  useEffect(() => {
    return () => {
      for (const ctx of registry.values()) {
        void ctx.dispose();
      }
    };
  }, []);
};
