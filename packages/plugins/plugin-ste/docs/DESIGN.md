# plugin-ste design

## Goal

Give the Composer assistant the same Simplified Technical English (STE, ASD-STE100) capability that coding
agents in this repository get from `.agents/skills/simplified-technical-english`: write in STE on request, and
check the result mechanically instead of by eye.

## Shape

The plugin is headless. It contributes two capabilities and no UI.

| Module              | Contributes                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `skill-definition`  | `SteSkill` (`org.dxos.skill.ste`): the writing rules as instructions, one tool. |
| `operation-handler` | `SteHandlers`: the handler for `SteOperation.Verify`, loaded lazily on idle.    |

`SteSkill` sets `agentCanEnable`, so an agent can turn it on mid-task when the user asks for STE.

## The check tool

`SteOperation.Verify` (`org.dxos.operation.ste.verify`) is a pure function, `SteCheck.check`, wrapped as an
operation. It needs no services, so it runs in every environment (browser, node, tauri).

`src/check/SteCheck.ts` is a line-for-line port of `scripts/ste_check.py` from the agent skill, so the assistant
and coding agents report the same findings on the same text:

- Strips the parts STE does not control: frontmatter, code blocks, inline code, links, URLs, block quotes,
  quoted text.
- Per sentence: word count against the mode's limit (20 procedural, 25 descriptive), semicolons,
  contractions, "has/have/had" + participle, complex passives, "by" passives, progressive forms,
  banned helping verbs, unapproved "-ing" words.
- Per paragraph: a maximum of 6 sentences. A list item is a sentence of its own.
- Vocabulary: every word not in the approved list is returned in `unknownWords`. The tool cannot tell a
  technical name from an unapproved word, so the skill tells the model to decide each one.

## Word list

`src/check/word-list.ts` holds the 868 dictionary lines of `references/word-list.md` verbatim, parsed at first
use with the same regex as the Python tool. It is a copy, not an import, because the agent skill lives outside
any package. To regenerate it after the agent skill changes, rerun the extraction: every line of
`word-list.md` that matches `^[A-Z][A-Z' -]*[A-Z]\s+\(` becomes one string entry.

## Out of scope

- A rewrite operation: rewriting is the model's job, guided by the instructions; the tool only checks.
- UI (an inline linter in the markdown editor). A later phase can reuse `SteCheck.check` for that.
