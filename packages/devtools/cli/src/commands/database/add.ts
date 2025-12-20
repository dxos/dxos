//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { SpaceProperties } from '@dxos/client/echo';
import { Database, type Entity, Filter, Ref, Type } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess/types';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { CommandConfig } from '../../services';
import { flushAndSync, getSpace, print, spaceLayer, withTypes } from '../../util';
import { Common } from '../options';

import { printObject } from './util';

export const add = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('The typename to create.'), Options.optional),
  },
  ({ typename }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const [properties] = yield* Database.Service.runQuery(Filter.type(SpaceProperties));
      const collection = yield* Database.Service.load<Collection.Collection>(
        properties[Collection.Collection.typename],
      );

      const selectedTypename = yield* Option.match(typename, {
        onNone: () => selectTypename(),
        onSome: (t) => Effect.succeed(t),
      });
      const object = yield* createObject(selectedTypename);
      collection.objects.push(Ref.make(object));

      if (json) {
        yield* Console.log(JSON.stringify(object, null, 2));
      } else {
        yield* Console.log(print(printObject(object)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Add an object to a space.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() =>
    withTypes(SpaceProperties, Collection.Collection, ...TYPE_REGISTRY.map(({ type }) => type)),
  ),
);

/**
 * Type registry mapping typename to display name.
 */
const TYPE_REGISTRY = [
  { type: Calendar.Calendar, name: 'Calendar' },
  { type: Chess.Game, name: 'Game' },
  { type: Mailbox.Mailbox, name: 'Mailbox' },
  { type: Markdown.Document, name: 'Document' },
  { type: Organization.Organization, name: 'Organization' },
  { type: Person.Person, name: 'Person' },
] as const;

/**
 * Creates an object based on the typename.
 */
const createObject = Effect.fn(function* (typename: string) {
  const spaceId = yield* Database.Service.spaceId;
  const space = yield* getSpace(spaceId);
  return yield* Match.value(typename).pipe(
    Match.withReturnType<Effect.Effect<Entity.Unknown, Error>>(),
    Match.when(Markdown.Document.typename, () => Effect.succeed(Markdown.make())),
    Match.when(Chess.Game.typename, () => Effect.succeed(Chess.make())),
    Match.when(Organization.Organization.typename, () => Effect.succeed(Organization.make())),
    Match.when(Person.Person.typename, () => Effect.succeed(Person.make())),
    Match.when(Mailbox.Mailbox.typename, () => Effect.succeed(Mailbox.make({ space }))),
    Match.when(Calendar.Calendar.typename, () => Effect.succeed(Calendar.make({ space }))),
    Match.orElse(() => Effect.fail(new Error(`Unknown typename: ${typename}`))),
  );
});

/**
 * Prompts for typename selection if not provided.
 */
const selectTypename = Effect.fn(function* () {
  const choices = TYPE_REGISTRY.map((type) => ({
    title: type.name,
    value: Type.getTypename(type.type),
    description: Type.getTypename(type.type),
  }));

  const selected = yield* Prompt.select({
    message: 'Select a type:',
    choices,
  });

  return selected;
});
