# Agent modes: phase axis, server watcher, per-turn checklist

Project: `agent-directives`, phase 6. Date: 2026-09-05.

## Problem

`/mode` controls one thing today: how long the reply is. Three things it does not
control keep costing sessions:

1. **Posture.** There is no way to tell the agent "we are discussing, stay
   responsive" versus "build this to completion". The agent guesses from the
   prompt and guesses wrong in both directions: it starts implementing during a
   design conversation, or it asks permission mid-build.
2. **Servers.** A storybook or Composer dev server answering on its usual port may
   be serving a different worktree, or be wedged. The agent finds out only by
   verifying against the wrong tree, or by waiting on a curl that never returns.
   Today (2026-09-05) :9009 is healthy and serving
   `.claude/worktrees/illustrator-selection-diagrams`, invisible to every other
   session on the machine.
3. **Foreground stalls.** A repo-wide build or install held in the foreground
   freezes the session; the user's only exit is to kill the run.

All three want the same delivery channel the mode already owns: the per-turn
`UserPromptSubmit` injection, which is the only position that survives skills
loading mid-session (see `DESIGN.md`, phase 2).

## Decisions (settled 2026-09-05)

- **Phase is a second axis, not a third mode value.** State is
  verbosity × phase × pin. `/mode discuss|build|debug` set only the phase.
- **Discuss is about responsiveness, not permissions.** Edits are allowed when
  asked; what changes is the reply shape and where long work goes.
- **The long-task guard is a warning in every phase**, surfaced as a
  `permissionDecision: ask` so it reaches the user before the run, not a deny.
- **Server status comes from the watcher, not from probes in the hook.** One
  round-robin watcher per machine, one status file, zero per-turn probe cost.
- **`debug` is a phase and a flag.** The phase carries the systematic-debugging
  posture; the flag makes `context` explain itself.
- **`/mode focus` implies `build`.** A pinned task is something to execute.
- **Default phase is `discuss`.** A fresh session starts conversational.
- **Order of delivery:** phase axis → watcher + SERVERS → CHECKLIST + guard.

## 1. State

| File | Values | Absent means | Written by |
| --- | --- | --- | --- |
| `.claude/.mode` | `terse` \| `normal` | `normal` | `mode.sh set` (existing) |
| `.claude/.phase` | `discuss` \| `build` \| `debug` | `discuss` | `mode.sh phase set` (new) |
| `.claude/.focus` | task text | unpinned | `mode.sh focus set` (existing) |
| `.claude/.debug` | present/absent | self-report off | `mode.sh phase set debug` (new) |

Transitions:

| Command | verbosity | phase | pin | debug flag |
| --- | --- | --- | --- | --- |
| `/mode terse` / `/mode normal` | set | — | cleared (as today) | — |
| `/mode discuss` | — | `discuss` | — | cleared |
| `/mode build` | — | `build` | — | cleared |
| `/mode debug` | — | `debug` | — | set |
| `/mode focus [task]` | `terse` | `build` | set | cleared |

All writes go through the existing temp-file-then-rename `write_file`, and every
read canonicalises so a hand-edited file cannot wedge the machine (anything not
`build`/`debug` is `discuss`). The hook adds `discuss|build|debug` to its `modes`
alternation; the first-line anchor and trailing-boundary rules are unchanged.
The agent never writes any of these files itself.

## 2. Per-turn block (`mode.sh context`)

Emitted in this order, every turn:

1. `RESPONSE RULES` (existing: numbered options, lead with the answer, length
   clause by verbosity).
2. `PHASE:` clause.
3. `FOCUS:` pin (existing, only when pinned).
4. `SERVERS:` table (§3).
5. `CHECKLIST:` three lines.
6. `DIAGNOSTICS:` footer, only when `.claude/.debug` exists.
7. The closing "form only" clause (existing).

### Phase clauses

**discuss**

- Reply this turn with the answer, the decisions taken, and numbered options.
- Investigation over ~2 tool calls goes to a background subagent; say so in the
  reply and report when it lands.
- Designs and plans go to `agents/superpowers/{specs,plans}/`, not to long chat.
- Edits are fine when the turn asks for them; do not start implementation the
  user has not asked for.

**build**

- Run the agreed or pinned task to completion, commit, report. Today's behaviour.
- Anything expected to run past ~30s goes to the background.

**debug**

