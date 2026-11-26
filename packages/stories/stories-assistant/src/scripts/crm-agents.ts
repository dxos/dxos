//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as Operation from '@dxos/compute/Operation';

import { CRM_ACCOUNT, CRM_WRITE, LEDGER, SCOUT, SetOrganizationStatus } from '../testing/crm.ts';
import { composerAsides, threadPrompt } from '../testing/scripted.ts';

const SET_STATUS = Operation.toolName(SetOrganizationStatus);
const AGENT_DELEGATE = Operation.toolName(DelegationSkill.Operations.AgentDelegate);

/** What the reader asks Scout, which holds no grant to change the CRM. */
export const SCOUT_REQUEST = `${CRM_ACCOUNT} signed the contract. Mark them active in the CRM.`;

/** What Scout says once it has handed the request on; the story waits for it. */
export const SCOUT_DELEGATED = `I do not hold ${CRM_WRITE}, so I handed the change to ${LEDGER}`;

/** What Scout asks Ledger, which holds the grant. */
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
      ScriptedScene.reasoning(
        `The CRM refused the change: I hold no grant for it. ${LEDGER} keeps the CRM and holds it.`,
      ),
      ScriptedScene.text(`I cannot change the CRM myself. Handing this to ${LEDGER}.`),
      ScriptedScene.toolCall(AGENT_DELEGATE, { agent: LEDGER, message: LEDGER_REQUEST }),
    ],
    { delay: '1200 millis' },
  ),
  ScriptedScene.turn('tool', new RegExp(`Handed the request to ${LEDGER}`)),
  ScriptedScene.turn('assistant', [ScriptedScene.text(`${SCOUT_DELEGATED}, which works it in its own session.`)], {
    delay: '800 millis',
  }),
]);

const ledger = ScriptedScene.conversation(LEDGER, [
  // Scout's request, as the turn the delegation opens in Ledger's session.
  ScriptedScene.turn('user', new RegExp(LEDGER_REQUEST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
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

/** Scout is refused the change it lacks a grant for and hands it to Ledger, which makes it. */
export const crmAgents = ScriptedScene.make([scout, ledger], { asides: composerAsides, promptOf: threadPrompt });
