---
name: docs-writing
description: Write or rewrite a dxos.org docs page in the docs voice. Use when adding or editing a page under `docs/src/content/docs/`, when a docs page reads like a spec instead of an explanation, or when reviewing docs prose.
---

# Docs writing

A dxos.org docs page **explains**. It takes a reader who knows TypeScript and nothing about DXOS from what they
already do, through one example at a time, to what they can do next. `docs/SPEC.mdl` makes this voice a requirement
in `F-22`. The voice is ours, and it will change as we learn what helps a reader.

- For docs we like, read a few pages of the Effect documentation (effect.website/docs), such as Expected Errors and
  Running Effects. They define each thing first, say when to use it, and explain every example.
- [`EXAMPLES.md`](EXAMPLES.md) has a before and after for each page template. Read the one for your page's template
  before you write.

## What a rewrite keeps

A rewrite changes sentences. Everything else on the page is someone else's decision.

- **Facts.** Every identifier, number, limit, default and guarantee the page states is still stated. Add no behavior
  that the page, its samples or the spec do not state (`F-4`). An explanation you add describes what the sample on
  the page already does. To explain a sample you may read its comments and the source of the API it calls.
- **Samples.** Code fences and `<Snippet>` tags stay as they are, where they are. A wrong or misplaced sample is
  fixed in its snippet file or in the spec, which is a different task. Report it.
- **Citations.** Each `<SpecCite>` stays on the claim it cites. When you split a sentence, the citation goes with the
  half that makes the claim.
- **Structure.** Frontmatter, imports, headings, tables, component tags and link targets do not change. The page's
  template in the spec fixes its parts, and headings are link targets from other pages.
- **Terms.** Use the page's word for a thing, the same word every time. The spec's decisions chose these words: App
  Graph has no article, a live query is never "complete", a Stash object is a "link".

## The voice

1. **Define the thing first.** The page's first sentence names the thing and says what it is. So does the first
   sentence under a heading that brings in a new thing. The next sentence says what you use it for.

   > A query selects entities from one or more sources and keeps its results current as the data changes. This means
   > your app reads data the same way whether it was written here or by another peer.

2. **Give the thing its own sentences, and the reader theirs.** The thing is the subject when the sentence says what
   it is or does: "`Query.all` returns the union of several queries." The reader is the subject when the sentence
   says what is possible or what to do: "You can follow a reference in either direction." "Use `Query.without` when
   you need everything except one set." A page about machinery the reader never calls, such as a transport or a
   replicator, keeps the machinery as its subject throughout.

3. **Start from what the reader already does.** Before an idea they have not met, say in one or two sentences how
   they would do it without DXOS, or what goes wrong there. Then give the DXOS answer. Use ground that any web
   developer stands on: a fetch and a refetch, a foreign key, a server that decides who may read.

   > In a client-server app, you fetch a list, and you fetch it again when you think it has changed. With ECHO, you
   > describe the entities you want once, and the results follow the data.

4. **One idea to a paragraph.** A paragraph is one to three sentences. Aim for sentences under 20 words, and split
   any that pass 30. A fact that needed a semicolon gets its own sentence.

5. **Introduce every sample, then say what to notice.** Read the snippet's source before you write about it.
   - Before the sample, put a label on its own line, `**Example** (Following a reference backwards)`, or a lead-in
     sentence that ends in a colon. A sample that follows straight from the sentence above it needs only that
     sentence. The label is a gerund phrase in sentence case.
   - After the sample, one or two sentences that start from the code: "In this example, `staff` starts from Acme and
     follows `employer` backwards." Name the line that carries the idea, and the result when there is one.
   - The numbered steps of a learning-path page and the opening sample of a TILE component page take no label. The
     step's bold lead already introduces the sample.
   - A `<Diagram>` takes no label. Give it a lead-in sentence, or follow it with a sentence that says how to read
     it.
   - A second sample under the same step or sentence gets a lead-in of its own. A label for a sample inside a list
     sits at the sample's indentation.
   - A section that has a sample and no prose gets one sentence that says what the sample's members do.

6. **For each member: what, when, what not.** Say what the member does with a verb in the third person. Then say
   when to use it, as "Use `X` when". Then say what it leaves alone. When two members sit close together, one
   sentence tells them apart. Take the "use when" from the page, the sample or the spec. With nothing to go on,
   leave it out.

   > `subscribe` calls back each time the results change. Use it when the screen has to stay current. It calls back
   > straight away only if you pass `{ fire: true }`.

7. **Write outcomes as parallel bullets.** When what happens depends on a condition, give each case its own line
   and start the lines the same way: "If the peer is online, …" "If it is offline, …"

8. **Name a term once, in bold, with its definition.** Then use that word and no other. When a page brings in three
   or more terms, the reader is helped by a two-column table of term and meaning, if the page has one.

