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

**Superseded 2026-07-31.** `react-ui-html` was dropped; both files now live in
`react-ui-components/src/components/HtmlViewer/`. See §4.

## 4. Core + dialects, not base + variant

`Html` and `HtmlViewer` are not a base class and a subclass — the relationship is a fixed
core plus one _dialect_ of content. `Html` owns the sandbox (shadow root, sanitize, remote
image blocking, rebuild-on-theme) and has exactly two seams (`transforms`, `resolveSrc`)
plus `css`/`forbidTags`. Everything in `HtmlViewer` is email-flavoured configuration of
those seams: a CSS string, an ordered transform list, a `cid:` resolver, and a theming
predicate. Nothing is overridden, extended, or specialized — which is what a base class
would be for.

So the shape to converge on is one component plus dialect packs:

```ts
type HtmlDialect = {
  css?: string;
  transforms?: readonly HtmlTransform[];
  resolveSrc?: HtmlSrcResolver;
  forbidTags?: readonly string[];
};
```

A dialect carries React state (the quoted-reply expand ref, memoized resolvers), so it is
produced by a hook — `useEmailDialect({ isPersonal, attachments, db })` — not a constant.
`HtmlViewer` then dissolves: plugin-inbox renders `<Html html dialect={useEmailDialect(…)} />`.
This also removes the ECHO coupling from the shared package, since the `cid:` resolver is
built where the database already is.

Do NOT model this as class inheritance or as `variant='email'` — a variant enum puts every
future dialect's knowledge back inside the shared component, which is the coupling the
split exists to prevent.

## 5. Emails that declare their own color scheme

The two captured fixtures show the taxonomy is three-way, not two-way:

| Declaration                                                        | Example | Correct treatment                                                                                             |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `color-scheme: light dark` + `@media (prefers-color-scheme: dark)` | —       | Adopt the sender's own dark design: hoist the dark block's rules when the app is dark, delete them when light |
| `color-scheme: light` only                                         | `m2`    | The sender is stating it has no dark rendering. Do not recolor — render on an explicit light paper sheet      |
| Nothing                                                            | `m1`    | Our heuristic (the current `isPersonal`/table path)                                                           |

The middle row is the finding: `content="light"` is an explicit instruction _not to try_, and
today it is ignored twice over — `<meta>` is in `FORBID_TAGS`, so the declaration is destroyed
before anything can read it. Detection has to run on the raw string, before sanitization.

Note the sender's `@media (prefers-color-scheme: dark)` rules resolve against the OS, not the
app theme, and `prefers-color-scheme` cannot be overridden from the page (`color-scheme` on
`:host` affects UA widget rendering, not the media query). Rewriting the CSSOM is the only
way to make the app theme win — which is available to us precisely because we own the shadow
root's stylesheet.

## 6. Other HTML sources

- **RSS — already shipping, unsandboxed.** `Card.Html` (`react-ui/src/components/Card/Card.tsx:455`)
  is a second sanitize-and-render path, documented as being for RSS feed content. It uses
  bare `dangerouslySetInnerHTML`: no shadow isolation (feed CSS reaches the app), no remote
  image blocking (feed trackers fire), no theming. The strongest candidate to migrate onto
  `Html`, and the one with an actual privacy consequence today.
- **Calendar events — the decision was already made at ingest.** Google Calendar returns HTML
  descriptions, but `operations/calendar/google/mapper.ts:65` runs `normalizeText()` on the way
  in, so ECHO stores markdown/text and `Event.tsx` renders `MarkdownViewer`. That is a
  legitimate choice (fidelity traded for uniformity) but it is invisible and unrecorded — worth
  a deliberate ruling rather than leaving it as an accident of the mapper.
- **Agent/LLM-produced HTML and web clips** — future dialects; the same sandbox, different packs.

## 7. Prior art for HTML → dark mode

**Dark Reader's Dynamic Theme mode** is the reference implementation. Transferable principles:

- Modify colors rather than invert: analyze the site's colors and reduce lightness where
  needed, so hue relationships survive.
- Leave photographs alone. Invert _only_ dark icons/diagrams/charts that would vanish on a
  dark background — Dark Reader drives this from a per-site fix config listing selectors,
  i.e. they concluded it cannot be inferred reliably.
- Analyze background images to decide whether they need treatment.
- Their earlier filter mode (CSS `invert` + `hue-rotate`) was abandoned because it blurred
  text, washed out colors, and broke sub-pixel rendering — which is the direct evidence for
  the "never `filter: invert()`" rule already recorded in §1.

Adoption caveat: the `darkreader` npm package is document-scoped (it manages the document's
stylesheets and mutations, and `exportGeneratedCSS()` emits CSS for the whole page). It has no
API for "theme this shadow root only", so borrow the algorithm rather than the library. Verify
its license before vendoring any code.

For the email-specific half, the practitioner literature (Litmus, Email on Acid, Parcel) is the
better source: it documents that clients split into three camps — full inversion, partial
inversion (backgrounds only), and honouring `prefers-color-scheme` (Apple Mail, Outlook 2019+,
Samsung, Thunderbird) — and that Gmail applies its own logic and largely ignores the meta tags.
Our position is unusual and better: we control the shadow root, so we can adopt the sender's
dark design instead of guessing at it.

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
