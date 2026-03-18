//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import * as Option from 'effect/Option';

import { AiContextBinder, AiContextService, type ContextBinding } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Annotation, Database, Feed, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { type ObjectNotFoundError } from '@dxos/echo/Err';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { FunctionDefinition, QueueService, Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { FeedAnnotation, QueueAnnotation, Text } from '@dxos/schema';
import type { Message } from '@dxos/types';

import { ProjectFunctions } from '../blueprints/project/functions';

import * as Chat from './Chat';
import * as Plan from './Plan';

/**
 * Foreign key {@link PROJECT_TRIGGER_EXTENSION_KEY} => <project id : ObjectId>
 */
const PROJECT_TRIGGER_EXTENSION_KEY = 'org.dxos.extension.ProjectTrigger';

/**
 * Foreign key {@link PROJECT_TRIGGER_TARGET_EXTENSION_KEY} => <dxn string of subscription target>
 */
const PROJECT_TRIGGER_TARGET_EXTENSION_KEY = 'org.dxos.extension.ProjectTriggerTarget';

/** Checks if an object's schema has the FeedAnnotation. */
const hasFeedAnnotation = (obj: Obj.Unknown): boolean => {
  const schema = Obj.getSchema(obj);
  if (!schema) {
    return false;
  }
  const annotation = FeedAnnotation.get(schema);
  return Option.isSome(annotation) && annotation.value === true;
};

/**
 * Project schema definition.
 */
export const Project = Schema.Struct({
  name: Schema.String,

  spec: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  plan: Ref.Ref(Plan.Plan).pipe(FormInputAnnotation.set(false)),

  artifacts: Schema.Array(
    Schema.Struct({
      // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
      name: Schema.String,
      data: Ref.Ref(Obj.Unknown),
    }),
  ).pipe(FormInputAnnotation.set(false)),

  /**
   * Incoming queue that the agent processes.
   */
  // NOTE: Named `queue` to conform to subscribable schema (see QueueAnnotation).
  queue: Schema.optional(Ref.Ref(Queue).pipe(FormInputAnnotation.set(false))),

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Ref.Ref(Chat.Chat).pipe(FormInputAnnotation.set(false))),

  /**
   * References to objects with a canonical queue property.
   * Schema must have the QueueAnnotation.
   */
  // TODO(dmaretskyi): Turn into an array of objects when form-data
  subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false)),

  useQualifyingAgent: Schema.optional(Schema.Boolean).annotations({
    title: 'Use qualifying agent on subscriptions',
    description:
      'If enabled, the qualifying agent will be used to determine if the event is relevant to the project. Related events will be added to the input queue of the project. It is recommended to enable this.',
  }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.project',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--circuitry--regular',
    hue: 'sky',
  }),
  QueueAnnotation.set(true),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}

/**
 * Creates a fully initialized Project with chat, queue, and context bindings.
 *
 * @param props - Project properties including spec, plan, blueprints, and context objects.
 * @param blueprint - The blueprint to use for the project context.
 * @returns An Effect that yields the initialized Project.
 */
// TODO(burdon): Rename make and move into Project.ts?
export const makeInitialized = (
  props: Omit<Obj.MakeProps<typeof Project>, 'spec' | 'plan' | 'artifacts' | 'subscriptions' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Project>, 'artifacts' | 'subscriptions'>> & {
      spec: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
  blueprint: Blueprint.Blueprint,
): Effect.Effect<Project, never, QueueService | Database.Service> =>
  Effect.gen(function* () {
    const project = Obj.make(Project, {
      ...props,
      spec: Ref.make(Text.make(props.spec)),
      plan: Ref.make(Plan.makePlan({ tasks: [] })),
      artifacts: props.artifacts ?? [],
      subscriptions: props.subscriptions ?? [],
      useQualifyingAgent: props.useQualifyingAgent ?? true,
    });
    yield* Database.add(project);
    const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
    const contextBinder = new AiContextBinder({ queue });
    // TODO(dmaretskyi): Blueprint registry.
    const projectBlueprint = yield* Database.add(Obj.clone(blueprint, { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(projectBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(project), ...(props.contextObjects ?? [])],
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: project,
        queue: Ref.fromDXN(queue.dxn),
      }),
    );
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: project,
      }),
    );

    const inputQueue = yield* QueueService.createQueue();

    Obj.change(project, (project) => {
      project.chat = Ref.make(chat);
      project.queue = Ref.fromDXN(inputQueue.dxn);
    });

    return project;
  });

/**
 * Resets the project chat history by rebuilding the chat context.
 * Preserves the existing blueprints and objects from the current chat context.
 *
 * @param project - The project whose chat history should be reset. Must have an existing chat.
 * @returns An Effect that resets the chat history.
 */
