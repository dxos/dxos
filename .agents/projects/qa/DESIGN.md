# QA — Findings

Rationale behind the items in [TASKS.md](TASKS.md). One section per investigation.

## 1. HtmlViewer dark mode

Email bodies render inside a shadow root; `processEmailColors` recolors them only when
`isPersonal || !hasTable` (`HtmlViewer.tsx:274`), so marketing layouts keep their design.

**Gap A — dark-capable email is driven by the OS, not by the app theme.** `<style>` is
not in `FORBID_TAGS` (`HtmlViewer.tsx:223`), so an email's own
`@media (prefers-color-scheme: dark)` rules survive into the shadow root and resolve
against the _browser/OS_ preference. `prefers-color-scheme` cannot be overridden from
the page — setting `color-scheme` on `:host` does not affect it. So app-dark + OS-light
renders that email light, and the reverse renders it dark against a light app.
`<meta name="supported-color-schemes">` is stripped by DOMPurify, so the declaration is
gone before it could be read — detection has to run on the raw string.

**Gap B — un-themed email in dark mode.** When `shouldTheme` is false nothing is
recolored, and the root carries no background: regions the sender never painted show the
dark app surface underneath the sender's near-black text.

**Decisions.**

- Detect dark support from the raw html (`prefers-color-scheme:\s*dark`, the color-scheme
  metas). That is the same signal the email-testing tools use.
- When dark-capable, rewrite the CSSOM rather than obeying the media query: hoist the
  dark block's rules to top level in dark mode, delete them in light. Highest fidelity
  available — it is the sender's own dark design.
- When not dark-capable and not themed, render on an explicit white paper sheet
  (`color-scheme: light`) so the body is at least self-consistent. Rejected:
  `filter: invert()`, which destroys logos and photography.
- The personal-mail inversion (`transform-colors.ts:69`) clamps every dark tone onto the
  ink lightness, collapsing the authored contrast ladder. Wants a curve that preserves
  relative lightness, plus a chroma clamp so saturated text does not glow.

**Fixtures.** None of the above can be judged against the four hand-written strings in
`HtmlViewer.stories.tsx`; real mail is needed. The repo already has the pattern
(`src/testing/data/notion.eml`, `scripts/mbox.ts`). Capture from inside the app — a
per-message `Save message` action downloads exactly the emails that look wrong. `.eml`
is the better fixture than `.html` (keeps headers and attachments, and `mbox.ts` parses
it already) at slightly more cost.

## 2. Factoring out `react-ui-html`

The question was whether `HtmlViewer` is generic or too email-specific. It is both, in
separable layers — so factor it, but in three:

| Layer                                                                                             | Home             | Why                                                          |
| ------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| OKLCH↔sRGB, CSS color parse, contrast                                                             | `react-ui-theme` | No email content; already TODO'd at `transform-colors.ts:14` |
| Shadow-root host, DOMPurify, remote-image blocking, theme adoption, async `src` resolution        | `react-ui-html`  | Generic — RSS, web clips, LLM-generated HTML, previews       |
| Quote collapse, `cid:` attachments, `isPersonal`/table heuristic, client-specific quote selectors | plugin-inbox     | Email policy                                                 |

Shape: `<Html html transforms={(root: HTMLElement) => void)[]} resolveSrc={…} />`, with
plugin-inbox composing the email transforms. The split only holds if the policy stays
behind that seam — otherwise `react-ui-html` becomes an email renderer with a general
name.

## 3. Mailbox "Sync" routine with no visible Operation

**Not a failed creation.** `createSyncRoutine`
(`plugin-connector/src/util/sync-routine.ts:84`) deliberately makes a Routine named
`Sync` with `spec: { kind: 'runnable', runnable: Ref.fromURI(operation.meta.key) }`. The
cron is `MAIL_SYNC_CRON = '*/10 * * * *'` (`plugin-inbox/src/capabilities/connector.ts:32`),
declared as `sync.trigger` on both the Gmail and JMAP connectors. Binding by registry key
is intentional: the operation is statically defined and already in the registry, so
nothing is persisted into the space (asserted in `sync-routine.test.ts`).

**Ruled out as the cause of the empty field** (verified by serializing the real
operation):

- URI mismatch — the stored ref uri and the picker option id
  (`Entity.getURI(persisted, { prefer: 'named' })`) are both
  `dxn:org.dxos.plugin.inbox.operation.googleMailSync`. `findRefOption` matches keyed
  entities by direct URI equality, so this resolves.
- The visibility filter in `getOperationOptions` — both `GoogleMailSync` and `JmapSync`
  are `.pipe(Operation.visible)`.
- `Operation.serialize` throwing (registry-sync silently skips unserializable schemas) —
  it serializes cleanly.
- `withHandler` / `opaqueHandler` dropping meta annotations — both preserve `meta`.

**Still open.** Whether `Scope.registry()` returns the operation when the form renders
(`useOperations`, `RoutineForm.tsx:280`). The registry is populated imperatively by
plugin-routine's `registry-sync` capability from `Capabilities.OperationHandler`; settling
that needs the running app, not static reading.

**Adjacent question.** `RefField` renders nothing at all only when readonly/static with no
match (`RefField.tsx:206`); otherwise it shows an empty picker. An editable-but-empty
picker on a system-managed routine invites the user to overwrite the binding — worth
deciding whether that form should be readonly for connector-owned routines.
