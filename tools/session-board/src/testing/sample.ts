//
// Copyright 2026 DXOS.org
//

import { type ParseOptions, parseSession } from '../session.ts';
import { type BoardData } from '../types.ts';

const fence = (body: string) => `\`\`\`mdl\n${body}\n\`\`\``;

/** A `SESSION.mdl` as an agent writes it; the stories and tests parse it, so it also exercises the format. */
export const SAMPLE_SESSION = [
  '---',
  'id: org.dxos.session.2026-11-21-session-board',
  'name: Session board skill',
  'version: 1.0',
  'extends:',
  '  - org.dxos.spec.session',
  '---',
  '',
  '# Session board skill',
  '',
  'The agent keeps the session as mdl. A script makes the page.',
  '',
  '## Extensions',
  '',
  '| Term       | URI                          |',
  '| ---------- | ---------------------------- |',
  '| `question` | `org.dxos.mdl.question@1.0` |',
  '| `decision` | `org.dxos.mdl.decision@1.0` |',
  '| `goal`     | `org.dxos.mdl.goal@1.0`     |',
  '| `pr`       | `org.dxos.mdl.pr@1.0`       |',
  '| `event`    | `org.dxos.mdl.event@1.0`    |',
  '',
  '## Questions',
  '',
  fence(
    [
      'question Q-1: Must the script get the PR state from GitHub?',
      '  date: 2026-11-21',
      '  by: agent:claude-code',
      '  for: user:alice',
      '  options:',
      '    - Yes: the page reads the state through the GitHub connector.',
      '    - No: the agent writes the state.',
    ].join('\n'),
  ),
  '',
  fence(
    [
      'question Q-2: Is `agents/sessions/` the correct place for session files?',
      '  date: 2026-11-21',
      '  by: agent:claude-code',
      '  for: user:alice',
    ].join('\n'),
  ),
  '',
  '## Goals',
  '',
  fence(
    [
      'goal G-1: The script parses `SESSION.mdl` and reports errors with line numbers.',
      '  status: done',
      '  notes:',
      '    - One build takes approximately 0.1 s.',
    ].join('\n'),
  ),
  '',
  fence(['goal G-2: The page shows the live PR state.', '  status: started', '  blockedBy: [Q-1]'].join('\n')),
  '',
  fence(['goal G-3: The timeline is append-only.', '  status: review'].join('\n')),
  '',
  fence(['goal G-4: Render the page from Markdown in the browser.', '  status: cancelled'].join('\n')),
  '',
  '## Pull requests',
  '',
  fence(
    [
      'pr PR-1: Build the status board from mdl.',
      '  ref: dxos/dxos#14647',
      '  branch: claude/status-board',
      '  status: landing',
    ].join('\n'),
  ),
  '',
  fence(['pr PR-2: Cache the spec viewer in R2.', '  ref: dxos/dxos#10391', '  status: merged'].join('\n')),
  '',
  '## Changelog',
  '',
  fence(
    [
      'decision D-1: Yes. Session files are committed with the work.',
      '  date: 2026-11-21',
      '  by: user:alice',
      '  answers: Q-2',
    ].join('\n'),
  ),
  '',
  '## Timeline',
  '',
  fence(['event T-1: The session started.', '  date: 2026-11-21T11:30Z', '  by: user:alice'].join('\n')),
  '',
  fence(['event T-2: Opened [PR-1] as a draft.', '  date: 2026-11-21T11:55Z', '  by: agent:claude-code'].join('\n')),
  '',
].join('\n');

/** The sample as page data; it is a fixture, so an error in it is a bug in the parser or the sample. */
export const sampleBoard = (options: ParseOptions = {}): BoardData => {
  const { board, errors } = parseSession(SAMPLE_SESSION, options);
  if (!board) {
    throw new Error(`the sample session does not parse: ${JSON.stringify(errors)}`);
  }
  return board;
};
