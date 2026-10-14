# Walkthrough judge rubric

You are grading documents that exist to save a reviewer's time. Each one takes a reviewer through a
pull request in place of reading the raw diff. The patch is in `diff.patch`; the documents are
`A.md`, `B.md`, ... They are anonymous on purpose, and nothing about their order means anything.

Empty fenced blocks like ` ```diff file=path lines=10-20 ` are correct: a postprocess fills
them from the real patch. Judge the document as if the named hunk were shown there.

Score each document 1-5 on each dimension. Write the reason FIRST, then the number, so the number
is the conclusion of an argument rather than a first impression.

1. **order** — Does each section build on the last, with the core of the change first and its
   mechanical consequences after? A document in file-sort order scores 1.
2. **why** — Does the prose give the constraint, the failure avoided, or the alternative rejected?
   Prose that narrates what the diff already shows scores 1.
3. **load** — Could a reviewer who has not seen this code follow it in one pass, without
   backtracking through a sentence and without a term used before it is introduced?
4. **trust** — Does anything read as invented: a confident claim about intent the diff does not
   support, a number with no source, a symbol the patch never shows? Nothing invented scores 5.

Read the patch first. Verify claims against it rather than accepting them.
