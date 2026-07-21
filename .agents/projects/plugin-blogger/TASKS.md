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

- [ ] Factor out the xmlTags portal rendering. The `widgets.map(... createPortal(...))`
      block is duplicated across plugin-markdown `MarkdownEditor.tsx`
      (`MarkdownEditorBlocks`), react-ui-markdown `MarkdownStream.tsx`, and the
      react-ui-editor `Widgets.stories.tsx` variants. Extract a shared component
      (`XmlWidgetPortals` / `useXmlWidgets` in ui-editor or react-ui-editor) that owns
      the `setWidgets` state + portal rendering, and update all call sites.

- [ ] Per-Publication Typefully social-set (team) targeting via the connector
      binding framework (option #2, "bounded"). Today `resolveSocialSetIdEffect`
      in `plugin-typefully/src/services/typefully-api.ts` heuristically prefers the
      first team-owned social set; make the target an explicit, per-Publication
      setting populated by the connect flow. Bounded plan: (1) add
      `getSyncTargets` to the Typefully `ConnectorEntry` that lists social sets
      (fetchable post-key, so a real picker appears); (2) add an `optionsSchema`
      of `{ socialSetId }`; (3) set the `bindTarget: true` connector-auth
      annotation on `Blog.Publication` so connecting binds the Connection to that
      Publication with the chosen social set as the binding's option (a `Cursor`);
      (4) have `SyncPosts` READ the Publication's binding `socialSetId`
      instead of auto-resolving — keep the custom bidirectional reconcile (do NOT
      rewrite onto the framework's per-binding `sync` loop). Enables different
      Publications → different teams. Mirrors plugin-discord/plugin-inbox binding
      wiring (getSyncTargets/optionsSchema/bindTarget). See the design discussion
      in the PR thread for trade-offs vs the simpler Connection-field approach.