9. **Show the logic between sentences.** Words such as "however", "instead", "for example", "by default" and "this
   means" tell the reader how the next sentence relates to the last. Use one where the relation is not obvious, at
   most one in a sentence.

10. **Say "we" when you build something together.** On a learning-path page and inside a worked example, "we" is the
    reader and the writer: "Let's give each person an employer." Concept, API and resource pages say "you".

11. **Put side knowledge in an aside.** A note defines a word or gives background. A tip recommends a practice. A
    caution names a requirement or a way to lose data. Give each a short title, including the ones already on the
    page. Two on a page is plenty, unless the page is a long procedure. In `.mdx`
    use `<Aside type="tip" title="…">` and import `Aside` from `@astrojs/starlight/components`. In `.md` use
    `:::tip[…]`.

12. **Point onward.** Where a section stops short of the whole story, end it with the link: "See
    [Feeds](/docs/echo/concepts/feeds/) for how a feed orders its entries."

13. **Present tense, plain verbs.** "Can" says what is possible. "Will" is for the result of running something.
    Contractions that a person would say aloud are fine: "doesn't", "it's", "let's", "you'll".

## House style

`readable-prose` is the house style for every sentence. A page in the docs voice still obeys it:

- Headings are in sentence case.
- A section ends on its last fact, with no summary of what it just said.
- The verb is plain and active: "use", "let", "returns". The checker lists the padding it rejects.
- A sentence ends at a period. Commas join, and dashes and semicolons are not used.

## By template

The spec's `template` blocks fix each page's parts. This is how the voice sits in them. Go by the page's shape
where the spec's template name does not match a row: a page with `<Steps>` follows the `tutorial` row, and a TILE
component page follows the `reference` row.

| Template    | Pages                             | How the voice applies                                                                                                                                                                                                                                          |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overview`  | Overview                          | Open with what the section is, in one paragraph. Give the section in brief, then where it fits with the rest of DXOS and where to go next. The guarantees belong to the concept pages.                                                                         |
| `concept`   | Core concepts                     | Open with the definition, then what the reader uses it for. In Model, start from what they already do, and label each sample. In Behavior and Limits, keep one claim to a bullet, with its citation, and say what the reader sees.                             |
| `tutorial`  | Learning path                     | Say "we". Open with what the app gains on this page. In Background, tie each fact to the step that uses it. In Steps, keep each bold lead an instruction, then say what to notice in the sample.                                                               |
| `namespace` | API pages for ECHO, HALO and PLEX | Open with what the namespace is for. Under each task heading: what, when, the sample, what not.                                                                                                                                                                |
| `reference` | TILE component pages              | Open with one sentence that says what the component is. Where each part has a heading, give it a sentence with the part as its subject, then "Use it when". Where the parts are in a table, the rewrite is the summary paragraph only. Leave the tables alone. |
| `narrative` | Why pages                         | Start from the problem in code the reader has written. "We" is fine. Each problem section names the mechanism that removes it.                                                                                                                                 |
| Guides      | Guides                            | Open with what the reader will have at the end. Then the same pattern as a namespace page.                                                                                                                                                                     |
| Resources   | Glossary, llms.txt, API reference | A glossary entry is a full sentence with the term as its subject ("A swarm is the set of …"), then any further facts the entry had, each in its own sentence. The rest get a light pass for rule 4 and the house style.                                        |

## Rewriting a page

1. **Find the page's contract.** Search `docs/SPEC.mdl` for the page's `route:`. Note its `template` and its
   `covers:` list. Done when you can name the template and every point the page must cover.
2. **Read the page and its samples.** For each `<Snippet file="x" region="y">`, read region `y` of
   `docs/src/echo/snippets/x.*`, or of the tutorial project when the file starts with `echo-tutorial/`,
   `plex-tutorial/`, `halo-tutorial/` or `tile-tutorial/` (under `docs/src/`). Done when you can say what each
   sample shows and which line carries the idea.
3. **Rewrite in place**, one section at a time, with the rules above.
4. **Run the checker** from the repo root:

   ```bash
   node .agents/skills/docs-writing/scripts/check-voice.mjs <page>...
   ```

   It compares the page with `HEAD`. An error means the rewrite changed something it must keep, or used a dash or
   padding. Fix every error. Read every warning: restore a dropped identifier or number unless the same fact is
   still stated another way, and split the long sentences. A warning is a prompt to look, so one may stand: an
   overview that the spec holds to one paragraph keeps its paragraph. Done when the page has no errors and you have
   answered each warning.

5. **Read the page as its reader.** For each paragraph, ask what it tells you to do or to know. Cut the paragraph
   that has no answer. Done when every point in `covers:` is still on the page.

A change to what a page covers, as opposed to how it says it, goes into the page's `covers:` in `docs/SPEC.mdl`
first, with a decision in the changelog (`mdl` skill).
