# HTML rendering — design

Why this component is shaped the way it is, and what is still open. The task ledger lives in
[`.agents/projects/qa/TASKS.md`](../../../../../../.agents/projects/qa/TASKS.md).

`Html.tsx` owns the sandbox: sanitized content in a Shadow DOM host, so the content's (often
aggressive) CSS cannot reach the app while it still flows in the app layout — no iframe, no height
measurement. Script safety is DOMPurify's, since a shadow root isolates style but does not sandbox
execution. `useEmailDialect.ts` is the email configuration of that sandbox; `transform-colors.ts` is
the email recoloring policy. Implemented 2026-07-31 — §1 and §2 below describe what the code now does,
except where marked open.

## 1. Core + dialects, not base + variant

`Html` and the email layer are not a base and a subclass. Nothing in the email layer overrides,
extends, or specializes `Html` — it _configures_ it. Every email-specific thing is a value passed through an
existing seam: a CSS string, an ordered transform list, a `cid:` resolver, and a theming predicate.
That is a dialect, not a subclass.

The shape to converge on is one component plus dialect packs:

```ts
type HtmlDialect = {
  css?: string;
  transforms?: readonly HtmlTransform[];
  resolveSrc?: HtmlSrcResolver;
  forbidTags?: readonly string[];
};
```

A dialect holds React state (the quoted-reply expand ref, memoized resolvers), so it is produced by a
hook — `useEmailDialect({ html, isPersonal, resolveSrc })` — not a constant. `HtmlViewer` is gone; a
caller renders `<Html html dialect={useEmailDialect(…)} />`.

