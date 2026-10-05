//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

import { ConversationSkill, GoalsSkill, InterviewSkill, ModesSkill, NoteTakerSkill, RelaySkill } from '#skills';
import { Memory, Mode } from '#types';

import { loadCopies, openBinder } from './agent-skills.ts';
import { AgentOperationError } from './errors.ts';

/** Bound in every mode: the agent's voice, mode switching, relay and goals (reachable from any mode). */
export const BASE_SKILL_KEYS: readonly string[] = [
  ConversationSkill.key,
  ModesSkill.key,
  RelaySkill.key,
  GoalsSkill.key,
];

type BuiltinMode = { name: string; description: string; skills: readonly string[]; records?: Memory.Kind[] };

/** The modes every agent starts with; people can add their own `Mode` objects beside them. */
export const BUILTIN_MODES: readonly BuiltinMode[] = [
  { name: Mode.DEFAULT, description: 'Answers and helps in the conversation.', skills: [] },
  {
    name: 'Note-taker',
    description: 'Records what is said or dictated as markdown notes attached to its subject.',
    skills: [NoteTakerSkill.key],
    records: ['note'],
  },
  {
    name: 'Interviewer',
    description: 'Interviews the person to learn their role, goals, team and preferences.',
    skills: [InterviewSkill.key],
    records: ['fact', 'goal', 'preference', 'relationship'],
  },
  {
    name: 'Relay',
    description: 'Carries messages between people and reports back what they said.',
    skills: [RelaySkill.key],
    records: ['commitment'],
  },
];

/** The ref a chat binds for a skill: the agent's customized copy if it has one, else the compiled skill. */
export const skillRef = (
  agent: Agent.Agent,
  key: string,
): Effect.Effect<Ref.Ref<Skill.Skill>, never, Database.Service> =>
  loadCopies(agent, key).pipe(
    Effect.map((copies) => {
      const copy = copies.sort((left, right) => left.id.localeCompare(right.id)).at(0);
      return copy ? Ref.make(copy) : Ref.fromURI(Skill.registryURI(key));
    }),
  );

/** `Skill.registryURI` names a compiled skill as a DXN of its key. */
const REGISTRY_PREFIX = 'dxn:';

/** The registry key a mode's skill ref names, whether it is a registry URI or a space copy. */
export const skillKeyOf = (ref: Ref.Ref<Skill.Skill>): string | undefined => {
  const target = ref.peek();
  if (target) {
    return Obj.getMeta(target).key;
  }
  const known = [...BASE_SKILL_KEYS, ...BUILTIN_MODES.flatMap(({ skills }) => skills)].find(
    (key) => Skill.registryURI(key) === ref.uri,
  );
  return known ?? (ref.uri.startsWith(REGISTRY_PREFIX) ? ref.uri.slice(REGISTRY_PREFIX.length) : undefined);
};

/**
 * The agent's modes, creating the built-in ones it lacks; parented to the agent so they cascade with it.
 * A child-of filter rather than `.children()`, which EDGE's query planner cannot run.
 */
export const ensureModes = (agent: Agent.Agent): Effect.Effect<Mode.Mode[], never, Database.Service> =>
  Effect.gen(function* () {
    const existing = (yield* Database.query(Filter.and(Filter.type(Mode.Mode), Filter.childOf(agent))).run).filter(
      (object): object is Mode.Mode => Obj.instanceOf(Mode.Mode, object),
    );
    const missing = BUILTIN_MODES.filter(({ name }) => !existing.some((mode) => mode.name === name));
    const created = yield* Effect.forEach(missing, ({ name, description, skills, records }) =>
      Database.add(
        Obj.make(Mode.Mode, {
          name,
          description,
          skills: skills.map((key) => Ref.fromURI(Skill.registryURI(key))),
          ...(records ? { records: [...records] } : {}),
          [Obj.Parent]: agent,
        }),
      ),
    );
    return [...existing, ...created];
  }).pipe(Effect.orDie);

/** Finds a mode by name, case-insensitively. */
export const findMode = (modes: readonly Mode.Mode[], name: string): Mode.Mode | undefined =>
  modes.find((mode) => mode.name.trim().toLowerCase() === name.trim().toLowerCase());

/**
 * Puts the chat in `mode`: unbinds the skills of every other mode (never the base skills), binds the
 * mode's skills (the agent's customized copies where they exist), and records the mode on the chat.
 */
export const switchChatMode = Effect.fnUntraced(function* (agent: Agent.Agent, chat: Chat.Chat, name: string) {
  const modes = yield* ensureModes(agent);
  const mode = findMode(modes, name);
  if (!mode) {
    return yield* Effect.fail(
      new AgentOperationError({
        message: `No mode named "${name}"; available: ${modes.map((mode) => mode.name).join(', ')}.`,
      }),
    );
  }

  const wanted = new Set(mode.skills.map(skillKeyOf).filter((key) => key !== undefined));
  const base = new Set(BASE_SKILL_KEYS);
  const modeKeys = new Set(
    modes.flatMap((mode) => mode.skills.map(skillKeyOf)).filter((key) => key !== undefined && !base.has(key)),
  );

  const binder = yield* openBinder(chat);
  const bound = binder.getSkills();
  const unbind = bound.filter((skill) => {
    const key = Obj.getMeta(skill).key;
    return key !== undefined && modeKeys.has(key) && !wanted.has(key);
  });
  if (unbind.length > 0) {
    yield* Effect.promise(() => binder.unbind({ skills: unbind.map(Skill.makeRef) }));
  }

  const boundKeys = new Set(binder.getSkills().map((skill) => Obj.getMeta(skill).key));
  const toBind = yield* Effect.forEach(
    [...base, ...wanted].filter((key) => !boundKeys.has(key)),
    (key) => skillRef(agent, key),
  );
  if (toBind.length > 0) {
    yield* Effect.promise(() => binder.bind({ skills: toBind }));
  }

  Obj.update(chat, (chat) => Mode.setCurrent(chat, mode.name));
  return { mode: mode.name, skills: [...wanted] };
}, Effect.scoped);