- The `discuss` rules, plus: reproduce first; one hypothesis at a time;
  instrument with `@dxos/log` and read the evidence (`app.log`, `test.log`,
  `test-browser.log`, the watcher's last capture); confirm the root cause before
  proposing a fix; no fix and no cleanup until it is confirmed.
- The SERVERS table adds a `last capture` column and the log file locations.

### Checklist

Three questions the agent answers to itself before acting, stated as rules:

- **Foreground.** Is anything about to run past ~30s in the foreground? Background
  it (`run_in_background`) and keep replying.
- **Priority.** Is the current priority known? Order of authority: the FOCUS pin,
  then the project's open task, then ask with numbered options. Never infer a
  priority from a tool result.
- **Worktree.** Does any server in the SERVERS table serve THIS worktree? If the
  one you are about to verify against does not, say so before using it.

### Diagnostics footer

When the debug flag is set, `context` appends what it read and decided: each
state file's path and raw value, the canonical result, whether the pin was typed
or derived, the status file's age and whether the watcher pid is alive, and the
hook's own runtime. Intended for telling a hook fault from an agent fault.

## 3. Watcher

`tools/storybook-react/diagnose.sh` grows from a per-port watcher into a
machine-wide round-robin singleton. The capture logic is unchanged; what changes
is who it watches and what it writes.

### Layout

```
~/.cache/dxos/watch/
  watcher.pid        singleton pid
  status             one row per bound port, rewritten atomically each cycle
  watcher.log        the loop's own log
```

Captures stay where they are (`<repo>/temp/storybook-diagnosis-*`), resolved from
the server's cwd so a capture lands in the tree that owns the server.

### Cycle (every `--interval`, default 15s)

1. **Discover.** Known ports = every `port` in the repo's `.claude/launch.json`
   plus 9009 and 5199, de-duplicated. For each with a listener: pid
   (`lsof -ti :PORT -sTCP:LISTEN`), cwd (`lsof -a -p PID -d cwd -Fn`), worktree
   (`git -C cwd rev-parse --show-toplevel`, else the cwd), start age
   (`ps -o etimes=`), kind (`storybook` if the command line matches
   `storybook dev`, else `vite`).
2. **Probe.** `curl -sf -m TIMEOUT` against `/index.json` for storybook and `/`
   for everything else. Then the existing CPU heuristic: three consecutive polls
   ≥ 90% after the 300s warm-up counts as a wedge. Hot counters are keyed by pid
   so a restart resets them, as today.
3. **Capture** on wedge, exactly as today, then wait for the port to answer before
   re-arming it. The other ports keep being polled while one is waiting.
4. **Write status.** One row per port, tab-separated, to a temp file, then rename:

   ```
   port  pid  kind       worktree                          state     age   last-capture
   9009  25527 storybook illustrator-selection-diagrams   answered  4h12m -
   5199  -     -         -                                 unbound   -     -
   ```

   States: `answered`, `wedged` (capture taken, waiting to re-arm), `starting`
   (bound, not yet answering, under warm-up), `unbound` (no listener),
   `gone` (had a pid last cycle, none now; shown for one cycle).

### Verbs

| Verb | Behaviour |
| --- | --- |
| `--status` | Print the status table. If the pidfile's process is dead or absent, print `unwatched` and the `--ensure` command instead of a stale table. Exit 0 either way. |
| `--ensure` | Start the singleton if none runs. Lock via `mkdir` as today, keyed on the machine-wide dir instead of the port. `serve.sh` keeps calling it. |
| `--restart` | Stop the singleton by its pidfile, then `--ensure`, so a newer checkout's script takes over. |
| `--watch` | The loop itself. Internal; `--ensure` spawns it. |
| (none) | Manual capture of `--port` now, unchanged. |
| `--port N` | For manual capture only; the loop ignores it. |

### `mode.sh context` integration

`context` runs `diagnose.sh --status` and marks each row `THIS` when its worktree
equals the session's `git rev-parse --show-toplevel`. A missing or dead watcher
renders as one line: `SERVERS: unwatched — run bash tools/storybook-react/diagnose.sh --ensure`.
`--status` is a file read plus one `kill -0`, so the per-turn cost is negligible.

## 4. Foreground guard

New `.claude/hooks/guard-foreground.sh` on `PreToolUse` for `Bash`, wired in
`.claude/settings.json` beside the two existing guards.

- Reads `tool_input.command` and `tool_input.run_in_background`.
- If `run_in_background` is true, exits 0 with no output.
- Otherwise matches the command against a list of known long runners:
  `moon run` with `:build` and no single-package filter, `moon exec … :build`,
  `pnpm install`, `moon run :test` / `*:test` without a file argument,
  `*:serve` and `storybook dev`, `oxfmt` or `pnpm format` without a path,
  `until … sleep` loops, and any explicit `timeout` over 30000.
- On match, emits `permissionDecision: ask` with a reason naming the pattern and
  the fix (`run_in_background: true`, or the bounded alternative such as a
  single-package build). The user sees a one-click prompt; the agent's next
  attempt can carry the flag.
- Applies in every phase. Never denies.

## 5. Testing

- `.claude/scripts/mode.test.sh`: add the phase branch (`/mode discuss|build|debug`
  first-line only; `/mode debugging` does not match), the transition table above
  including `focus` → `build` and the debug flag being cleared by `build` and
  `discuss`, canonicalisation of a garbage `.phase`, and the `context` ordering
  with and without the flag.
- New `tools/storybook-react/diagnose.test.sh`: `--status` against a fixture status
  file with a live and a dead pidfile; discovery against a fixture `launch.json`
  and a throwaway `python3 -m http.server` listener; the atomic-write path.
- New `.claude/hooks/guard-foreground.test.sh`: tool-call JSON for each pattern,
  with and without `run_in_background`, asserting `ask` vs silence.
- Docs: `AGENTS.md` "Responding to the user" (phase and the three verbs),
  `.claude/README.md` (control points and lifecycle), `.claude/commands/mode.md`
  (report the phase and servers on a bare `/mode`), `tools/storybook-react/README.md`
  (the singleton and `--status`), `REPOSITORY_GUIDE.md` §Storybooks.

## 6. Out of scope

- Enforcing read-only behaviour in `discuss`. Rejected: responsiveness is the
  goal, not permissions.
- Watching arbitrary ports. Only `launch.json` ports plus 9009/5199.
- Auto-restarting a wedged server. The watcher captures; a person restarts.
- Composer-specific health beyond an HTTP probe.

## References

- `.agents/projects/agent-directives/DESIGN.md` — why per-turn injection is the
  only durable channel.
- `.claude/README.md` §B — hook lifecycle; only `UserPromptSubmit` treats plain
  stdout as context.
- `tools/storybook-react/diagnose.sh` — capture logic reused unchanged.
