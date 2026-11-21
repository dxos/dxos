//
// Copyright 2026 DXOS.org
//

import { type ParseOptions, parseBoard } from '../parse.ts';
import { type BoardData } from '../types.ts';

/** A board as an agent writes it; the stories and tests parse it, so it also exercises the format. */
export const SAMPLE_MARKDOWN = `# Session board skill
The agent keeps one terse board. The chat stays short.

## Questions
- [open] Where do session files go?
  - Option 1: \`agents/sessions/\`, committed with the work.
  - Option 2: \`.agents/sessions/\`, beside the project registry.
- [answered] Can the page use react-ui?
  - Yes. The page is prebuilt once and filled with data.

## Goals
- [done] Parse the board Markdown into data.
  - \`cli.ts build\` writes the page in less than one second.
  - Errors give the file and line.
- [doing] Publish the page from the Stop hook.
  - The hook blocks the stop one time for each change.
    - An unchanged board does not block.
- [blocked] Cache the prebuilt page in R2.
  - The upload needs \`R2_ACCESS_KEY_ID\`.
- [todo] Add the pull request state from GitHub.
- [dropped] Render the page in the browser from Markdown.

## Pull requests
- [draft] dxos/dxos#10450 Add the status board skill.
  - CI: the Check workflow passes.
- [merged] dxos/dxos#10391 Cache the spec viewer in R2.
`;

/** The sample as page data; it is a fixture, so an error in it is a bug in the parser or the sample. */
export const sampleBoard = (options: ParseOptions = {}): BoardData => {
  const { board, errors } = parseBoard(SAMPLE_MARKDOWN, options);
  if (!board) {
    throw new Error(`the sample board does not parse: ${JSON.stringify(errors)}`);
  }
  return board;
};
