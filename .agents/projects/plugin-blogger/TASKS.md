# plugin-blogger — TASKS

Work-stream ledger for the blogger/typefully plugins (PR #12168).

## Backlog

- [ ] Embed plugin-studio images/video into a Post draft. Markdown embed as a DXN
      link to an image/video **Artifact** (from plugin-studio). Insertion is
      initiated from the editor toolbar and/or a CodeMirror slash-command, which
      opens a **popover containing a gallery/masonry** of the space's Artifacts;
      selecting one inserts its DXN link into the draft markdown. (Reuse the
      existing markdown DXN/`dxn:`/`echo:` link + `PreviewComponent` transclusion
      path — see plugin-markdown `useExtensions`/`PreviewComponent`; the artifact
      surface already renders via `AppSurface.CardContent`/Section.)
