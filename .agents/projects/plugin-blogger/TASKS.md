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

- [ ] Factor out the `widgets.map(...)` xmlTags portal rendering. The block
      `{widgets.map(({ id, root, Component, props }) => <div key={id}>{createPortal(
    <Component {...props} />, root)}</div>)}` is duplicated across
      plugin-markdown `MarkdownEditor.tsx` (`MarkdownEditorBlocks`),
      react-ui-markdown `MarkdownStream.tsx`, and the react-ui-editor
      `Widgets.stories.tsx` variants. Extract a shared component (e.g.
      `XmlWidgetPortals`/`useXmlWidgets` in ui-editor or react-ui-editor) that
      owns the `setWidgets` state + portal rendering, and update all call sites.
