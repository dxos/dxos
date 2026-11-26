//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';

import { CRM_ACCOUNT, CRM_WRITE, LEDGER, SCOUT, SetOrganizationStatus } from '../testing/crm.ts';
import { composerAsides, threadPrompt } from '../testing/scripted.ts';

const SET_STATUS = Operation.toolName(SetOrganizationStatus);

/** What the reader asks Scout, which holds no grant to change the CRM. */
export const SCOUT_REQUEST = `${CRM_ACCOUNT} signed the contract. Mark them active in the CRM.`;

/** What Scout says once its call is refused; the story waits for it. */
export const SCOUT_REFUSED = `I do not hold ${CRM_WRITE}, so I cannot change the CRM. ${LEDGER} holds it`;

/** What the reader asks Ledger, which holds the grant. */
export const LEDGER_REQUEST = `Mark ${CRM_ACCOUNT} active in the CRM: they signed the contract.`;

/** What Ledger says once the record is changed. */
export const LEDGER_DONE = `${CRM_ACCOUNT} is now active in the CRM.`;

const scout = ScriptedScene.conversation(SCOUT, [
  ScriptedScene.turn('user', SCOUT_REQUEST),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(`Updating ${CRM_ACCOUNT} in the CRM.`),
      ScriptedScene.toolCall(SET_STATUS, { name: CRM_ACCOUNT, status: 'active' }),
    ],
    { delay: '1200 millis' },
  ),
  // The guard refuses the call, and the refusal names the command that needs a grant.
  ScriptedScene.turn('tool', new RegExp(CRM_WRITE.replace(/\//g, '\\/'))),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('The CRM refused the change: I hold no grant for it. Ledger keeps the CRM.'),
      ScriptedScene.text(`${SCOUT_REFUSED}: this needs delegating to ${LEDGER}.`),
    ],
    { delay: '1200 millis' },
  ),
]);

const ledger = ScriptedScene.conversation(LEDGER, [
  ScriptedScene.turn('user', LEDGER_REQUEST),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(`Updating ${CRM_ACCOUNT} in the CRM.`),
      ScriptedScene.toolCall(SET_STATUS, { name: CRM_ACCOUNT, status: 'active' }),
    ],
    { delay: '1200 millis' },
  ),
  ScriptedScene.turn('tool', /"status":\s*"active"/),
  ScriptedScene.turn('assistant', [ScriptedScene.text(LEDGER_DONE)], { delay: '800 millis' }),
]);

/** Two agents with different permissions asked for the same change: Scout is refused, Ledger makes it. */
export const crmAgents = ScriptedScene.make([scout, ledger], { asides: composerAsides, promptOf: threadPrompt });
