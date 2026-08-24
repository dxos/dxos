//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

/**
 * A single find/replace against a file. Deliberately the same vocabulary as `Text.Edit`, which the
 * markdown skill already uses for document edits, so one habit covers both — but with file-editor
 * semantics: `oldString` must be unique in the file unless `replaceAll` is set.
 */
const Edit = Schema.Struct({
  path: Schema.String.annotate({
    description: 'Path to the file, relative to the working directory (or absolute inside it).',
  }),
  oldString: Schema.String.annotate({
    description: trim`
      Exact text to find, including whitespace and indentation. Must appear exactly once in the file
      unless replaceAll is set — include the surrounding lines needed to make it unique.
    `,
  }),
  newString: Schema.String.annotate({
    description: 'Text to replace it with. Pass an empty string to delete the matched text.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: 'Replace every occurrence instead of requiring oldString to be unique.',
  }),
});

export const Bash = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.computer.runBash'),
    name: 'Bash',
    icon: 'ph--terminal-window--regular',
    description: trim`
      Run a shell script on the developer's machine and return its output.

      The script runs under bash in the harness's working directory, so pipes, redirections, globs
      and multiple lines all work as they would in a terminal. Use it to explore and inspect (ls,
      cat, rg, git status, git diff), and to run the project's own tooling (tests, linters, builds).

      A non-zero exit code is a normal result, not a failure — read stderr and try again. Prefer the
      edit tool over sed or a heredoc when changing a file: it is exact, and it reports what matched.
    `,
  },
  input: Schema.Struct({
    script: Schema.String.annotate({
      description: 'Shell script to run, passed to `bash -c`.',
      examples: ['git status --short', 'rg -n "createSpace" packages/sdk | head -20'],
    }),
    cwd: Schema.optional(Schema.String).annotate({
      description: trim`
        Directory to run in, relative to the harness root. Defaults to the root itself; a path
        outside it is refused.
      `,
    }),
    timeout: Schema.optional(Schema.Number).annotate({
      description: 'Milliseconds before the script is killed. Defaults to 60000.',
    }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    stderr: Schema.String,
    exitCode: Schema.Number.annotate({
      description: 'Exit code, or -1 when the script was killed (by the timeout or a signal).',
    }),
    success: Schema.Boolean.annotate({ description: 'True iff the script exited 0.' }),
    signal: Schema.optional(Schema.String),
    timedOut: Schema.Boolean,
    truncated: Schema.Boolean.annotate({
      description: 'Output exceeded the host cap and was clipped; re-run with a narrower command.',
    }),
    cwd: Schema.String.annotate({ description: 'Absolute directory the script ran in.' }),
    durationMs: Schema.Number,
  }),
});

export const Edits = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.computer.applyEdits'),
    name: 'Edits',
    icon: 'ph--pencil-simple--regular',
    description: trim`
      Apply a batch of exact find/replace edits to files on the developer's machine.

      The whole batch is all-or-nothing: if any edit fails to match, no file is written and the
      result names the edit that failed. Read a file (with the bash tool) before editing it, and
      quote it exactly — this replaces literal text, not a pattern.

      Several edits may target the same file; they are applied in order against the file's evolving
      content, so a later edit must quote the text as the earlier ones left it.
    `,
  },
  input: Schema.Struct({
    edits: Schema.Array(Edit).annotate({
      description: 'Edits to apply, in order.',
    }),
    cwd: Schema.optional(Schema.String).annotate({
      description: 'Directory relative paths resolve against, relative to the harness root.',
    }),
  }),
  output: Schema.Struct({
    applied: Schema.Boolean.annotate({
      description: 'False means nothing was written — fix the failing edit and send the batch again.',
    }),
    files: Schema.Array(
      Schema.Struct({
        path: Schema.String,
        replacements: Schema.Number,
      }),
    ).annotate({ description: 'Files written, with how many replacements each received.' }),
    error: Schema.optional(Schema.String).annotate({
      description: 'Set iff applied is false; names the failing edit and why it did not match.',
    }),
  }),
});