That also removed this package's ECHO coupling. The old component took `attachments` and `db` and
reached into `Blob.url()`/`Blob.read()` to resolve `cid:` images, which dragged `@dxos/echo`/`@dxos/types`
into a general UI package and meant it could not render an email that did not come from ECHO. The
resolver now lives with the data layer (`plugin-inbox`'s `useCidResolver`) and arrives as a plain
`(src) => Promise<string | undefined>`.

Rejected: a `variant='email'` prop. That puts every future dialect's knowledge back inside the shared
component, which is the coupling the split exists to prevent.

## 2. Dark mode

Two gaps in the current behaviour.

**Gap A — dark-capable email is driven by the OS, not the app theme.** `<style>` is not in
`DEFAULT_FORBID_TAGS` (`Html.tsx`'s `DEFAULT_FORBID_TAGS`), so a sender's own `@media (prefers-color-scheme: dark)` rules
survive into the shadow root and resolve against the _browser/OS_ preference. `prefers-color-scheme`
cannot be overridden from the page — `color-scheme` on `:host` affects UA widget rendering, not the
media query. So app-dark + OS-light renders that email light, and the reverse renders it dark against
a light app.

**Gap B — un-themed email in dark mode.** Theming is skipped for non-personal table layouts and the
root carries no background, so regions the sender never painted showed the dark app surface underneath
the sender's near-black text. Now addressed by the paper sheet below.

### The sender's declaration is three-way, not two

| Declaration                                                        | Fixture | Treatment                                                                                                     |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `color-scheme: light dark` + `@media (prefers-color-scheme: dark)` | —       | Adopt the sender's own dark design: hoist the dark block's rules when the app is dark, delete them when light |
| `color-scheme: light` only                                         | `m2`    | The sender states it has no dark rendering. Do not recolor — render on an explicit light paper sheet          |
| Nothing                                                            | `m1`    | The heuristic (`isPersonal` / table test)                                                                     |

The middle row is the finding: `content="light"` is an explicit instruction _not to try_, and today it
is ignored twice over — `meta` is in `DEFAULT_FORBID_TAGS`, so the declaration is destroyed before
anything can read it. **Detection has to run on the raw string, before sanitization.**

Rewriting the CSSOM is the only way to make the app theme win over the sender's media query, and it is
available to us precisely because we own the shadow root's stylesheet. Most email clients cannot do
this.

### Decisions

- Never `filter: invert()` — it destroys logos and photography (see §4).
- Un-themed bodies in dark mode get an explicit light paper sheet (`color-scheme: light`), so the body
  is at least self-consistent rather than half-transparent over a dark surface.
- The personal-mail inversion (`transform-colors.ts:69`, `l = min(1 - l, inkL)`) clamps every dark tone
  onto the ink lightness, collapsing the authored contrast ladder. Wants a curve that preserves
  relative lightness, plus a chroma clamp so saturated text does not glow.

## 3. Other HTML sources

- **RSS — an unused escape hatch, not a live gap.** `Card.Html`
  (`packages/ui/react-ui/src/components/Card/Card.tsx`) is a second sanitize-and-render path,
  documented as being for RSS feed content: bare `dangerouslySetInnerHTML`, so no shadow isolation, no
  remote-image blocking, no theming. It has **zero call sites** in the repo, so nothing is exposed
  today — but it is exported API, so a future RSS consumer would reach for it and silently get none of
  the guarantees `Html` provides. It cannot be reimplemented on `Html`: `react-ui-components` depends
  on `react-ui`, so the import would cycle. Open decision: delete it as dead code (needs a changeset —
  it is published API), or keep it as documented-inferior. For now it carries a pointer comment.
- **Calendar events — the decision was already made at ingest.** Google Calendar returns HTML
  descriptions, but `plugin-inbox/src/operations/calendar/google/mapper.ts:65` runs `normalizeText()`
  on the way in, so ECHO stores markdown/text and `Event.tsx` renders `MarkdownViewer`. A legitimate
  trade (fidelity for uniformity) but invisible and unrecorded — worth a deliberate ruling rather than
  leaving it an accident of the mapper.
- **Agent/LLM-produced HTML and web clips** — future dialects; same sandbox, different packs.

## 4. Prior art

**Dark Reader's Dynamic Theme mode** is the reference implementation. Transferable principles:

- Modify colors rather than invert: analyze the colors and reduce lightness where needed, so hue
  relationships survive.
- Leave photographs alone. Invert _only_ dark icons/diagrams/charts that would vanish on a dark
  background — Dark Reader drives this from a per-site fix config listing selectors, i.e. they
  concluded it cannot be inferred reliably.
- Analyze background images before deciding whether they need treatment.
- Their earlier filter mode (CSS `invert` + `hue-rotate`) was abandoned because it blurred text,
  washed out colors, and broke sub-pixel rendering — direct evidence for the rule in §2.

Adoption caveat: the `darkreader` package is document-scoped (it manages the document's stylesheets
and mutations; `exportGeneratedCSS()` emits CSS for the whole page). There is no "theme this shadow
root only" API, so borrow the algorithm rather than the library, and verify its license before
vendoring any code.

For the email half the practitioner literature is the better source: clients split into full
inversion, partial inversion (backgrounds only), and honouring `prefers-color-scheme` (Apple Mail,
Outlook 2019+, Samsung, Thunderbird), with Gmail applying its own logic and largely ignoring the meta
tags.

- [Dark Reader — Dynamic Theme mode](https://darkreader.org/blog/dynamic-theme/)
- [Litmus — Ultimate Guide to Dark Mode](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers)
- [Parcel — Color scheme in email](https://parcel.io/guides/color-scheme-in-email)
- [Email on Acid — Dark Mode for Email](https://www.emailonacid.com/blog/article/email-development/dark-mode-for-email/)

## 5. Fixtures

`fixtures/*.html` is real captured mail (saved from the MailboxSync story's Archive panel), rendered
by `HtmlViewer.stories.tsx`'s `Captured` story as a light/dark pair — the failure mode is a body that
reads fine in one mode and is illegible in the other, which is only obvious with both on screen.

Both current fixtures are table layouts, so both exercise Gap B only; neither is dark-capable, so
nothing here yet covers the CSSOM-hoist path. A dark-capable capture is still needed.
