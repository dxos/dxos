# Manual Testing Plan

Everything in the plugin is covered by build, lint, unit and storybook tests. These are the steps that
convert that into "seen working" in a real Composer.

**Status: not yet run end to end by hand.** Sections A, B and E were exercised through the agent debug
port on 2026-08-22 against a live Composer; C and D have not been run at all. Per-step verdicts go
inline as `[x]`, with findings under [Results](#results).

## Before you start

Lingo is a **labs** plugin and ships disabled. Step A1 turns it on; nothing else works until it is.

**Which steps need a live AI model** is called out per step. B3 onward all depend on one — the
translation and the analysis are model calls. If the session has no AI service they fail rather than
hang, and the toast reads `Failed to analyze the text.`; treat that as "cannot run this step", not as a
defect in the plugin.

Report by step number (**B4 failed**, not "the translate button didn't work"), so a partial run is still
useful.

Work them in order. B needs what A creates, and C needs a completed analysis from B.

---

## A. Enable the plugin and create the objects

No AI needed.

- [ ] **A1** — Open **Plugins** in the sidebar, filter for `Lingo`, and toggle it on. Expect the plugin
      to activate without a reload — the navtree gains a **Word lists** section under CONTENT.
- [ ] **A2** — From the space's **Add to space** menu, choose **Add language**. Fill in a name
      (`Japanese`) and code (`ja`). Expect a Language object in the navtree.
- [ ] **A3** — **Add word list**. Its form has a **Language** ref field; pick the language from A2.
      Expect a Vocabulary object, and opening it shows `This list has no words yet.`
- [ ] **A4** — Confirm the word list's companion strip offers **Flashcards** (a cards icon).

## B. Reading companion

B1–B2 need no AI. **B3 onward need a live model.**

- [ ] **B1** — Create a Markdown document and paste a few paragraphs of text in the language you are
      studying. Open it, then open its companion strip (the split-pane button in the plank header).
      Expect a **Translation** tab with a translate icon.
- [ ] **B2** — Open the Translation tab. Expect a toolbar of: a **language selector reading English**,
      **Word list**, **Add phrase to list**, **Translate and analyze**, and an overflow **More** menu.
      The body reads `Not translated yet.`
- [ ] **B2a** — The selector says **English**, not Arabic. The option list is sorted by name, and the
      fallback used to take its first entry.
- [ ] **B2b** — **Word list** is disabled until a deck for the selected language exists, and **Add
      phrase to list** is disabled until something is selected. Both are correct, not defects.
- [ ] **B3** — Press **Translate and analyze**. Expect a spinner on the button, then the translated
      passage rendered as prose (not raw markdown), and the spinner clearing on its own.
- [ ] **B4** — Images in the source document do **not** appear in the companion. The companion wants
      the prose, not the figures.
- [ ] **B5** — Close the document and reopen it. Expect the translation to still be there, and pressing
      **Translate and analyze** again to return immediately — it is a cached `Analysis`, not a second
      model call.
- [ ] **B6** — Check the space for `Analysis` objects: there must be exactly **one** for this document
      and language, not one per press.
- [ ] **B7** — Overflow **More** → **Delete translation**. Expect the pane to return to
      `Not translated yet.`
- [ ] **B8** — Switch the language selector to another language and press **Translate and analyze**.
      Expect a second translation, and the first still reachable by switching back — an object can be
      translated into several languages at once.

## C. Structural selection

Needs a completed analysis from B3. **Not yet run.**

- [ ] **C1** — Hover a word. Expect a boundary to be drawn around **just that word**, not the sentence
      containing it — the most specific region wins.
- [ ] **C2** — Hover the gap between words, inside a clause. Expect the clause to be outlined instead.
- [ ] **C3** — Click a word. Expect the outline to become a solid highlight that stays after the pointer
      leaves, and a popover with the word's meaning.
- [ ] **C4** — The popover shows the meaning and a **+** button. It must NOT say "word", "clause" or
      "sentence", and must NOT say "not in your vocabulary yet".
- [ ] **C5** — For a language with a reading system (Japanese, Mandarin), the popover shows furigana or
      pinyin. For French or German it shows none — a pronunciation guide for a script the reader
      already reads is noise.
- [ ] **C6** — Press **+** in the popover, or **Add phrase to list** in the toolbar. The word lands in
      the word list from A3. Reopen the popover on the same word: the **+** is gone, because the term
      is already in the deck.
- [ ] **C7** — Edit the source document so its text changes. Expect the decorations to **dim** rather
      than move. Ranges are deliberately not remapped — a stale analysis that looks confident is worse
      than one that looks stale.

## D. Flashcards

No AI needed, but D needs words — run C6 first, or add a few by hand.

- [ ] **D1** — Open the word list and its **Flashcards** companion. Expect a card showing the term with
      a **Reveal** button.
- [ ] **D2** — Reveal, then **Got it**. Expect the next card.
- [ ] **D3** — Reveal, then **Missed it**. Expect the word to come back within the same session — a miss
      resets it to box 0.
- [ ] **D4** — Answer every card. Expect `Session complete.` with an `N of M correct` score.
- [ ] **D5** — Leave mid-session and come back. Expect progress on the answered words to have stuck;
      each answer is written as it is given, not batched at the end.
- [ ] **D6** — In the word list, switch **Order** to **Due first** and to **Weakest first**. Expect the
      order to change.

## E. Settings

No AI needed.

- [ ] **E1** — **Plugin Settings** → **Lingo**. Expect three fields: **Language**, **Highlight
      vocabulary**, **Translate unknown words**.
- [ ] **E2** — **Language** is a select, not a text box. Its options are BCP-47 codes (`ar`, `de`, `en`,
      `fr`, `ja`, …) — the form has no channel for option labels, which is a known gap.
- [ ] **E3** — Set it to `fr`. Reopen a document's Translation companion: the selector now reads
      **French**. Set it back to `en` and confirm it reads **English**.

---

## Known gaps

These are expected to fail; they are tracked in [`TASKS.md`](TASKS.md), not defects to report.

1. **The Translation companion is not offered beside a magazine Post.** A Post is readable now, but the
   magazine exposes a selected post only as its own companion node, and a companion of a companion does
   not render. Needs a design call.
2. **The settings language select shows codes, not names.** `Format.Options` is `string | number` with
   no label channel.
3. **Term matching is exact on the segmented token.** Inflected forms miss unless the analysis filled in
   `lemma`.

## Results

_No full manual run yet._

Partial, through the agent debug port on **2026-08-22** against a live Composer on `localhost:5180`:

- **A1** passed — the plugin activated in place, contributing all six operations.
- **B1, B2** passed after two fixes made during the run: the selector defaulted to Arabic, and the
  overflow control rendered the raw key `toolbar-overflow.menu` because the plugin never pulled in the
  `react-ui-menu` translations.
- **E1, E2, E3** passed — setting the language to `fr` moved the reader's selector to French and back.
- **B3 onward were not reachable**: that session had no AI service, so every model call failed.
