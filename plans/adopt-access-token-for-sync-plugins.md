# Adopt AccessToken + plugin-token-manager for all sync plugins

**Status:** Proposal
**Date:** 2026-04-13

## TL;DR

Every data-source plugin (Trello, Granola, GitHub, Crypto, Research, the Slack
bot, and the Slack channel sync) stores credentials its own way — usually a
raw string on a per-plugin Account schema or a bare `localStorage` key. DXOS
already has the right primitive for this: the `AccessToken` ECHO type plus
the OAuth dance implemented by `@dxos/plugin-token-manager`. The inbox plugin
uses it for Google Mail and Calendar. Every other data-source plugin should
do the same.

This is not a call to rip anything out. It's a recommendation for new sync
plugins, and an easy incremental migration path for existing ones.

## Why this matters

1. **Consistent UX.** Users authenticate every external data source the same
   way — click a button, finish an OAuth flow in a popup, see the connection
   listed in one place. Right now every plugin reinvents its own credential
   UI, and users end up with secrets scattered across localStorage.
2. **Consistent security.** `AccessToken` is an ECHO object. It's encrypted
   at rest with the rest of the space, backs up when the space does, and can
   be scoped to specific objects via `Ref<AccessToken>`. A `localStorage`
   string is none of those things.
3. **No per-plugin OAuth code.** `plugin-token-manager` already handles the
   three flavors of OAuth flow — web (postMessage), desktop/CLI (localhost
   HTTP callback), and mobile (ASWebAuthenticationSession). That's a lot of
   boilerplate nobody has to write.
4. **Composable.** A single AccessToken can be referenced by multiple objects
   (a Mailbox, a Calendar, a Channel sync, a Deal) without duplicating the
   secret. Today each plugin's Account owns its own copy.

## The pieces that already exist

| Piece | Where | What it does |
|---|---|---|
| `AccessToken` schema | `packages/sdk/types/src/types/AccessToken.ts` | ECHO type: `{ source: Hostname, account?, token, note? }`. Generic over any provider. |
| `plugin-token-manager` | `packages/plugins/plugin-token-manager` | OAuth UI, provider presets, token storage. |
| OAuth edge worker | DXOS Edge `/oauth/initiate` endpoint | Starts the auth dance; browser completes it. |
| Example consumer | `plugin-inbox` Mailbox / Calendar | Each holds `accessToken?: Ref.Ref<AccessToken>`. |

## How a sync plugin uses it

1. The plugin's Account schema holds a `Ref<AccessToken>` instead of a bare
   `apiKey` string:

   ```ts
   const TrelloAccount = Schema.Struct({
     accessToken: Schema.optional(Ref.Ref(AccessToken.AccessToken)),
     lastSyncedAt: Schema.optional(Schema.DateFromSelf),
     // …other account metadata…
   }).pipe(Type.object({ typename: 'org.dxos.type.TrelloAccount', version: '0.1.0' }));
   ```

2. The "Connect Trello" button opens the plugin-token-manager OAuth flow and
   writes the resulting AccessToken into the space, linked to the account.

3. At sync time, the plugin dereferences `account.accessToken?.target?.token`
   and passes it to the API client. No other plugin needs to know the token
   format — it's just a string.

4. If the token expires and `plugin-token-manager` grows refresh handling,
   every consumer benefits automatically.

## What needs to change in each existing plugin

Incremental migration — not a big-bang rewrite.

| Plugin | Current | Target |
|---|---|---|
| `plugin-trello` | `TrelloAccount.apiKey: string` | `accessToken?: Ref<AccessToken>` |
| `plugin-granola` | `GranolaAccount.apiKey: string` | `accessToken?: Ref<AccessToken>` |
| `plugin-slack` (sync variant in VC tree) | `SlackAccount.botToken: string` | `accessToken?: Ref<AccessToken>` |
| `plugin-slack` (bot variant in composer-agent tree) | localStorage key `SLACK_BOT_TOKEN` | `accessToken?: Ref<AccessToken>` on plugin settings |
| `plugin-github` | `GitHubAccount.pat: string` | `accessToken?: Ref<AccessToken>` |
| `plugin-crypto` | no auth (CoinGecko free tier) | n/a — keep as-is |
| `plugin-research` | no auth (Semantic Scholar free) | n/a — keep as-is |
| Anthropic API key (shared) | `localStorage.ANTHROPIC_API_KEY` | `AccessToken` with `source: 'api.anthropic.com'` |

Existing secrets keep working — callers can read the old field AND the new
`accessToken.target.token`, preferring the latter. Drop the old field once
every in-flight space has been migrated or after a deprecation window.

## Open questions worth resolving

1. **Refresh.** `plugin-inbox` assumes long-lived Google tokens. Real OAuth
   usually involves refresh tokens with short access-token lifetimes. Does
   `plugin-token-manager` own refresh, or does each provider preset?
2. **Provider presets.** `plugin-token-manager` needs a preset per provider
   (client id, scopes, auth URL, token URL). Who adds the Trello / GitHub /
   Slack presets — the data-source plugin itself, or upstream?
3. **Scoping.** Should an AccessToken be space-scoped (one per space, shared
   across plugins) or account-scoped (one per plugin account)? Current inbox
   behavior is the latter, but a shared-token model would be more useful for
   e.g. a personal Anthropic key used by multiple plugins in the same space.
4. **Offline fallback.** If a user revokes a token in the provider's UI, every
   sync starts 401-ing. Should `useSync` recognize 401/403 and surface a
   re-auth prompt generically, or does each plugin handle that?

## Relation to `@dxos/sync-engine`

`@dxos/sync-engine` (separate PR) extracts the diff/upsert/lastSyncedAt
orchestration. It is deliberately agnostic about credentials — the caller
passes whatever token into its `fetchExternal` closure. Adopting both in a
new plugin looks like:

```tsx
const { sync, syncing, lastSyncedAt } = useSync({
  initialLastSyncedAt: account.lastSyncedAt,
  fetchExternal: async () => {
    const token = account.accessToken?.target?.token;
    if (!token) throw new Error('not authenticated');
    return listBoards(token);
  },
  loadStored: () => space.db.query(Filter.type(TrelloBoard)).run(),
  externalId: (board) => board.id,
  storedExternalId: (board) => board.externalId,
  effects: { create, update, remove },
  onSynced: (at) => Obj.change(account, (acc) => { acc.lastSyncedAt = at; }),
});
```

The whole plugin shrinks to credential wiring + API client + mapper. Every
new data source becomes a ~1-day PR instead of a ~1-week one.

## Proposed rollout

1. Merge `@dxos/sync-engine` and this proposal.
2. Write one new sync plugin on top of both to prove the shape end-to-end
   (Trello is the simplest — a single API client, uncomplicated auth).
3. Migrate existing sync plugins one at a time. Each migration is additive:
   add `accessToken` field, accept it as a fallback, run both paths for a
   release, then drop the legacy string field.
4. Document the pattern in `REPOSITORY_GUIDE.md` under "Writing a data-source
   plugin."
