---
name: sample-space-content
description: Write a sample-space content spec (`CONTENT.md`) and generate its partial from it. Use when adding or changing a sample space, a space template or a partial, editing a `CONTENT.md`, or turning a content spec into `SampleSpace` code.
---

# Sample space content

Human-facing overview and the list of partials: `packages/sdk/app-toolkit/src/sample/README.md`.

- A **content spec** is a `CONTENT.md` that lists everything one partial puts in a space. It is the
  source of truth for that content, and it is complete: every decision the code depends on is
  written in it.
- A **partial** is the code generated from one content spec. It lives in the spec's directory and
  exports one `Partial`, typed as the builder's `SampleSpace.Phase<Provides, Requires>`.
- A **template** is code only. It imports partials, applies them in order, and offers the result
  through `SampleSpace.makeTemplate`.

Bramble (`plugin-onboarding/src/samples/bramble/`) and Architecture
(`plugin-canvas/src/samples/architecture/`) are each one partial with a template that applies only
it. Their code predates the `Partial` export: convert it the next time you regenerate either one.
Fieldstone (`plugin-debug/src/samples/fieldstone/`) is one template built from four partials in
`team/`, `inbox-crm/`, `projects/` and `docs/`.

The builder API is `@dxos/app-toolkit/SampleSpace` (`packages/sdk/app-toolkit/src/sample/SampleSpace.ts`).

## Content spec format

A spec opens with a `# Title`, one paragraph that describes the world, and these header bullets:

- `Code`: the partial's files, or "not written yet".
- `Requires`: partials this one reads, linked, with the keys it uses.
- `Optional`: partials this one links into when the template includes them. Name the content that
  depends on each one.
- `Provides`: the keys other partials may use, such as `people.<key>` and `threads.<key>`.
- `Clock`: the time span the content covers, as offsets from the reference date, or "unused".
- `Used by`: the templates that apply it.

Then these sections, in this order:

- `## Contents`: what is in the space. Name the ECHO type of each kind of object
  (`Person.Person`, `Mailbox`, `Task`). Give each seed a key in backticks (`` `nadia` ``). Write
  links as `A → B (field)`. Give exact counts.
- `## Flows`: numbered click paths that must work in the running app.
- `## Checks`: what the partial's test asserts.

Content rules:

- People are fictional. Third-party organizations may use real company names. Their staff are
  fictional.
- Times are offsets from the template's reference date (`−3d`, `+14d 10:00`). A spec never names a
  calendar date, so partials that share a template share one clock.
- Totals are round numbers (50 tasks, 150 messages, 300 events). Sub-counts add up to them.
- Past mail, tasks and agent runs cover at least a month. Repeating events are expanded across a
  year.
- Every requirement is one the current types and app can meet. Check the schema and the UI before
  writing it, and write the mechanism into the spec ("one `Event` per occurrence").
- Bullets and counts only. The world paragraph is the only prose.

## Spec to code

Run these steps in order whenever a spec is new or its `## Contents` changes.

1. **Read the spec whole.** When a decision the code needs is missing, answer it from the code or
   ask the user, and write the answer into the spec before writing code. Done when you can name the
   ECHO type, field and count behind every bullet.
2. **Seeds.** For each `## Contents` subsection, write one file of seed tables keyed by the spec's
   keys, plus the effect that builds them. Import the required partials' `Provides` types; their
   seeds stay theirs. Done when every key in the spec appears in a seed table.
3. **The partial.** In the directory's `index.ts`, export
   `Partial: SampleSpace.Phase<Provides, Requires>`. Its `schemas` cover every type the spec names.
   `Requires` holds the required partials' `Provides`, with optional partials as optional fields.
   `Provides` holds exactly the header's keys.
4. **The test.** Write one suite for the partial that builds it with `buildArchive` and asserts
   every bullet under `## Checks`, using `histogram` for counts. Done when each Check bullet maps to
   an assertion.
5. **The template.** Add the partial to its template's phase map, in `Requires` order. In `build`,
   pass each partial's `Provides` into the next one's `Requires`, then add the root collections. A
   new template gets `makeTemplate` and an entry in the plugin's `capabilities/space-templates.ts`.
   Keep the content lazy: `composer-app:check-boot-budget` must not move.
6. **The flows.** Walk every `## Flows` entry in the running app with the `composer-qa` or
   `composer-debug` skill. Report each flow you could not walk as not verified.
7. **The header.** Update `Code` and `Used by` to name the files and templates that now exist, and
   the partials table in the README.

## Changing content

Edit the spec first, then the code, in the same change. When the code shows the spec is wrong, for
example a type lacks a field the spec relies on, fix the spec and tell the user what changed.
