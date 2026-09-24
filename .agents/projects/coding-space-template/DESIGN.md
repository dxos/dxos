# coding-space-template — Design

Companion to [TASKS.md](./TASKS.md). The mechanism this template is built on
(`@dxos/app-toolkit/SampleSpace`) is the `sample-spaces` project's; this file records the decisions
about the template's CONTENT.

## 1. What the template is for

It is the one sample space meant to be **run** rather than read. The others depict a project
mid-flight so a reader can see a populated Composer; this one ships a brief, a plan nothing has
started on, and the working preferences a chat needs, and the reader's own session produces the
rest. Its purpose is therefore a demo that reaches a deployed, callable service in one sitting.

Lives at `packages/plugins/plugin-debug/src/sample/stockfish`, offered as the
`org.dxos.plugin-debug.sample.stockfish` preset through
`plugin-debug/src/capabilities/sample-spaces.ts`.

## 2. Why the subject changed: chatroom → chess MCP server (2026-09-10, user)

The previous subject was a chatroom on Workers. A chatroom's definition of done is two browser tabs
talking, which is a screenshot and nothing else — the app it produces has no relationship to
Composer, so the run ends where the demo should start.

A chess engine behind an MCP server ends inside Composer instead: the last verification step is a
chat in the same space asking the deployed Worker for a move and getting a tool call back. The
deliverable is a capability the space gained, which is the thing worth showing.

## 3. The shape of the run, and why nothing in the middle needs an account

The original plan's second stage was "satisfy the prerequisites": create a GitHub repository,
connect a GitHub token, connect an Anthropic key, create and deploy a Claude managed agent, bind
`GH_TOKEN`. Five steps, three of them consent screens, all before a single line of code — and a
first run stops at whichever one the reader has not got.

The reshape removes the need for each rather than reordering them:

| Old dependency       | Replaced by                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| Anthropic key        | DeepSeek V4 Pro through the DXOS edge — the reader's identity is enough        |
| Claude managed agent | the assistant itself, coding in a remote sandbox                               |
| `wrangler login`     | `wrangler deploy --temporary` — no login to DEPLOY; the reader claims it after |
| GitHub repo + token  | still needed, but moved to stage five — after the thing already works          |

What is left is five stages, in this order: design → deploy an empty Worker → implement the server
→ register it and use it from the chess chat → publish. The reader owns five steps, and each is one
an agent cannot do: pick the model and enable the Chess plugin (both Composer settings, which a
space cannot carry), claim the temporary Cloudflare account, and the two GitHub consent screens.

Three of those were found by review rather than design, and each is worth stating:

- **Claiming is the reader's, and it comes after the LAST redeploy.** It signs the account into
  theirs and needs a browser. Ordering matters more than it looks: a claimed account is one the
  unauthenticated agent can no longer update, and `--temporary` refuses when logged in, so a later
  deploy would mint a second account under a different URL and break the MCP registration. So the
  claim sits at the end of stage three, and stage four registers the URL as it stands afterwards.
- **The claim URL is a bearer credential.** Whoever holds it can take ownership of the account, and
  a project artifact replicates in plaintext to everyone in the space. The Worker URL is filed; the
  claim URL goes to the reader and is logged nowhere. An earlier draft told the runner to file both,
  contradicting the skill's own rule against persisting a secret.
- **The Chess plugin is off by default.** It is available in Composer but enabled in no default
  list, so without it the seeded `Game` has no board — which would make stage four's definition of
  done unreachable in a default install.

Deploying is scoped rather than blanket: only stages two and three change Worker code. An earlier
draft said "deploy at the end of every stage", which would have had a runner deploying in the
design stage before a Worker project existed.

### 3.1 The assistant codes; it does not delegate (user, 2026-09-10)

The sandbox image ships DeepSeek's own coding harness, and `org.dxos.skill.deepseek` will run it.
Using it here is a category error and the skill says so explicitly: a delegated harness starts with
none of the space's context — no brief, no task tree, no design document — and writes to a container
filesystem instead of into the project, so the task list the reader is watching stops moving. The
assistant drives the sandbox directly through `org.dxos.skill.sandbox` and keeps its own loop,
context and transcript.

## 4. What is seeded, and what deliberately is not

Seeded: the brief (`BRIEF.md`), the five-stage task tree (all `todo`, each stage depending on its
predecessor), the Development skill, and a chess `Game` five moves into a Spanish opening.

The game is the one addition. The definition of done is a chat answering from the engine rather
than from what the model already knows, so the space has to ship a position to ask about — the
chess chat opens on a `Game`, and a FEN the reader must paste is a step that gets skipped. The
opening is quiet and has no forced tactic on purpose: a plausible answer produced without calling
the tool is then visibly not the engine's.

Not seeded: the design document (stage one's output — seeding it answers the question the project
exists to work through), the `McpServer` record (stage four; its `url` is required and there is no
URL until stage two deploys), and a repository (stage five).

## 5. Model selection is a setting, not space content

`Instructions` carries `skills` and `objects` but no model; the chat model resolves from
`Assistant.Settings.modelDefaults` per provider (`usePresets`). So a space cannot select DeepSeek V4
Pro for its reader. It is a reader-assigned task in stage one instead, and the project instructions
state that no Anthropic key is involved anywhere — which is what makes a wrong model visible as a
credential prompt rather than as a silent cost.

## 6. Dependencies this added to plugin-debug

`@dxos/plugin-chess` (for `Chess.State`) and `@dxos/plugin-game` (for the `Game` wrapper). Precedent
is the comment already at the top of `sample-spaces.ts`: sample content lives in plugin-debug rather
than in the plugins whose types it uses, because every consumer of it is plugin-debug's.

## 7. The icon in the create-space dialog is not this template's

`space-templates.ts` builds each `SpaceTemplate` contribution with an icon and hue taken from fixed
arrays **by index** (`templateIcons[index % …]`, `hues[index % …]`), ignoring what the definition
declares. `CreateSpaceDialog` then seeds the form from the contribution, so the space this template
creates through the dialog gets `users-three` and the indexed hue — not the `shield-star` / `amber`
in `index.ts`.

That declaration is still live wherever the definition is applied directly (the debug generator
panel, `buildArchive` in the test), and all four sample spaces declare an icon the same way, so it
is left alone. Recorded here only so the mismatch in a screenshot reads as the shared capability's
behaviour rather than a defect in this template. Worth fixing in `space-templates.ts` if anyone
cares that a template cannot choose its own icon; out of scope here.
