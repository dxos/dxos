//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Trigger } from '@dxos/functions';
import { Operation, OperationHandlerSet } from '@dxos/operation';

const BLUEPRINT_KEY = 'dxos.org/blueprint/automation';

const instructions = trim`
  Automation allows you to automatically initiate actions based on events.
  Automations are configured by creating a trigger that references a function.
  Whenever event that matches the trigger occurs, the function is invoked.

  ## Configuration

  Triggers are configured by the properties of the Trigger object.
  - enabled: Must be true for trigger to run.
  - spec: Events that the trigger matches.
  - function: Ref to a ${Operation.PersistentOperation.typename} object that will be invoked. Query the functions present in the space first, and reference them in the trigger.
  - input: The spec of the input data that will be passed to the function.

  ## Input patterns

  Input to the invoked function is defined by the input property of the Trigger object.
  It's an object that supports constants or template strings.

  Example:

  {
    item: '{{event.item}}',
    instructions: 'Summarize and perform entity-extraction'
    mailbox: { '/': 'dxn:echo:AAA:ZZZ' }
  }

  ## Trigger kinds

  - Timer: Triggered by a cron schedule.
  - Queue: Subscribes and processes items begginging to end.
            Note: queues are the same as feeds. The queue DXN should be of form: dxn:queue:data:<space-id>:<queue-id>.
  - Subscription: Subscribes and processes database items based on a query.

  Avoid: email and webhook triggers.

  ## Editing triggers

  Triggers are represented as objects of type ${Trigger.Trigger.typename}.
  You need access to the Database blueprint to manipulate triggers.
  Read trigger schema before manipulating triggers.
  Having a Trigger object in the database is enough to setup an automation. 

  ## Examples

  Timer:

  {
    "function": { "/": "dxn:echo:AAA:ZZZ" },
    "enabled": true,
    "spec": {
      "kind": "timer",
      "cron": "*/5 * * * *"
    }
  }

  Queue:

  {
    "function": { "/": "dxn:echo:AAA:ZZZ" },
    "enabled": true,
    "spec": {
      "kind": "queue",
      "queue": "dxn:queue:data:XXX:YYY"
    }
  }

  Subscription:

  {
    "function": { "/": "dxn:echo:AAA:ZZZ" },
    "enabled": true,
    "spec": {
      "kind": "subscription",
      "query": { "ast": { "type": "select", "filter": { "type": "object", "typename": "dxn:type:org.dxos.type.person" } } }
    }
  }
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Triggers',
    description: 'Trigger management and automation.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: OperationHandlerSet.empty,
  make,
};

export default blueprint;
