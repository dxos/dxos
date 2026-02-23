//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Initiative } from '@dxos/assistant-toolkit';
import { InitiativeFunctions } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';
import { Trigger } from '@dxos/functions';
import { FunctionDefinition, QueueService } from '@dxos/functions';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { MarkdownEditor } from '@dxos/plugin-markdown';
import { Filter } from '@dxos/react-client/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { ButtonGroup, Input } from '@dxos/react-ui';

export const InitiativeSettings = ({ subject: initiative }: SurfaceComponentProps<Initiative.Initiative>) => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);

  const handleResetHistory = useCallback(async () => {
    const runtime = computeRuntime.getRuntime(Obj.getDatabase(initiative)!.spaceId);

    await runtime.runPromise(Initiative.resetChatHistory(initiative));

    if (!initiative.queue) {
      await runtime.runPromise(
        Effect.gen(function* () {
          const queue = yield* QueueService.createQueue();
          Obj.change(initiative, (initiative) => {
            initiative.queue = Ref.fromDXN(queue.dxn);
          });
        }),
      );
    }
  }, [initiative, computeRuntime]);

  const spec = useAtomValue(AtomRef.make(initiative.spec));
  const [specInitialValue] = useObject(spec, 'content');

  useEffect(() => {
    return Obj.subscribe(initiative, () => {
      queueMicrotask(() => syncTriggers(initiative));
    });
  }, [initiative]);

  return (
    <div className='flex flex-col gap-4'>
      <Input.Root>
        <Input.Label>Spec (what is the goal of the initiative?)</Input.Label>
        <MarkdownEditor.Root id={spec?.id ?? ''} object={spec}>
          <MarkdownEditor.Content initialValue={specInitialValue} />
        </MarkdownEditor.Root>
      </Input.Root>
      <ButtonGroup classNames='h-10'>
        <Button onClick={handleResetHistory}>Reset Chat History</Button>
      </ButtonGroup>
    </div>
  );
};

export default InitiativeSettings;

// TODO(dmaretskyi): Perhaps the association is better done with a relation.

/**
 * Foreign key {@link INITIATIVE_TRIGGER_EXTENSION_KEY} => <initative id : ObjectId>
 */
const INITIATIVE_TRIGGER_EXTENSION_KEY = 'dxos.org/extension/InitiativeTrigger';

/**
 * Foreign key {@link INITIATIVE_TRIGGER_EXTENSION_KEY} => <dxn string of subscription target>
 */
const INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY = 'dxos.org/extension/InitiativeTriggerTarget';

/**
 * Syncs triggers in the database with the initiative subscriptions.
 */

const syncTriggers = async (initiative: Initiative.Initiative) => {
  const db = Obj.getDatabase(initiative);
  if (!db) {
    return;
  }

  const triggers = await db
    .query(Filter.foreignKeys(Trigger.Trigger, [{ source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id }]))
    .run();

  // Delete triggers that are not in subscriptions.
  for (const trigger of triggers) {
    const target = Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

    const exists = initiative.subscriptions.find((subscription) => subscription.dxn.toString() === target);
    if (!exists && !(initiative.useQualifyingAgent && target === Obj.getDXN(initiative)?.toString())) {
      db.remove(trigger);
    }
  }

  // Add triggers that are not in the database.
  for (const subscription of initiative.subscriptions) {
    const relevantTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).some(
        (key) => key.id === subscription.dxn.toString(),
      ),
    );
    if (relevantTrigger) {
      continue;
    }

    const target = await subscription.tryLoad();
    if (!target || !target.queue || !(target.queue.dxn instanceof DXN) || target.queue.dxn.kind !== DXN.kind.QUEUE) {
      continue;
    }

    db.add(
      Trigger.make({
        [Obj.Meta]: {
          keys: [
            { source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id },
            { source: INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
          ],
        },
        enabled: true,
        spec: {
          kind: 'queue',
          queue: target.queue.dxn.toString(),
        },
        function: Ref.make(
          FunctionDefinition.serialize(
            initiative.useQualifyingAgent ? InitiativeFunctions.Qualifier : InitiativeFunctions.Agent,
          ),
        ),
        input: {
          initiative: Ref.make(initiative),
          event: '{{event}}',
        },
        concurrency: initiative.useQualifyingAgent ? 5 : undefined,
      }),
    );
  }

  if (initiative.useQualifyingAgent) {
    const qualifierTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).some(
        (key) => key.id === Obj.getDXN(initiative)?.toString(),
      ),
    );
    if (!qualifierTrigger && initiative.queue) {
      db.add(
        Trigger.make({
          [Obj.Meta]: {
            keys: [
              { source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id },
              { source: INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY, id: Obj.getDXN(initiative)?.toString() ?? '' },
            ],
          },
          function: Ref.make(FunctionDefinition.serialize(InitiativeFunctions.Agent)),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: initiative.queue.dxn.toString(),
          },
          input: {
            initiative: Ref.make(initiative),
            event: '{{event}}',
          },
        }),
      );
    }
  }

  await db.flush({ indexes: true });
};
