//
// Copyright 2025 DXOS.org
//

// TODO(ZaymonFC): Export the DXOS logger from 'dxos:functions'.
/* eslint-disable no-console */

// @ts-ignore
import { createStatic, defineFunction, S, ObjectId, EchoObject, Filter } from 'dxos:functions';
// @ts-ignore
import { Effect } from 'https://esm.sh/effect@3.13.3';

export default defineFunction({
  inputSchema: S.Any,
  outputSchema: S.Struct({ success: S.Boolean }),
  handler: ({ event, context: { space } }: any) =>
    Effect.gen(function* () {
      console.log('Starting queue function', JSON.stringify(event.data));

      const contactStoredSchema = yield* Effect.gen(function* () {
        const existingSchema = yield* Effect.tryPromise({
          try: () => space.db.schemaRegistry.query({ typename: ContactType.typename }).firstOrUndefined(),
          catch: (e: any) => e,
        });

        if (existingSchema) {
          console.log('Found existing contact stored schema');
          return existingSchema;
        } else {
          console.log('Upserting contact stored schema');
          const [newSchema] = yield* Effect.tryPromise({
            try: () => space.db.schemaRegistry.register([ContactType]),
            catch: (e: any) => e,
          });
          return newSchema;
        }
      });

      const { objects } = yield* Effect.tryPromise({
        try: () => space.db.query(Filter.schema(contactStoredSchema)).run(),
        catch: (e: any) => e,
      });
      console.log('Loaded existing contacts', JSON.stringify(objects));

      const item = event.data.item as MessageType;
      const sender = (item as any).sender;

      const contactExists = (objects as ContactType[]).findIndex((c) => c.email === sender.email) !== -1;
      if (contactExists) {
        console.log('Contact already exists. No action required.');
        return { success: true };
      }

      const contact = createStatic(contactStoredSchema, { name: sender.name, email: sender.email });

      const addedObject = space.db.add(contact);
      console.log('Added contact to space', JSON.stringify(addedObject));

      yield* Effect.tryPromise({
        try: () => space.db.flush(),
        catch: (e: any) => e,
      });

      return { success: true };
    }),
});

//
// Types
//

const ContactType = S.Struct({
  name: S.optional(S.String),
  email: S.optional(S.String),
}).pipe(EchoObject('example.org/TempContactType', '0.1.0'));
type ContactType = S.Schema.Type<typeof ContactType>;

const ActorRoles = ['user', 'assistant'] as const;
const ActorRole = S.Literal(...ActorRoles);
type ActorRole = S.Schema.Type<typeof ActorRole>;

const ActorSchema = S.Struct({
  identityKey: S.optional(S.String),
  email: S.optional(S.String),
  name: S.optional(S.String),
  role: S.optional(ActorRole),
});
const AbstractContentBlock = S.Struct({
  pending: S.optional(S.Boolean),
});
type AbstractContentBlock = S.Schema.Type<typeof AbstractContentBlock>;
const TextContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('text'),
    disposition: S.optional(S.String),
    text: S.String,
  }),
).pipe(S.mutable);
type TextContentBlock = S.Schema.Type<typeof TextContentBlock>;
const JsonContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('json'),
    disposition: S.optional(S.String),
    data: S.String,
  }),
).pipe(S.mutable);
type JsonContentBlock = S.Schema.Type<typeof JsonContentBlock>;
const Base64ImageSource = S.Struct({
  type: S.Literal('base64'),
  mediaType: S.String,
  data: S.String,
}).pipe(S.mutable);
const HttpImageSource = S.Struct({
  type: S.Literal('http'),
  url: S.String,
}).pipe(S.mutable);
const ImageSource = S.Union(Base64ImageSource, HttpImageSource);
type ImageSource = S.Schema.Type<typeof ImageSource>;
const ImageContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('image'),
    id: S.optional(S.String),
    source: S.optional(ImageSource),
  }),
).pipe(S.mutable);
type ImageContentBlock = S.Schema.Type<typeof ImageContentBlock>;
const ReferenceContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('reference'),
    reference: S.Any,
  }),
).pipe(S.mutable);
type ReferenceContentBlock = S.Schema.Type<typeof ReferenceContentBlock>;
const MessageContentBlock = S.Union(TextContentBlock, JsonContentBlock, ImageContentBlock, ReferenceContentBlock);

const MessageType = S.Struct({
  id: ObjectId,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: ActorSchema.annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: S.Array(MessageContentBlock).annotations({
    description: 'Contents of the message.',
  }),
  properties: S.optional(
    S.mutable(
      S.Record({ key: S.String, value: S.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
}).pipe(EchoObject('dxos.org/type/Message', '0.1.0'));
type MessageType = S.Schema.Type<typeof MessageType>;
