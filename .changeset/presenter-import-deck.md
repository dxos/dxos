---
'@dxos/plugin-presenter': minor
---

New `ImportDeck` operation (`org.dxos.operation.presenter.importDeck`): creates a Presentation from one whole Slidev markdown deck, one owned slide per `---`-separated part, keeping each slide's frontmatter and speaker notes; nothing is saved while any slide has an issue. The Presenter assistant skill offers it, so a deck handed over whole — such as a pull request's showcase — is imported unchanged rather than rewritten slide by slide.
