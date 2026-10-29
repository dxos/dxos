---
name: showcase
description: >-
  Build a pull request's showcase — the presentation an agent session leaves of what it did — as a
  plugin-presenter deck: a summary slide plus one slide per demo video or screenshot, with each autocue
  script's narration as speaker notes, ready to import into Composer and to link from the spec feature it
  implemented. Use when opening or rewriting a PR (every PR has one, at least the summary slide), when
  asked for a showcase, a PR presentation, a "deck of what you did", or to turn an autocue recording into
  slides, and when a merged PR's showcase should be recorded against a `.mdl` feature. For recording the
  demo itself use `autocue`; for the PR body use `pr-description`.
---

# Showcase

A showcase is a **presentation**: an ordered array of slides, each a markdown slide or a reference to an
ECHO object (plugin-presenter's `Presentation`), linked to the features and tasks it demonstrates by
plugin-projects' `Demonstrates` relation. Every PR has one. The minimum is one markdown slide, the summary;
a PR with a demo adds a narrated slide per recording and a slide per screenshot. In a space it is made by
`CreateShowcase` (presenter `PLUGIN.mdl` F-13); in the repository, after merge, it stays with the feature
it implemented as a non-normative `showcase` block in the spec (`packages/reflect/deus/lang/showcase.mdl`),
the spec-file counterpart of `Demonstrates`.

This skill does not replace the in-app Presenter skill (`plugin-presenter/src/skills/PresenterSkill.ts`),
which writes decks inside Composer from a prompt. It produces the deck from a PR's material, outside
the app, as one document that `CreateShowcase` takes whole.

## The format, and why

The deck is one **Slidev markdown document** in presenter's subset (`PLUGIN.mdl` F-6), not JSON of ECHO
objects:

- Composer reads it two ways with no converter: dropped in as a Markdown document it previews as slides
  (F-2), and passed as `CreateShowcase`'s `content` it becomes a real `Presentation` with one owned `Slide`
  per part (F-13.2), each keeping its frontmatter and notes — so a slide can then be re-recorded, given a
  HeyGen take, or presented with the teleprompter.
- It is readable and diffable in a PR, and the formatter leaves it byte-stable (every slide carries
  single-quoted frontmatter, which also keeps a body line from parsing as the next slide's YAML).
- A video slide is a `backgroundVideo` slide with a link to the original (background video plays muted);
  a screenshot is a centred image; the narration goes in the trailing `<!-- … -->` notes comment, one
  bullet per step, which the presenter's teleprompter reads one line at a time (F-12.1).

The generator also writes `<out>.json`, `{ name, slides }`, which is `CreatePresentation`'s input.

## Build it

1. **Collect the material.** The PR body's Summary (`gh pr view <n> --json body -q .body`, or the
   body file you are writing), the autocue script of each demo (below), and the published media URLs.
   A video in a deck needs a direct media URL — prefer the R2 URL `trim-static.mjs` printed over a
   `github.com/user-attachments` one, which redirects through GitHub's auth.
2. **Write the deck.**

   ```bash
   node .agents/skills/showcase/scripts/showcase.mjs --title '<PR title>' \
     --summary /tmp/pr/body.md --pr https://github.com/dxos/dxos/pull/<n> \
     --feature packages/plugins/plugin-foo/PLUGIN.mdl#F-3 \
     --script packages/plugins/plugin-foo/autocue/<flow>.script.md \
     --image <after.png url> --caption 'The panel after the fix' \
     --id SC-1 --out /tmp/pr/showcase
   ```

   Artifacts become slides in flag order; `--caption` names the one before it. `--summary -` reads stdin.
   `--id` prints the spec's `showcase` block to stderr. With no artifacts the deck is the summary slide.

3. **Check it.** Every slide must parse: run presenter's deck test against it, or preview it as a Markdown
   document in Composer.
4. **Publish it** with the PR: commit it as `showcase/<SC-n>.md` beside the spec it implements (see
   [Link it from the spec](#link-it-from-the-spec)), or, for a PR that implements no spec feature, upload
   it with `hosting-artifacts`' `upload-artifact.mjs` and link the URL. Either way the PR body's
   `**Showcase:**` line points at it (`pr-description` skill, summary template).

## Autocue scripts

A demo's script — its steps and narration — is a committed file beside its flow,
`<package>/autocue/<flow>.script.md`, written by `autocue`'s `script.mjs` (see that skill, "Commit the
script"). Pass it with `--script`: its frontmatter `video:` becomes the slide's background, its on-camera
steps become the notes, and a script with no video yet becomes a numbered-steps slide.

## Import it into Composer

A deck reaches Composer through plugin-projects' `CreateShowcase` operation, which plugin-presenter
implements: it creates the `Presentation` — one owned slide per part of the deck, then one linked slide per
artifact — and a `Demonstrates` edge from it to each target. Call it through the Composer MCP server's
`invokeOperation` (`queryOperations` first for its schema; the `composer-dev-env` skill covers the dev
server), in a space that has the Presenter and Projects plugins:

```json
{
  "key": "org.dxos.operation.projects.createShowcase",
  "spaceId": "<space id>",
  "input": {
    "name": "<PR title>",
    "content": "<the whole deck>",
    "targets": [{ "/": "echo://<spaceId>/<feature id>" }]
  }
}
```

`targets` are the `Feature` (and `Task`) objects the PR demonstrates; `artifacts` optionally adds uploaded
files, diagrams or the `PullRequest` object as further slides. It answers `{ showcase }`, the Presentation.
Content that is one slide becomes the single first slide unchanged.

## Link it from the spec

When the PR implements a feature of a `.mdl` spec, add its showcase there as a non-normative example
(`lang/showcase.mdl`; the `mdl` skill has the editing rules):

````markdown
## Showcase

The following are non-normative examples.

```mdl
showcase SC-1: A document is presented as slides and paged through.
  for: [F-1, F-2.2]
  pr: https://github.com/dxos/dxos/pull/<n>
  video: <url>
```
````

Add `showcase` to the spec's Extensions table (`org.dxos.mdl.showcase@1.0`), commit the deck as
`showcase/SC-1.md` beside the spec, and add a `## Changelog` decision. `deus lint` rejects a showcase
whose `for:` names an id the spec does not declare.

## Tests

```bash
node --test .agents/skills/showcase/scripts/showcase.test.mjs .agents/skills/autocue/scripts/script.test.mjs
```

The showcase test splits the deck with presenter's own `splitSlides` and checks it against
`packages/plugins/plugin-presenter/testing/showcase.md`, which presenter's `decks.test.ts` and its
`create-showcase.test.ts` import. When the format changes, regenerate the fixture with `UPDATE_FIXTURE=1` on the
same command, then run presenter's tests too.