export const resetChatHistory = (
  project: Project,
): Effect.Effect<void, ObjectNotFoundError, QueueService | Database.Service> =>
  Effect.gen(function* () {
    invariant(project.chat, 'Project must have an existing chat to reset.');

    const existingQueue = yield* project.chat.pipe(Database.load).pipe(
      Effect.map((_) => _.queue),
      Effect.flatMap(Database.load),
    );
    const existingContextBinder = yield* acquireReleaseResource(
      () =>
        new AiContextBinder({
          queue: existingQueue,
        }),
    );
    const blueprints = existingContextBinder.getBlueprints().map((blueprint) => Ref.make(blueprint));
    const objects = existingContextBinder.getObjects().map((object) => Ref.make(object));

    const queue = yield* QueueService.createQueue();
    const contextBinder = new AiContextBinder({ queue });
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints,
        objects,
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );

    Obj.change(project, (project) => {
      project.chat = Ref.make(chat);
    });

    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: project,
      }),
    );
  }).pipe(Effect.scoped);

export const getFromChatContext: Effect.Effect<Project, never, AiContextService> = Effect.gen(function* () {
  const projects = yield* Function.pipe(AiContextService.findObjects(Project));
  if (projects.length !== 1) {
    throw new Error('There should be exactly one project in context. Got: ' + projects.length);
  }
  const project = projects[0];
  return project;
});

/**
 * Syncs triggers in the database with the project subscriptions.
 *
 * @param project - The project whose triggers should be synced.
 * @returns An Effect that syncs triggers.
 */
export const syncTriggers = (project: Project): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const triggers = yield* Database.runQuery(
      Filter.foreignKeys(Trigger.Trigger, [{ source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id }]),
    );

    // Delete triggers that are not in subscriptions.
    for (const trigger of triggers) {
      const target = Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

      const exists = project.subscriptions.find((subscription) => subscription.dxn.toString() === target);
      if (!exists && !(project.useQualifyingAgent && target === Obj.getDXN(project)?.toString())) {
        yield* Database.remove(trigger);
      }
    }

    // Add triggers that are not in the database.
    for (const subscription of project.subscriptions) {
      const relevantTrigger = triggers.find((trigger) =>
        Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some(
          (key) => key.id === subscription.dxn.toString(),
        ),
      );
      if (relevantTrigger) {
        continue;
      }

      const targetOption = yield* Database.loadOption(subscription);
      if (Option.isNone(targetOption)) {
        continue;
      }
      const target = targetOption.value;

      let feedObj: Feed.Feed | undefined;
      if (Obj.instanceOf(Feed.Feed, target)) {
        feedObj = target;
      } else if (hasFeedAnnotation(target)) {
        const feedRef = (target as Obj.Unknown & { feed?: Ref.Ref<Feed.Feed> }).feed;
        feedObj = feedRef ? Option.getOrUndefined(yield* Database.loadOption(feedRef)) : undefined;
      }

      const queueDxn = Option.fromNullable(feedObj).pipe(
        Option.filter(Obj.instanceOf(Feed.Feed)),
        Option.map(Feed.getQueueDxn),
        Option.getOrUndefined,
      );
      if (!queueDxn) {
        continue;
      }

      yield* Database.add(
        Trigger.make({
          [Obj.Parent]: project,
          [Obj.Meta]: {
            keys: [
              // TODO(dmaretskyi): Query by parent instead of manually adding keys.
              { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
              { source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
            ],
          },
          enabled: true,
          spec: {
            kind: 'queue',
            queue: queueDxn.toString(),
          },
          function: Ref.make(
            FunctionDefinition.serialize(
              project.useQualifyingAgent ? ProjectFunctions.Qualifier : ProjectFunctions.Agent,
            ),
          ),
          input: {
            project: Ref.make(project),
            event: '{{event}}',
          },
          concurrency: project.useQualifyingAgent ? 5 : undefined,
        }),
      );
    }

    if (project.useQualifyingAgent) {
      const qualifierTrigger = triggers.find((trigger) =>
        Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some(
          (key) => key.id === Obj.getDXN(project)?.toString(),
        ),
      );
      if (!qualifierTrigger && project.queue) {
        yield* Database.add(
          Trigger.make({
            [Obj.Parent]: project,
            [Obj.Meta]: {
              keys: [
                { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
                {
                  source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY,
                  id: Obj.getDXN(project)?.toString() ?? '',
                },
              ],
            },
            function: Ref.make(FunctionDefinition.serialize(ProjectFunctions.Agent)),
            enabled: true,
            spec: {
              kind: 'queue',
              queue: project.queue.dxn.toString(),
            },
            input: {
              project: Ref.make(project),
              event: '{{event}}',
            },
          }),
        );
      }
    }

    yield* Database.flush();
  });
