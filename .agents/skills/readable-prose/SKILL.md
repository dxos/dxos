---
name: readable-prose
description: Write prose a reviewer can read once. Use when writing a PR body, a commit message, a walkthrough, a design doc, a review comment, or a chat reply that runs past a couple of sentences.
---

# Readable prose

The reader's time is the scarce resource, and review is the bottleneck. Every sentence spends it.
A paragraph that takes two passes to parse has already failed, however accurate it is.

Two loads to keep down:

- **Parse load**: work to get through a sentence. Length, clause nesting, punctuation standing in
  for structure.
- **Ground load**: work to follow the argument. A term used before it is introduced, a claim with no
  evidence, a detour the reader has to hold open.

## The moves

1. **Lead with the answer.** The finding, the decision, the number. Context after, and only what
   changes what the reader does.
2. **One idea per sentence.** If the reader has to backtrack, split it or drop a clause. Past ~30
   words, assume it needs splitting.
3. **Say the mechanism, not the feeling.** Not "the retry makes this more robust" but "the second
   attempt runs on a warmed socket". If you cannot restate a sentence as a fact, an instruction or a
   number, cut it. A sentence that would sit unchanged in another project's docs says nothing about
   this one.
4. **Ground a term before leaning on it.** Name the idea and the word together, once, then reuse the
   same word. Synonym cycling reads as three concepts.
5. **Active voice, named actor.** "The compiler validates queries", not "queries are validated".
6. **Plain word over fancy.** use over utilize, help over facilitate, many over numerous, if over in
   the event that, add over wedge in, base over substrate, way over vector.
7. **Structure carries structure.** A heading, a list or a table where the shape repeats; prose where
   there is an argument. Colons and dashes stitching clauses together are structure the reader has to
   reconstruct.
8. **Cut the connective em dash.** End the sentence or use a comma. (This repo's older docs are full
   of them, which is the habit, not the standard. Leave them where they are; do not add more.)
9. **Bold leads end in a period and add new detail.** `**Schema in TypeScript.** Tables live in one
file.` is fine. `**Performance:** performance improved` is the line written twice.
10. **Sentence case headings. No decorative emoji. Straight quotes.**

## Words that mark generated text

Cut on sight: additionally, crucial, delve, enduring, enhance, fostering, garner, groundbreaking,
interplay, intricate, leverage, pivotal, robust, seamless, showcase, tapestry, testament,
underscore, utilize, vibrant.

Rewrite: "serves as" / "stands as" / "boasts" to "is" or "has"; "it is important to note that" to
nothing; "in order to" to "to"; "not just X but Y" to the point itself; "could potentially possibly"
to "may".

Drop: sycophancy ("great question"), closing summaries that restate the document, "the future looks
bright" endings, vague attribution ("experts believe", "some argue") with no name attached.

Watch the rule of three. Three items because there are three, not because three sounds finished.

## Before you send

Reread your own paragraphs and ask, for each:

- What does this tell the reader to do or know? No answer means cut it.
- Where does the reader have to backtrack? Split there.
- Which claim has no evidence in the diff, the log or the run? Attach one or drop the claim.
- What would make this obviously generated? Fix that.

Length is earned by content. A three-line PR body for a three-line change is the right size.

## Checking it

`scoreWalkthrough` in `packages/plugins/plugin-github/src/walkthrough/score.ts` grades a document
against several of these mechanically (sentence length, generated vocabulary, inline headers, title
case, prose density). It was written for walkthroughs, and it reads any markdown.

## Credits

Adapted from `unslop` and `principle-minimize-reader-load`
(https://github.com/wittjosiah/agent-skills), `writing-for-agents` and the `writing-shape` grounding
model (https://github.com/mattpocock/skills), and the pstack principle skills
(https://github.com/cursor/plugins).
