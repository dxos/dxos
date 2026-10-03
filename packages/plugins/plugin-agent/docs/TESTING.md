# Agent — developing behaviour

How to change what an agent does and know whether it got better. Three loops, from fastest to most
rigorous; each one catches what the one before it cannot. Setup for the end-to-end Discord run is in
[SETUP.md](./SETUP.md); the memory model the behaviour writes is in [MEMORY.md](./MEMORY.md).

| Loop                 | Use it to                                    | Cost                        |
| -------------------- | -------------------------------------------- | --------------------------- |
| 1. Live story        | Try instruction and tone changes by hand     | Seconds; a real model       |
| 2. Tests and stories | Pin behaviour that must not regress, in CI   | Free (scripted or recorded) |
| 3. Evals             | Measure behaviour across personas and models | Minutes; real models        |

## Models and keys

Behaviour runs on DeepSeek: **V4 Pro** (`com.deepseek.model.deepseek-v4-pro.default`) as the agent,
**V4 Flash** as the simulated user and the judge. The key follows the 1Password standard — vault
`eng-dev`, reverse-DNS item, field `credential`:

```
op://eng-dev/com.deepseek/credential
```

Scripts resolve it with `op run`, which prompts through the 1Password desktop app (CLI integration
on). Never print a resolved value: to check a reference, use its exit code only
(`op read <ref> >/dev/null 2>&1; echo $?`). Stories reach the model through EDGE with the story's
identity, so no key reaches the browser.

## 1. Live story

`stories-assistant` → **Interview › Live** (`stories-stories-assistant-interview--live`): a chat with
an agent that has the interview skill, beside a panel showing the person's goals and memories as the
agent records them. Edit the skill's instructions
(`packages/plugins/plugin-agent/src/skills/InterviewSkill.ts`), let the story hot-reload, and talk to
it. Tagged `!test`, so CI never runs it.

**Agent playground** (`stories-stories-assistant-agentplayground--playground`): one agent, Kai, and
three chat panels — Rich, Dima, Josiah — plus the agent state panel. Each panel is that person's chat
with Kai (`ensureParticipantChat`, `ChatParticipant`) and attributes every prompt to them: the panel
passes a `sender` to `useChatProcessor`, the agent process records it on the user message, and the
model sees `[From: Dima]`. On load the space holds the three people, the "DXOS Eng" team and a
transcript of an earlier CI-triage conversation, which the agent reads on load (`readSource`: a
direct pipeline-rdf extraction, no chat) into facts in the transcript's annotation feed — the state
panel counts them and the knowledge panel's Facts tab lists them. Try "tell Dima the fix landed", Dima's reply, "take notes", "interview me".
Tagged `!test`.

**Agent goals** (`stories-stories-assistant-agentplayground--goals`): the same panels without the
transcript. As Rich, "let me know when Dima's indexer PR is up" — Kai records a goal Rich owns and a
watch, both listed in the knowledge panel's Goals tab. As Dima, "still working on it" (nothing reaches
Rich), then "the indexer PR is up" — the end-of-turn read records the fact, the watch fires, Rich is
told and the goal is achieved. Tagged `!test`.

## 2. Tests and stories (CI)

- **Operations** — deterministic, no model: `moon run plugin-agent:test`. `interview.test.ts` drives
  the memory operations in the order an interview would and asserts the resulting graph (one
  `Person` by handle, goals proposed then confirmed, a superseded memory not recalled, the profile
  document); `ensure-thread-chat.test.ts` covers the Discord thread → chat mapping;
  `discord-bot.test.ts` covers the bot operations against a stubbed EDGE.
- **Scripted interview** — `stories-assistant` → **Interview › TestInterviewScripted**: a scripted
  model plays the agent through four exchanges and the play function checks the profile panel and the
  space. `pnpm exec vitest run --project=storybook src/stories/Interview.stories.tsx` in
  `packages/stories/stories-assistant`.
- **Scripted playground** — **AgentPlayground › PlaygroundScripted**: a turn generator plays the
  agent across the three conversations and the transcript's extraction; the play function checks the
  facts read (count, Dima's attributed directive, no extra conversation), a relay from Rich's panel
  into Dima's and back, and a switch to Note-taker that records a note. `modes.test.ts` covers modes,
  notes and participant chats; `read-source.test.ts` covers `readSource` and fact recall (scripted model).
- **Scripted goals** — **AgentPlayground › GoalsScripted** (`stories-stories-assistant-agentplayground--goals-scripted`):
  Rich's request registers a watch under a goal he owns (one watch listed); Dima's "still working on it"
  is read into a negative fact that must not fire it; "the indexer PR is up" fires it — Rich's panel
  shows the notification, the goal is achieved and the watch list is empty. `triggers.test.ts` covers
  pattern matching, the registry and the same three turns through real agent processes (scripted model).
- **Components** — `moon run plugin-agent:test-storybook` renders the `AgentActivity`, `ProfileGraph`
  and `DiscordBindingForm` stories.
- **Freezing a regression** — when an eval or a live run finds a bug, record that conversation as a
  memoized test (see the `testing-assistant-conversations` skill) so CI pins the fix without model
  calls.

## 3. Evals

`packages/core/compute/assistant-evals/src/evals/interview.eval.ts`:

```bash
pnpm evals:live src/evals/interview.eval.ts
```

Run from `packages/core/compute/assistant-evals`. Skipped when the key is absent.

- **Personas** — `rich` (founder), `priya` (chatty PM with a shared team goal), `sam` (terse
  engineer). Each carries ground truth: goals, facts, and a Discord handle.
- **Simulated user** — Flash answers as the persona, from its fixture only, one reply per turn.
- **Deterministic scorers** read the ECHO graph after the run: goal recall and precision, every goal
  confirmed, memories atomic and carrying a source, one question per turn, the interview within its
  turn budget, a single `Person` resolved by handle, a profile mentioning the confirmed goals.
- **Judge** — Flash scores probing depth, reflecting back and tone, with a rationale. A
  bad-transcript case checks the judge itself.

Baseline (2026-10-03, after two rounds of instruction tuning): means **rich 0.89, priya 0.92,
sam 0.71**. Known gaps: memory provenance scores 0 (the model never sees message refs —
`recordMemory` should default `source` to the session's chat), and the terse persona can run out of
turns before confirming goals.

## The loop in practice

1. Change the instructions; try it in the live story.
2. Run the eval; compare per-persona and per-scorer numbers with the baseline above.
3. When a run exposes a bug, add a scorer for it, or freeze the conversation as a memoized test.
4. Commit the instruction change with the before/after numbers in the commit message.

## Tuning in Composer

Plugin skills are compiled in. Space-authored overrides — an editable copy of a skill's
instructions owned by the agent, which its chats use instead of the compiled one — let you change
the agent's behaviour in Composer and try it in Discord without a rebuild; copy what works back into
the source and the eval.
