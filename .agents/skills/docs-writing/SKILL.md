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
- [`TEMPLATES.md`](TEMPLATES.md) says how the voice sits in each page template. Read your page's row before you
  write.
- [`EXAMPLES.md`](EXAMPLES.md) has a before and after for each template. Read the one for your page's template.

## What a change keeps

A rewrite changes sentences. The rest of the page is someone else's decision.

- **Facts.** Every identifier, number, limit, default and guarantee the page states is still stated. Add no behavior
  that the page, its samples or the spec do not state (`F-4`). To explain a sample you may read its comments and the
  source of the API it calls. A sentence that states something only the source says is a new claim: note its file
  and line in your report.
- **Samples.** Code fences and `<Snippet>` tags stay as they are, in their order. You may indent a sample into the
  list item it illustrates. A sample that disagrees with the code is wrong: fix it in its snippet file, or remove a
  step the code makes unnecessary, and say so in your report.
- **Citations.** Each `<SpecCite>` stays on the claim it cites. When you split a sentence, the citation goes with the
  half that makes the claim.
- **Structure.** Frontmatter, imports, headings, component tags, link targets, and a table's rows and columns stay.
  The page's template in the spec fixes its parts, and headings are link targets from other pages. There are three
  exceptions. Fix a spelling or a term in a `description` or in a table's first column, and report it, because
  the spec may repeat that text. Add the import a new `<SpecCite>` or `<Aside>` needs. Keep the form of a
  learning-path step's bold lead, `1. **Declare an organization.**`, because the tutorial project reads it to name
  the starter's todos.

**Report what a rewrite cannot fix.** Some problems live outside the sentences: two pages that contradict each
other, a sample that is wrong, missing or out of order, a heading that breaks the house style, a `covers:` point the
page lacks. Write each one in your report with its file and line. It goes to the spec or the snippet file.

## The section before the page

A reader goes down the sidebar, so they meet a page after its neighbors.

- **The glossary is the section's term list.** Each section has one at `<section>/resources/glossary.md`, and
  ECHO's is `additional-resources/glossary.md`. One word
  names one thing across the section, and one thing has one word. Before you use a term, find it there, and use its
  word and its meaning. A term the page needs and the glossary lacks gets an entry in the same change.
- **A term is introduced on every page that uses it.** At its first use, give it half a sentence or a link: "a
  **topic**, the key that names one space's group of devices". The page before is not the reader's memory.
- **The spec fixes some words.** App Graph is a proper name with no article. A live query is never "complete". A
  Stash object is a "link". EDGE pages call an operation an operation.

## The voice

1. **Define the thing first.** The page's first sentence names the thing and says what it is. So does the first
   sentence under a heading that brings in a new thing. The next sentence says what you use it for.

   > A query selects entities from one or more sources and keeps its results current as the data changes. Your app
   > reads data the same way whether it was written here or by another peer.

2. **Give the thing its own sentences, and the reader theirs.** The thing is the subject when the sentence says what
   it is or does: "`Query.all` returns the union of several queries." The reader is the subject when the sentence
   says what is possible or what to do: "You can follow a reference in either direction." A page about machinery the
   reader never calls, such as a transport or a replicator, keeps the machinery as its subject throughout.

3. **Give the reader a foothold, once.** Before an idea they have not met, start from where they stand. A foothold
   takes one of three shapes:
   - The way they do it today, and what it costs: "A server gives each user a row and decides who is signed in."
   - A failure they have hit: "The page scrolls where the pane should."
   - The question they arrive with: "Two people edit the same title offline. Which edit wins?"

   A page has one foothold, in the section that brings in its main idea. It differs from the foothold of the pages
   before it in the sidebar. A page whose idea the section's overview already grounded starts from the idea.

4. **One idea to a paragraph.** A paragraph is one to three sentences. Aim for sentences under 20 words, and split
   any that pass 30. A fact that needed a semicolon gets its own sentence.

5. **Introduce every sample, then add what the sample cannot say.** Read the snippet's source and its comments
   before you write about it.
   - Before the sample, put a label on its own line, `**Example** (Following a reference backwards)`, or a lead-in
     sentence that ends in a colon. A sample that follows straight from the sentence above it needs only that
     sentence. The label is a gerund phrase in sentence case.
   - After the sample, write one sentence whose subject is a name from the code. It tells the reader something the
     sample's comments do not: the result, the consequence, or why this line and not the obvious one.

     > `staff` starts from Acme and follows `employer` backwards, so the query never loads a person to check.

   - When the sample's comments already carry the idea, the sample ends the passage.
   - Each explanation on a page starts from a different name, so each opens with different words.
   - The numbered steps of a learning-path page and the opening sample of a TILE component page take no label. In a
     step, the sentence after the sample is for the one line a reader would get wrong.
   - A second sample under the same step or sentence gets a lead-in of its own.
   - A `<Diagram>` takes no label. One to three sentences beside it say what its boxes and its arrows stand for, in
     words the page has already used.
   - A sentence that ties a story or a preview to a sample is a fact. Open both before you write it.

6. **For each member: what, when, what not.** Say what the member does with a verb in the third person, in a
   sentence that tells the reader more than the member's name does. Then say when to use it: "Use `X` when" for a
   function, "Use `prop` to" for a prop. Then say what it leaves alone. When two members sit close together, one
   sentence tells them apart.

   > `subscribe` calls back each time the results change. Use it when the screen has to stay current. It calls back
   > straight away only if you pass `{ fire: true }`.

   Look for the "when" in the page, the sample, the page's `covers:` and the member's doc comment in the source. A
   member with nothing to add beyond its name stays in the members table and out of the prose.

