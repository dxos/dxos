# Sample spaces

Sample spaces are built from **partials**. Each partial has a **content spec**, a `CONTENT.md` that
lists everything it puts in a space, and the code generated from that spec. A **template** is code
that applies one or more partials and is offered in the create-space picker.

The spec is the source of truth. Change content by editing the spec, then have an agent regenerate
the partial with the `sample-space-content` skill (`.agents/skills/sample-space-content/SKILL.md`).

## Partials

| Partial             | Spec                                                       | Code         |
| ------------------- | ---------------------------------------------------------- | ------------ |
| Architecture        | `plugin-canvas/src/samples/architecture/CONTENT.md`        | `partial.ts` |
| Bramble             | `plugin-onboarding/src/samples/bramble/CONTENT.md`         | `partial.ts` |
| Alien Labs team     | `plugin-debug/src/samples/fieldstone/team/CONTENT.md`      | `partial.ts` |
| Alien Labs inbox    | `plugin-debug/src/samples/fieldstone/inbox-crm/CONTENT.md` | `partial.ts` |
| Alien Labs projects | `plugin-debug/src/samples/fieldstone/projects/CONTENT.md`  | `partial.ts` |
| Alien Labs docs     | `plugin-debug/src/samples/fieldstone/docs/CONTENT.md`      | `partial.ts` |
| Alien Labs metrics  | `plugin-debug/src/samples/fieldstone/metrics/CONTENT.md`   | `partial.ts` |
| Reading Room        | `plugin-magazine/src/samples/reading-room/CONTENT.md`      | `partial.ts` |

## Templates

| Template          | Code                                                          | Partials                                      |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------- |
| DXOS Architecture | `plugin-canvas/src/samples/architecture/ArchitectureSpace.ts` | Architecture                                  |
| Bramble           | `plugin-onboarding/src/samples/bramble/BrambleSpace.ts`       | Bramble                                       |
| Alien Labs   | `plugin-debug/src/samples/fieldstone/FieldstoneSpace.ts`      | team, inbox-crm, projects, docs, metrics, Architecture |
| Reading Room      | `plugin-magazine/src/samples/reading-room/ReadingRoomSpace.ts` | Reading Room                                  |

## Changing a sample space

1. Edit the partial's `CONTENT.md`. Keep totals round and state times as offsets from the
   reference date.
2. Ask an agent: "Regenerate the `<partial>` partial from its spec with the sample-space-content
   skill."
3. Review the diff. The spec change and the code change land in one PR, and the partial's test
   asserts every bullet under `## Checks`.

## Adding a sample space

1. Write a `CONTENT.md` in a new directory next to the plugin's other samples. Copy the header and
   sections from an existing spec. To build on another partial, list it under `Requires`.
2. Ask an agent to generate the partial and a template that applies it.

A template may apply partials from other packages. The package that owns the partial exports it
through a `samples` subpath and must be public.

An agent can also draft the spec from a description: "Write a content spec for a law firm with a
client inbox and matter tracking." Review the draft before asking for code.
