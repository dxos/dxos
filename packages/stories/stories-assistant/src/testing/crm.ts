//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { AiContext } from '@dxos/assistant';
import * as AgentSkill from '@dxos/assistant-toolkit/AgentSkill';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as AgentSetup from '@dxos/assistant/AgentSetup';
import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import type * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';
import { Grant, Guard, Permission, Principal, Requirement, Subject } from '@dxos/permission';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

//
// Two agents in one space with different permissions: Scout researches accounts and holds no grant to change
// them; Ledger keeps the CRM and holds `/crm/write`. A request that needs the CRM changed reaches Scout, which
// cannot do it itself and hands it to Ledger.
//

/** The command that changing an organization's CRM record requires. */
export const CRM_WRITE = '/crm/write';

export const SCOUT = 'Scout';
export const LEDGER = 'Ledger';

/** Each agent, what it does, and the commands it holds grants for. */
export const CRM_AGENTS: readonly {
  name: string;
  instructions: string;
  commands: readonly string[];
  /** Whether the agent can hand work to another agent (the delegation skill). */
  delegates: boolean;
}[] = [
  {
    name: SCOUT,
    instructions: 'You research accounts. You cannot change the CRM yourself; Ledger can.',
    commands: [],
    delegates: true,
  },
  {
    name: LEDGER,
    instructions: 'You keep the CRM: you change the status of organizations when asked.',
    commands: [CRM_WRITE],
    delegates: false,
  },
];

export const CRM_ACCOUNT = 'Bramble Coffee Roasters';

/** The statuses an organization's CRM record takes, as `Organization.status` does. */
const CrmStatus = Schema.Literals(['prospect', 'qualified', 'active', 'commit', 'reject']);

/** Sets an organization's CRM status, which only an agent granted {@link CRM_WRITE} may do. */
export const SetOrganizationStatus = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.crm.setOrganizationStatus'),
    name: 'Set organization status',
    description: 'Sets the CRM status of the organization with the given name.',
    icon: 'ph--buildings--regular',
  },
  input: Schema.Struct({
    name: Schema.String.annotate({ description: 'The name of the organization.' }),
    status: CrmStatus.annotate({ description: 'The status to set.' }),
  }),
  output: Schema.Struct({ name: Schema.String, status: Schema.String }),
  services: [Database.Service],
}).pipe(Guard.requires(Requirement.make(CRM_WRITE)));

export const CrmHandlers = OperationHandlerSet.make(
  SetOrganizationStatus.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ name, status }) {
        const organizations = yield* Database.query(Filter.type(Organization.Organization)).run;
        const organization = organizations.find((candidate) => candidate.name === name);
        if (!organization) {
          return yield* Effect.die(new Error(`No organization named "${name}".`));
        }
        Obj.update(organization, (organization) => {
          organization.status = status;
        });
        return { name, status };
      }),
    ),
  ),
);

export const CRM_SKILL_KEY = 'com.example.skill.crm';

/** Both agents' skill: the same tool, which only Ledger's grants admit. */
export const makeCrmSkill = (): Skill.Skill =>
  Skill.make({
    key: CRM_SKILL_KEY,
    name: 'CRM',
    instructions: Template.make({
      source: trim`
        You work on the organizations in the CRM. A tool call can be refused for lack of permission: when it is,
        do not retry the call; hand the request to the agent that holds the permission if you can delegate,
        otherwise say which permission is missing and which agent holds it.
      `,
    }),
    tools: Skill.toolDefinitions({ operations: [SetOrganizationStatus] }),
  });

/** Who granted the agents their permissions; the guard trusts it because the story's runtime attests its grants. */
const ISSUER = Principal.process('story://crm/owner');

/** The principal an agent's processes act as. */
const principalOf = (agent: string) => Principal.process(`agent://crm/${agent}`);

const makeAgentGuard = Effect.fnUntraced(function* (agent: string, commands: readonly string[]) {
  const audience = principalOf(agent);
  const grant = yield* Grant.make({
    issuer: ISSUER,
    audience,
    permissions: commands.map((command) => Permission.make({ subject: Subject.any(), command })),
  });
  return Guard.make({ principal: audience, source: Guard.attested([grant]) });
});

/** Gives each agent's sessions the grants that agent holds; built once, since a new guard restarts the session. */
export const CrmPermissionsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('com.example.plugin.crmPermissions'), name: 'CRM permissions' }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.crmPermissions.module.guards',
    activatesOn: ActivationEvents.Startup,
    provides: [AssistantCapabilities.SessionGuard, Capabilities.OperationHandler],
    activate: Effect.fnUntraced(function* () {
      const guards = new Map<string, Process.Guard>();
      for (const { name, commands } of CRM_AGENTS) {
        guards.set(name, yield* makeAgentGuard(name, commands));
      }
      const sessionGuard: AssistantCapabilities.SessionGuard = (session) => {
        const parent = Obj.getParent(session);
        return parent && Obj.instanceOf(Agent.Agent, parent) && parent.name ? guards.get(parent.name) : undefined;
      };
      return [
        Capability.contribute(AssistantCapabilities.SessionGuard, sessionGuard),
        Capability.contribute(Capabilities.OperationHandler, CrmHandlers),
      ];
    }),
  }),
  Plugin.make,
);

/** Seeds the account and creates both agents, each with a local chat bound to the CRM skill. */
export const seedCrmAgents = async ({ db }: { db: Database.Database }): Promise<void> => {
  db.add(Organization.make({ name: CRM_ACCOUNT, status: 'prospect' }));
  const crm = db.add(makeCrmSkill());
  const delegation = db.add(DelegationSkill.make());
  const runtime = await EffectEx.runPromise(
    Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(db))),
  );
  for (const { name, instructions, delegates } of CRM_AGENTS) {
    const agent = await EffectEx.runPromise(
      AgentSetup.makeInitialized({ name, instructions }, AgentSkill.make()).pipe(Effect.provide(Database.layer(db))),
    );
    const chat = await EffectEx.runPromise(Agent.loadSession(agent).pipe(Effect.provide(Database.layer(db))));
    if (!chat) {
      throw new Error(`Agent ${name} has no chat.`);
    }
    // An agent's chat runs on EDGE unless told otherwise; a guard is a closure, so only a local one holds grants.
    Obj.update(chat, (chat) => {
      chat.name = name;
      chat.remote = false;
    });
    const feed = await chat.feed.load();
    const binder = new AiContext.Binder({ feed, runtime });
    const skills = delegates ? [crm, delegation] : [crm];
    await binder.use((binder) => binder.bind({ skills: skills.map((skill) => Ref.make(skill)) }));
  }
  await db.flush({ indexes: true });
};