7. **Write outcomes as parallel bullets.** When what happens depends on a condition, give each case its own line
   and start the lines the same way: "If the peer is online, …" "If it is offline, …"

8. **Name a term once, in bold, with its definition.** The defining sentence has the term as its subject: "A
   **filter** is a predicate." Then use that word and no other. Bold has two other uses. One is a label the reader sees on
   screen, such as the **Dev Server** section. The other is the run-in lead that names a paragraph's topic and
   ends in a period: "**Encryption.**" A lead is a signpost, so the term under it still gets
   its defining sentence. Where that sentence would come straight after a lead of the same word, drop the lead. A
   section holds four leads at most. Report a section that needs more, since it needs headings. A term borrowed
   from another library or another section, such as Effect's layer or HALO's guest, gets a gloss or a link and no
   bold.

9. **Let the order of sentences carry the logic.** Put the cause before the effect and the rule before its
   exception, and most pairs of sentences need no connective. Where order is not enough, pick the word that names
   the relation: "however" turns, "instead" replaces, "for example" narrows, "by default" names the unset case, "so"
   and "because" give the cause.

10. **Say "we" when you build something together.** On a learning-path page and inside a worked example, "we" is the
    reader and the writer: "Let's give each person an employer." Every other page says "you". DXOS and Composer go
    by their names.

11. **Put side knowledge in an aside.** A note defines a word or gives background. A tip recommends a practice. A
    caution names a requirement or a way to lose data. Every aside has a short title. Two on a page is plenty,
    unless the page is a long procedure. In `.mdx` use `<Aside type="tip" title="…">` and import `Aside` from
    `@astrojs/starlight/components`. In `.md` use `:::tip[…]`.

12. **Point onward.** Where a section stops short of the whole story, end it with the link, in a sentence that says
    what the reader finds there: "See [Feeds](/docs/echo/concepts/feeds/) for how a feed orders its entries." The
    link's text is the title of the page it opens. A link on a term inside a sentence keeps the term as its text.

13. **Present tense, plain verbs.** "Can" says what is possible. "Will" is for the result of running something.
    Contractions that a person would say aloud are fine: "doesn't", "it's", "let's", "you'll".

## House style

`readable-prose` is the house style for every sentence. A page in the docs voice still obeys it:

- Headings are in sentence case.
- A section ends on its last fact. The tutorial template's "What you can do now" is one sentence of what the reader
  can do after the page.
- The verb is plain and active, with its actor named: "use", "let", "returns".
- A sentence ends at a period. Commas join. This holds in prose, in headings and in table cells.
- Spelling is American: color, center, labeled, behavior. This holds for the strings and comments of a sample too,
  since they render on the page.
- A member carries its namespace at its first use in a section, `Query.all`, and may go bare after that.

## Table cells

A rewrite keeps a table's rows, columns and facts, and brings its cells to one style:

- A cell is a phrase or a sentence. Two facts are two sentences.
- A "What it is" cell is a noun phrase: "The row of tabs". A root that only holds state is "The root, which holds
  the open state". A hook is "A hook that returns the selection".
- An "Effect" cell starts with a verb in the third person: "Disables the trigger".
- A handler's cell says what happened: "The user clicked a node", "The pointer entered a cell". A handler that takes
  over a behavior says which: "Runs in place of the action's own function".
- A type is in code font.
- A default comes last in its cell: "`'md'` by default", or in words where it is no literal, "No limit by default".

A part with its own heading and a row in the Parts table gets a sentence under the heading that its row does not
have. Where the heading only brings in a props table, "`Grid.Content` takes these props:" is the sentence.

## Rewriting a page

1. **Find the page's contract.** Search `docs/SPEC.mdl` for the page's `route:`. Note its `template` and its
   `covers:` list. Done when you can name the template and every point the page must cover.
2. **Read the neighbors.** Read the section's glossary and overview, and the page before and the page after yours in
   the sidebar. The order of the `page` blocks in the spec is the sidebar's order. Done when you can name the
   foothold each neighbor used and the terms your page shares with them.
3. **Read the page and its samples.** For each `<Snippet file="x" region="y">`, read region `y` of
   `docs/src/echo/snippets/x.*`, or of the tutorial project when the file starts with `echo-tutorial/`,
   `plex-tutorial/`, `halo-tutorial/` or `tile-tutorial/` (under `docs/src/`). Done when you can say what each
   sample shows, which line carries the idea, and what its comments already say.
4. **Rewrite in place**, one section at a time, with the rules above.
5. **Run the checker** from the repo root:

   ```bash
   node .agents/skills/docs-writing/scripts/check-voice.mjs <page>...
   ```

   It compares the page with `HEAD`. An error means the rewrite changed something it must keep, or broke the house
   style. Fix every error. A change your task asked for, such as a new glossary entry or a heading a finding told
   you to fix, also shows as an error: pass `--voice-only` to check the prose alone, and name each such change in
   your report. Read every warning: restore a dropped identifier or number unless the same fact is still
   stated another way, split the long sentences, and give repeated openers their own subjects. A warning is a prompt
   to look, so one may stand: an overview that the spec holds to one paragraph keeps its paragraph. Done when the
   page has no errors and you have answered each warning.

6. **Read the page as its reader, after its neighbors.** For each paragraph, ask what it tells you to do or to know.
   Cut the paragraph that has no answer, and the sentence a neighbor already said. Done when every point in
   `covers:` is still on the page.
7. **Report** what the rewrite could not fix, as the section above describes.

A change to what a page covers, as opposed to how it says it, goes into the page's `covers:` in `docs/SPEC.mdl`
first, with a decision in the changelog (`mdl` skill).
