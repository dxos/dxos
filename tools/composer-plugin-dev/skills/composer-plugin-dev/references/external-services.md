# External services & authentication (`AccessToken`)

When your plugin integrates with a third-party API (Gmail, GitHub, Slack, custom backend), credentials live in ECHO as **`AccessToken`** objects. Operations load them via Refs.

## Pattern

1. **Reference an `AccessToken`** from your domain object.
   ```ts
   // src/types/Foo.ts
   import { Ref, Schema } from '@dxos/echo';
   import { AccessToken } from '@dxos/types';

   export const Mailbox = Schema.Struct({
     name: Schema.optional(Schema.String),
     accessToken: Schema.optional(Ref.Ref(AccessToken.AccessToken)),
   }).pipe(Type.object({ typename: 'com.example.type.mailbox', version: '0.1.0' }));
   ```

2. **Load it inside the operation** via an Effect helper. Never resolve it in a container.

   ```ts
   // src/services/credentials.ts
   import * as Effect from 'effect/Effect';
   import { Database, Ref } from '@dxos/echo';
   import { type AccessToken } from '@dxos/types';

   export const loadAccessToken = (
     accessTokenRef: Ref.Ref<AccessToken.AccessToken> | undefined,
     label: string,
   ) =>
     Effect.gen(function* () {
       if (!accessTokenRef) return yield* Effect.fail(new Error(`Missing ${label} access token`));
       const token = yield* Database.load(accessTokenRef);
       return token.token;
     });
   ```

3. **Use it in a handler.**

   ```ts
   const handler = SyncMailbox.pipe(
     Operation.withHandler(
       Effect.fn(function* ({ mailbox: ref }) {
         const mailbox = yield* Database.load(ref);
         const token = yield* loadAccessToken(mailbox.accessToken, 'mailbox');
         const res = yield* Effect.tryPromise({
           try: () => fetch('https://gmail.googleapis.com/...', {
             headers: { Authorization: `Bearer ${token}` },
           }),
           catch: (e) => new Error(`Gmail API failed: ${e}`),
         });
         // ...
       }),
     ),
   );
   ```

## Why `AccessToken`?

- **Encrypted at rest** in ECHO; never in your bundle, code, or logs.
- **Per-space, per-user.** Different identities can have different credentials.
- **Refreshable.** Token rotation updates the ECHO object; running operations re-load.
- **Auditable.** Reads happen through the database service.

## UI for granting access

For OAuth flows, render a button in your container that opens the provider's auth page and stores the resulting token via an operation. Don't put the token in component state.

## Reference

- `packages/plugins/plugin-inbox/src/services/google-credentials.ts` — `loadAccessToken` helper.
- `packages/plugins/plugin-inbox/src/types/Mailbox.ts` — `AccessToken` field on a domain object.
- `packages/plugins/plugin-inbox/src/operations/google/gmail/sync-e2e.test.ts` — operation that consumes the token.
