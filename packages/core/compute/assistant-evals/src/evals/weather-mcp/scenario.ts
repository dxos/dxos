//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { CapabilityNotFoundError } from '@dxos/app-framework';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Chat from '@dxos/assistant/Chat';
import type * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import * as EchoError from '@dxos/echo/Error';
import type { SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as WeatherSpace from '@dxos/plugin-debug/WeatherSpace';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { type ToolInvocation, findObject } from '../../assertions.ts';
import { type SeedResult } from '../../runner.ts';

//
// What the weather-MCP eval and its offline tests share: the template's names, the predicates that
// read a hand-off out of a transcript, and the seed that stands a session up on the template. Kept
// apart from the eval file because importing that registers its evalite suite.
//

export const PROJECT_NAME = 'Weather MCP';
export const SKILL_KEY = 'org.dxos.skill.weatherMcp';

/** The template's four steps, all the session's. */
export const TASK_TITLES: readonly string[] = [
  'Build the weather MCP Worker',
  'Deploy it to a temporary Cloudflare account',
  'Configure the server for this space',
  'Test the tool from this chat',
];

export const WORKER_URL = /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i;
export const CLAIM_URL = /https:\/\/dash\.cloudflare\.com\/claim/i;

/**
 * A forecast carries a temperature: a number next to a degree sign, or a value after the field name
 * (quoted or JSON-escaped, since a tool result is graded as a serialized string). Naming the field
 * alone — an empty series, an error about it — is not a forecast.
 */
export const TEMPERATURE = /(?:temperature(?:_2m)?[\\"]*\s*:\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*°)/i;

export const OPENING_PROMPT = trim`
  You have been assigned tasks to work on in this session.
  Read all tasks, then work on them sequentially and on your own — do not stop to ask; nothing in
  this project needs the reader. The task descriptions are the specification.
  Update the tasklist as you work on each task, and mark each task done as you complete it.
`;

/**
 * The session's calls to the deployed server's weather tool that came back with a forecast. MCP tools
 * carry no operation key, which separates the server's tool from a sandbox command that curled the
 * upstream API directly.
 */
export const isWeatherCall = ({ name, operationKey, error, result }: ToolInvocation): boolean =>
  !operationKey && /weather|forecast/i.test(name) && !error && TEMPERATURE.test(JSON.stringify(result ?? ''));

/** The Database skill's update tool, the one write that reaches a skill's `mcpServers`. */
const UPDATE_OBJECT_KEY = `dxn:${String(SpaceOperation.UpdateObject.meta.key).replace(/^dxn:/, '')}`;

/** The session's own write that put a server at `server` into a skill's `mcpServers`. */
export const isConfiguration =
  (server: RegExp) =>
  ({ operationKey, input, error }: ToolInvocation): boolean => {
    if (error || operationKey !== UPDATE_OBJECT_KEY) {
      return false;
    }
    const servers = parseInput(input)?.properties?.mcpServers;
    return Array.isArray(servers) && servers.some((entry) => typeof entry?.url === 'string' && server.test(entry.url));
  };

type UpdatePatch = { properties?: { mcpServers?: { url?: unknown }[] } };

/** The tool's arguments as the transcript stores them; anything unparseable configured nothing. */
const parseInput = (input: string): UpdatePatch | undefined => {
  try {
    const parsed: unknown = JSON.parse(input);
    return typeof parsed === 'object' && parsed !== null ? (parsed as UpdatePatch) : undefined;
  } catch {
    return undefined;
  }
};

export type HandOff = {
  /** The session wrote a server into the skill's configuration. */
  readonly configured: boolean;
  /** The session got a forecast back from a weather tool. */
  readonly called: boolean;
  /** Picked up on the fly: the call comes after the write, in the same session, with no restart. */
  readonly calledAfterConfiguring: boolean;
};

/**
 * How the session got from configuring the server to calling it, read off its transcript. `server`
 * is what a configuring write must name: the deployed Worker for the eval, a loopback host for a test.
 */
export const evaluateHandOff = (invocations: readonly ToolInvocation[], options: { server: RegExp }): HandOff => {
  const configuredAt = invocations.find(isConfiguration(options.server))?.calledAt;
  const calls = invocations.filter(isWeatherCall);
  return {
    configured: configuredAt !== undefined,
    called: calls.length > 0,
    calledAfterConfiguring:
      configuredAt !== undefined && calls.some(({ calledAt }) => calledAt !== undefined && calledAt > configuredAt),
  };
};

/** The template did not seed what the run needs; the message names what is missing. */
export class SeedError extends Data.TaggedError('SeedError')<{ message: string }> {}

/**
 * Stands the run up on the template: applies the template, binds the project's skills to the
 * run's instructions, and files a chat carrying the four steps under the project. Returns what the
 * runner binds into the session context.
 */
export const seed = ({
  spaceId,
  instructions,
}: {
  spaceId: SpaceId;
  instructions: Instructions.Instructions;
}): Effect.Effect<
  SeedResult,
  SeedError | CapabilityNotFoundError | EchoError.EntityNotFoundError | SampleSpace.SampleSpaceError,
  Database.Service | Capabilities.ProcessManagerRuntimeServices
> =>
  Effect.gen(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const space = client.spaces.get(spaceId);
    if (!space) {
      return yield* new SeedError({ message: `Space not found: ${spaceId}` });
    }
    yield* SampleSpace.applyTo(WeatherSpace.make(), space);

    const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
    if (!project?.taskSet || !project.instructions) {
      return yield* new SeedError({ message: 'The template did not produce the project.' });
    }
    const taskSet = yield* Database.load(project.taskSet);
    const steps = (yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref))).filter((candidate) =>
      TASK_TITLES.includes(candidate.title),
    );
    if (steps.length !== TASK_TITLES.length) {
      return yield* new SeedError({ message: 'The template did not produce the four steps.' });
    }

    // The Weather MCP skill reaches the session through the project's instructions, which a
    // delegated session does not bind yet. It is the session's own configuration: the server the
    // run sets on it is connected at the start of the session's next turn.
    const projectInstructions = yield* Database.load(project.instructions);
    for (const ref of projectInstructions.skills) {
      const skill = yield* Database.load(ref);
      Obj.update(instructions, (instructions) => {
        instructions.skills.push(Ref.make(skill));
      });
    }

    // The chat the session runs on, carrying the four steps and filed under the project.
    const feed = yield* Database.add(Feed.make());
    const chat = yield* Database.add(Chat.make({ name: PROJECT_NAME, feed: Ref.make(feed) }));
    Chat.assignTasks(
      chat,
      steps.map((step: Task.Task) => Ref.make(step)),
    );
    Chat.linkCompanion({ chat, subject: project });
    yield* Database.flush();

    return { objects: [Ref.make(project)], chat: Ref.make(chat) };
  });
