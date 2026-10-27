//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import type * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { DXN } from '@dxos/echo';
import { Grant, Guard, Permission, Principal, Requirement, Subject } from '@dxos/permission';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpaceOperationHandlerSet from '@dxos/plugin-space/SpaceOperationHandlerSet';

/** A permission the configurator offers as a checkbox, and the command its grant names. */
export type PermissionOption = {
  id: 'read' | 'write' | 'exec';
  label: string;
  command: string;
  description: string;
};

export const PERMISSION_OPTIONS: readonly PermissionOption[] = [
  { id: 'read', label: 'Database read', command: '/space/read', description: 'queryObjects, getObjects' },
  { id: 'write', label: 'Database write', command: '/space/write', description: 'updateObject' },
  { id: 'exec', label: 'Sandbox exec', command: '/sandbox/exec', description: 'sandboxExec (stand-in)' },
];

export type PermissionId = PermissionOption['id'];

/**
 * Copies of plugin-space's database operations that declare what they need. The shared definitions
 * stay undeclared, since every Composer process without a guard would otherwise refuse them.
 */
export const QueryObjects = SpaceOperation.QueryObjects.pipe(Guard.requires(Requirement.make('/space/read')));
export const GetObjects = SpaceOperation.GetObjects.pipe(Guard.requires(Requirement.make('/space/read')));
export const UpdateObject = SpaceOperation.UpdateObject.pipe(Guard.requires(Requirement.make('/space/write')));

/** Commands {@link SandboxExec} answers; anything else exits 127, as a shell would. */
const SANDBOX_COMMANDS: Record<string, (args: string[]) => string> = {
  echo: (args) => args.join(' '),
  date: () => new Date().toUTCString(),
  uname: () => 'StandIn 1.0 story-sandbox (in-browser stand-in for the Cloudflare sandbox)',
  whoami: () => 'sandbox',
  pwd: () => '/workspace',
  ls: () => 'README.md\nsrc',
};

/**
 * A stand-in for `org.dxos.operation.sandbox.exec`: the real one needs a sandbox object and an EDGE
 * container, so this runs a few shell builtins in the page behind the same `/sandbox/exec` permission.
 */
export const SandboxExec = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.story.sandboxExec'),
    name: 'Sandbox exec',
    description: `Runs a shell command in the sandbox and returns its output. Available commands: ${Object.keys(SANDBOX_COMMANDS).join(', ')}.`,
    icon: 'ph--terminal-window--regular',
  },
  input: Schema.Struct({
    command: Schema.String.annotate({ description: 'Shell command to run.' }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    exitCode: Schema.Number,
  }),
}).pipe(Guard.requires(Requirement.make('/sandbox/exec')));

/** Wires a declared copy to the shared operation's own handler, loaded on first use like the original. */
const delegateTo = <Def extends Operation.Definition<any, any>>(declared: Def, original: Def) =>
  Operation.lazyHandler(declared, async () => {
    const handler = await OperationHandlerSet.findHandler(SpaceOperationHandlerSet.handlers, original);
    if (!handler) {
      throw new Error(`No handler for ${original.meta.key}.`);
    }
    return { default: Operation.withHandler(declared, handler.handler) };
  });

export const PermissionHandlers = OperationHandlerSet.merge(
  OperationHandlerSet.lazy([
    delegateTo(QueryObjects, SpaceOperation.QueryObjects),
    delegateTo(GetObjects, SpaceOperation.GetObjects),
    delegateTo(UpdateObject, SpaceOperation.UpdateObject),
  ]),
  OperationHandlerSet.make(
    SandboxExec.pipe(
      Operation.withHandler(({ command }) =>
        Effect.sync(() => {
          const [name = '', ...args] = command.trim().split(/\s+/);
          const builtin = SANDBOX_COMMANDS[name];
          return builtin
            ? { stdout: builtin(args), exitCode: 0 }
            : { stdout: `sh: ${name}: command not found`, exitCode: 127 };
        }),
      ),
    ),
  ),
);

export const PERMISSION_DEMO_SKILL_KEY = 'org.dxos.stories.compute.skill.permissionDemo';

/** The demo agent's only skill: the declared database operations and the sandbox stand-in. */
export const makePermissionDemoSkill = (): Skill.Skill =>
  Skill.make({
    key: PERMISSION_DEMO_SKILL_KEY,
    name: 'Workspace',
    instructions: Template.make({
      source: [
        'You work in a shared database of organizations and can run commands in a sandbox.',
        'Use the tools to do what the user asks. Keep replies to one or two sentences.',
        'A tool call can be refused for lack of permission: when that happens, say which permission is missing and stop; do not retry the call.',
      ].join('\n'),
    }),
    tools: Skill.toolDefinitions({ operations: [QueryObjects, GetObjects, UpdateObject, SandboxExec] }),
  });

export type MakeGuardOptions = {
  /** The identity granting the permissions: the story's own HALO DID. */
  issuer: string;
  /** The principal the agent process acts as. */
  audience: Principal.Principal;
  permissions: readonly PermissionId[];
};

/** One grant from `issuer` to `audience` for exactly the checked permissions, and the guard that holds it. */
export const makeGuard: (options: MakeGuardOptions) => Effect.Effect<{ grant: Grant.Grant; guard: Process.Guard }> =
  Effect.fnUntraced(function* ({ issuer, audience, permissions }: MakeGuardOptions) {
    const grant = yield* Grant.make({
      issuer: Principal.identity(issuer),
      audience,
      permissions: PERMISSION_OPTIONS.filter(({ id }) => permissions.includes(id)).map(({ command }) =>
        Permission.make({ subject: Subject.any(), command }),
      ),
    });
    return { grant, guard: Guard.make({ principal: audience, source: Guard.attested([grant]) }) };
  });
