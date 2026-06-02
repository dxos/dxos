# Composer Theme Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a strict `--dx-elevation-0…7` scale in `ui-theme`, remap every named surface to it, add a distinct float tier for overlays, fix card/toolbar collision, add Message-button valence inheritance, and fix CreateObjectDialog form nesting.

**Architecture:** A private `--dx-elevation-N` scale in `semantic.css` (8 levels, monotonic in both modes) acts as the single source of truth; every `--color-*-surface` becomes an alias of the appropriate level. Component-level fixes (Message valence CSS vars, CreateObjectPanel column layout) are self-contained. `DESIGN_SYSTEM.md` is rewritten last.

**Tech Stack:** CSS (`@theme`, `light-dark()`, `color-mix()`), Tailwind v4 utility classes, TypeScript (React component theme files), Vitest, moon tasks.

---

## File map

| File | Change |
|------|--------|
| `packages/ui/ui-theme/src/css/theme/palette.css` | Add `--color-neutral-775` interpolation |
| `packages/ui/ui-theme/src/css/theme/semantic.css` | Add `--dx-elevation-0…7`; remap all surface tokens; add `--color-popover-surface` |
| `packages/ui/ui-theme/src/css/components/surface.css` | Add `.dx-popover-surface` utility class |
| `packages/ui/react-ui/src/components/Popover/Popover.theme.ts` | `dx-modal-surface` → `dx-popover-surface` |
| `packages/ui/react-ui/src/components/Toast/Toast.theme.ts` | `dx-modal-surface` → `dx-popover-surface` |
| `packages/ui/react-ui/src/components/Menu/Menu.theme.ts` | `dx-modal-surface` → `dx-popover-surface` |
| `packages/ui/react-ui/src/components/Toolbar/Toolbar.theme.ts` | Add drop shadow to toolbar root |
| `packages/ui/ui-theme/src/util/valence.ts` | Add `buttonValence()` export |
| `packages/ui/react-ui/src/components/Message/Message.tsx` | Set `--dx-valence-bg/bg-hover/fg` CSS vars in `Message.Root` |
| `packages/ui/react-ui/src/components/Message/Message.stories.tsx` | Add `WithButton` story |
| `packages/ui/ui-theme/src/css/components/button.css` | Add `.dx-button[data-variant='valence']` rule |
| `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx` | Add column-propagation classNames to form branch |
| `packages/ui/ui-theme/src/css/DESIGN_SYSTEM.md` | Rewrite surfaces/hierarchy sections; remove `fill` role |

---

## Task 1: Add `n-775` to palette

**Files:**
- Modify: `packages/ui/ui-theme/src/css/theme/palette.css`

- [ ] **Open** `packages/ui/ui-theme/src/css/theme/palette.css` and locate the block near line 42 (`--color-neutral-825`, `--color-neutral-850`, …). Insert one new line between `--color-neutral-750` and `--color-neutral-800`:

```css
  --color-neutral-775: color-mix(in oklch, var(--color-neutral-750) 50%, var(--color-neutral-800) 50%);
```

The block should now read:
```css
  --color-neutral-700: oklch(0.371 var(--dx-neutral-chroma) var(--dx-neutral-hue));
  --color-neutral-750: color-mix(in oklch, var(--color-neutral-700) 50%, var(--color-neutral-800) 50%);
  --color-neutral-775: color-mix(in oklch, var(--color-neutral-750) 50%, var(--color-neutral-800) 50%);
  --color-neutral-800: oklch(0.269 var(--dx-neutral-chroma) var(--dx-neutral-hue));
```

- [ ] **Verify** the file has no duplicate `--color-neutral-7*` keys:
```bash
grep "neutral-7" packages/ui/ui-theme/src/css/theme/palette.css
```
Expected: four lines — `700`, `750`, `775`, `800`.

- [ ] **Commit:**
```bash
git add packages/ui/ui-theme/src/css/theme/palette.css
git commit -m "chore(ui-theme): add n-775 neutral ramp step"
```

---

## Task 2: Add `--dx-elevation-0…7` and remap surface tokens

**Files:**
- Modify: `packages/ui/ui-theme/src/css/theme/semantic.css`

- [ ] **Add the elevation primitive.** At the very top of the `@theme` block (before the first `--color-deck-surface` line), insert:

```css
  /*
   * Elevation ladder — strictly monotonic, z-order low → high.
   * Dark: darker = lower; light: lighter = lower (inverted toward white).
   *
   * Level  Name    Roles
   *   0    void    window gaps, scrim base
   *   1    rail    L0 icon rail
   *   2    chrome  L1/R sidebars, header
   *   3    canvas  base, deck
   *   4    raised  card, group, input
   *   5    bar     toolbar (sticky, drop-shadowed)
   *   6    modal   dialog, modal
   *   7    float   popover, menu, toast, tooltip
   */
  --dx-elevation-0: light-dark(var(--color-neutral-200), var(--color-neutral-950)); /* void   */
  --dx-elevation-1: light-dark(var(--color-neutral-175), var(--color-neutral-900)); /* rail   */
  --dx-elevation-2: light-dark(var(--color-neutral-150), var(--color-neutral-875)); /* chrome */
  --dx-elevation-3: light-dark(var(--color-neutral-125), var(--color-neutral-850)); /* canvas */
  --dx-elevation-4: light-dark(var(--color-neutral-100), var(--color-neutral-825)); /* raised */
  --dx-elevation-5: light-dark(var(--color-neutral-75),  var(--color-neutral-800)); /* bar    */
  --dx-elevation-6: light-dark(var(--color-neutral-50),  var(--color-neutral-775)); /* modal  */
  --dx-elevation-7: light-dark(white,                    var(--color-neutral-750)); /* float  */
```

- [ ] **Remap the named surface tokens.** Replace the existing individual `--color-*-surface` declarations in the `@theme` block with these (preserving the existing block structure, just changing the values). The complete set after the edit:

```css
  /* Surfaces — each maps to exactly one elevation level */
  --color-deck-surface:    var(--dx-elevation-3);
  --color-base-surface:    var(--dx-elevation-3);
  --color-sidebar-surface: var(--dx-elevation-2);
  --color-header-surface:  var(--dx-elevation-2);
  --color-toolbar-surface: var(--dx-elevation-5);
  --color-card-surface:    var(--dx-elevation-4);
  --color-group-surface:   var(--dx-elevation-4);
  --color-group-alt-surface: var(--dx-elevation-4);
  --color-input-surface:   var(--dx-elevation-4);
  --color-modal-surface:   var(--dx-elevation-6);
  --color-popover-surface: var(--dx-elevation-7); /* new — float tier */

  /* Sidebar / panel layout levels */
  --color-l0-surface: var(--dx-elevation-1);
  --color-l1-surface: var(--dx-elevation-2);
  --color-r0-surface: var(--dx-elevation-2);
  --color-r1-surface: var(--dx-elevation-2);
```

Keep `--color-scrim-surface`, `--color-inverse-surface`, `--color-inverse-fg`, `--color-focus-surface`, `--color-attention-surface` unchanged — they are not elevation-driven.

- [ ] **Verify** all old individual values (`var(--color-neutral-825)` etc. on surface tokens) are gone:
```bash
grep "neutral-825\|neutral-850\|neutral-875\|neutral-100\|neutral-825" packages/ui/ui-theme/src/css/theme/semantic.css | grep "surface"
```
Expected: no matches (old literal values replaced by `--dx-elevation-*` references).

- [ ] **Commit:**
```bash
git add packages/ui/ui-theme/src/css/theme/semantic.css
git commit -m "feat(ui-theme): add --dx-elevation-0…7 primitive; remap all surface tokens"
```

---

## Task 3: Add `.dx-popover-surface` utility class

**Files:**
- Modify: `packages/ui/ui-theme/src/css/components/surface.css`

- [ ] **Append** the new class at the end of the `@layer dx-components` block in `surface.css`:

```css
  .dx-popover-surface {
    @apply bg-popover-surface text-base-fg backdrop-blur-md;
    --surface-bg: var(--color-popover-surface);
  }
```

The full file after the edit:

```css
/**
 * Surfaces
 */

@layer dx-components {
  .dx-base-surface {
    @apply bg-base-surface text-base-fg;
    --surface-bg: var(--color-base-surface);
  }

  .dx-sidebar-surface {
    @apply bg-sidebar-surface text-base-fg;
    --surface-bg: var(--color-sidebar-surface);
  }

  .dx-modal-surface {
    @apply bg-modal-surface text-base-fg backdrop-blur-md;
    --surface-bg: var(--color-modal-surface);
  }

  .dx-attention-surface {
    @apply bg-attention-surface text-base-fg;
    --surface-bg: var(--color-attention-surface);
  }

  .dx-popover-surface {
    @apply bg-popover-surface text-base-fg backdrop-blur-md;
    --surface-bg: var(--color-popover-surface);
  }
}
```

(Remove the stale commented-out `@layer dx-tokens` block at the bottom while you're here — it was a TODO that never landed.)

- [ ] **Commit:**
```bash
git add packages/ui/ui-theme/src/css/components/surface.css
git commit -m "feat(ui-theme): add dx-popover-surface utility (elevation level 7)"
```

---

## Task 4: Switch overlays from `dx-modal-surface` to `dx-popover-surface`

**Files:**
- Modify: `packages/ui/react-ui/src/components/Popover/Popover.theme.ts`
- Modify: `packages/ui/react-ui/src/components/Toast/Toast.theme.ts`
- Modify: `packages/ui/react-ui/src/components/Menu/Menu.theme.ts`

- [ ] **Popover.theme.ts** — change line 16:
```ts
// before:
'dx-modal-surface border border-separator rounded-sm',
// after:
'dx-popover-surface border border-separator rounded-sm',
```

- [ ] **Toast.theme.ts** — change line 20:
```ts
// before:
'dx-modal-surface rounded-md p-1',
// after:
'dx-popover-surface rounded-md p-1',
```

- [ ] **Menu.theme.ts** — change line 16:
```ts
// before:
'dx-modal-surface w-48 rounded-sm md:w-56 border border-separator',
// after:
'dx-popover-surface w-48 rounded-sm md:w-56 border border-separator',
```

Dialog.theme.ts intentionally stays on `dx-modal-surface` (level 6).

- [ ] **Build react-ui to catch typos:**
```bash
moon run react-ui:build 2>&1 | tail -20
```
Expected: build succeeds with no errors.

- [ ] **Commit:**
```bash
git add packages/ui/react-ui/src/components/Popover/Popover.theme.ts \
        packages/ui/react-ui/src/components/Toast/Toast.theme.ts \
        packages/ui/react-ui/src/components/Menu/Menu.theme.ts
git commit -m "feat(react-ui): switch popover/toast/menu to dx-popover-surface (float tier)"
```

---

## Task 5: Add toolbar drop shadow

**Files:**
- Modify: `packages/ui/react-ui/src/components/Toolbar/Toolbar.theme.ts`

The toolbar now sits at elevation 5 (lighter than the deck in dark, raised in light). A downward drop shadow communicates that content scrolls beneath it.

- [ ] **Edit** `Toolbar.theme.ts` — update the `root` function to add `shadow-sm` (the existing `surfaceShadow` positioned-elevation value):

```ts
const root: ComponentFunction<ToolbarStyleProps> = ({ density, disabled, layoutManaged }, ...etc) => {
  return mx(
    'bg-toolbar-surface dx-toolbar shadow-sm',
    density === 'lg' && 'h-(--dx-rail-size) px-3!',
    density === 'sm' && 'h-7 px-2!',
    density === 'xs' && 'h-6 px-1!',
    disabled && '*:opacity-20',
    !layoutManaged && layout,
    ...etc,
  );
};
```

- [ ] **Commit:**
```bash
git add packages/ui/react-ui/src/components/Toolbar/Toolbar.theme.ts
git commit -m "feat(react-ui): add drop shadow to toolbar (elevation bar tier)"
```

---

## Task 6: Message-button valence inheritance

**Files:**
- Modify: `packages/ui/ui-theme/src/util/valence.ts`
- Modify: `packages/ui/react-ui/src/components/Message/Message.tsx`
- Modify: `packages/ui/ui-theme/src/css/components/button.css`
- Modify: `packages/ui/react-ui/src/components/Message/Message.stories.tsx`

### 6a: Add `buttonValence` to valence.ts

The function returns Tailwind classes for a button variant that reads CSS variables (`--dx-valence-bg`, `--dx-valence-bg-hover`, `--dx-valence-fg`) set by an ancestor `Message.Root`. Using CSS vars (not hardcoded hue names) so the button automatically matches whatever valence the message carries.

- [ ] **Edit** `packages/ui/ui-theme/src/util/valence.ts` — append after the existing `messageValence` export:

```ts
/**
 * Classes for a button rendered inside a Message.Root that should inherit the message's valence color.
 * Message.Root sets --dx-valence-bg / --dx-valence-bg-hover / --dx-valence-fg on its DOM node;
 * these classes consume those variables. Use data-variant="valence" on the Button.
 */
export const buttonValence = (_valence?: MessageValence) =>
  'text-(--dx-valence-fg) bg-(--dx-valence-bg) hover:bg-(--dx-valence-bg-hover)';
```

(The valence parameter is intentionally unused — the CSS vars carry the value. It is accepted so callers can see the intent and for future extension.)

### 6b: Set valence CSS vars in Message.Root

- [ ] **Edit** `packages/ui/react-ui/src/components/Message/Message.tsx`. In `MessageRoot`, add an inline `style` prop on `Column.Root` that sets the three CSS vars from the valence:

```tsx
const valenceVars: Record<MessageValence, React.CSSProperties> = {
  success: {
    '--dx-valence-bg': 'var(--color-success-bg)',
    '--dx-valence-bg-hover': 'var(--color-success-bg-hover)',
    '--dx-valence-fg': 'var(--color-success-fg)',
  } as React.CSSProperties,
  info: {
    '--dx-valence-bg': 'var(--color-info-bg)',
    '--dx-valence-bg-hover': 'var(--color-info-bg-hover)',
    '--dx-valence-fg': 'var(--color-info-fg)',
  } as React.CSSProperties,
  warning: {
    '--dx-valence-bg': 'var(--color-warning-bg)',
    '--dx-valence-bg-hover': 'var(--color-warning-bg-hover)',
    '--dx-valence-fg': 'var(--color-warning-fg)',
  } as React.CSSProperties,
  error: {
    '--dx-valence-bg': 'var(--color-error-bg)',
    '--dx-valence-bg-hover': 'var(--color-error-bg-hover)',
    '--dx-valence-fg': 'var(--color-error-fg)',
  } as React.CSSProperties,
  neutral: {
    '--dx-valence-bg': 'var(--color-neutral-bg)',
    '--dx-valence-bg-hover': 'var(--color-neutral-bg-hover)',
    '--dx-valence-fg': 'var(--color-neutral-fg)',
  } as React.CSSProperties,
};
```

Then pass `style={valenceVars[valence]}` to `Column.Root`. The full `MessageRoot` return becomes:

```tsx
return (
  <MessageProvider {...{ titleId, descriptionId, valence }}>
    <Column.Root
      asChild={asChild}
      role={valence === 'neutral' ? 'paragraph' : 'alert'}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...props}
      style={valenceVars[valence]}
      classNames={tx('message.root', { valence, elevation }, classNames)}
      ref={forwardedRef}
    >
      {children}
    </Column.Root>
  </MessageProvider>
);
```

### 6c: Add the `valence` button variant rule in button.css

- [ ] **Edit** `packages/ui/ui-theme/src/css/components/button.css`. Inside the `&:not([disabled]), &[disabled='false']` block (around line 55), add after the `destructive` rule:

```css
      &[data-variant='valence'] {
        color: var(--dx-valence-fg);
        background: var(--dx-valence-bg);
        &:hover,
        &[aria-pressed='true'],
        &[aria-checked='true'],
        &[data-state='open'] {
          background: var(--dx-valence-bg-hover);
        }
      }
```

### 6d: Add a story showing a valence button

- [ ] **Edit** `packages/ui/react-ui/src/components/Message/Message.stories.tsx`. Add an import for `Button` and a new story at the bottom:

```ts
import { Button } from '../Button';
```

```ts
export const WithButton: Story = {
  args: {
    valence: 'success',
    title: 'Action required',
    body: random.lorem.paragraphs(1),
  },
  render: ({ valence, title, body }) => (
    <div className='w-[30rem]'>
      <Message.Root valence={valence}>
        {title && <Message.Title onClose={() => console.log('close')}>{title}</Message.Title>}
        {body && <Message.Content>{body}</Message.Content>}
        <Button variant='valence' classNames='col-start-2'>Confirm</Button>
      </Message.Root>
    </div>
  ),
};
```

- [ ] **Build to check types:**
```bash
moon run react-ui:build ui-theme:build 2>&1 | tail -20
```
Expected: succeeds.

- [ ] **Commit:**
```bash
git add packages/ui/ui-theme/src/util/valence.ts \
        packages/ui/react-ui/src/components/Message/Message.tsx \
        packages/ui/ui-theme/src/css/components/button.css \
        packages/ui/react-ui/src/components/Message/Message.stories.tsx
git commit -m "feat(react-ui): Message-button valence inheritance via CSS custom properties"
```

---

## Task 7: Fix `CreateObjectDialog` form nesting

**Files:**
- Modify: `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx`

**Root cause:** `Dialog.Body` propagates its column grid with `withColumn.propagate()`. `CreateObjectPanel` is the direct child of `Dialog.Body`. When it returns `<Form.Root>`, `Form.Root` renders a DOM element that does not carry the column-span classes needed to join the grid — so `Form.Viewport` then creates its own nested `Column.Root` instead of flowing into the dialog's column.

**Fix:** wrap the `Form.Root` return in `CreateObjectPanel`'s `inputSchema` branch with the column-propagation classes (same pattern `Form.Viewport` uses for itself), making `Form.Root` span the full grid width. This avoids hoisting form state into `CreateObjectDialog` while aligning the form column with the dialog's.

- [ ] **Edit** `CreateObjectPanel.tsx`. Change the `inputSchema` branch (currently lines ~116–130) to wrap `Form.Root` in a `<div>` carrying the column-propagation:

```tsx
  if (metadata.inputSchema) {
    return (
      <div className='[.dx-column-root_&]:col-span-full [.dx-column-root_&]:grid [.dx-column-root_&]:grid-cols-subgrid'>
        <Form.Root
          autoFocus
          schema={inputSchema}
          defaultValues={initialFormValues}
          fieldProvider={inputSurfaceLookup}
          db={Obj.isObject(target) ? Obj.getDatabase(target) : target}
          onSave={handleCreateObject}
          testId='create-object-form'
        >
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
              <Form.Submit />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </div>
    );
  }
```

- [ ] **Verify the `SelectType` and `SelectSpace` branches are untouched** (they don't go through Column):
```bash
grep -n "SelectType\|SelectSpace\|SearchList" packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx | head -10
```
Expected: the `SelectType` and `SelectSpace` return paths are unchanged.

- [ ] **Build plugin-space:**
```bash
moon run plugin-space:build 2>&1 | tail -20
```
Expected: succeeds.

- [ ] **Commit:**
```bash
git add packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx
git commit -m "fix(plugin-space): CreateObjectPanel form participates in Dialog.Body column grid"
```

---

## Task 8: Lint and build check

- [ ] **Run linter across all changed packages:**
```bash
moon run ui-theme:lint react-ui:lint plugin-space:lint -- --fix 2>&1 | tail -30
```
Expected: exits 0 or only pre-existing warnings.

- [ ] **Run tests for affected packages:**
```bash
moon run ui-theme:test react-ui:test 2>&1 | tail -30
```
Expected: all pass.

- [ ] **Audit diff for any casts introduced:**
```bash
git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```
Expected: no matches (the `as React.CSSProperties` casts in Message.tsx are the only ones — these are legitimate type-system boundaries for CSS custom properties, which TypeScript's `CSSProperties` doesn't include by default).

- [ ] **Stage any lint-fixed files and commit if needed:**
```bash
git status
# If files modified by --fix:
git add -p
git commit -m "chore: lint fixes after elevation remap"
```

---

## Task 9: Rewrite `DESIGN_SYSTEM.md`

**Files:**
- Modify: `packages/ui/ui-theme/src/css/DESIGN_SYSTEM.md`

- [ ] **Edit the Naming convention section.** Find the `part` bullet list and remove `fill` — the hue roles are `bg / bg-hover / surface / fg / text / border`. The updated list:

```markdown
- **`part`** is one of a fixed vocabulary:
  - `surface` — the background fill of a thing.
  - `fg` — the text/icon color that sits on the surface (paired with `surface`).
  - `bg` — solid attention-grabbing fill (buttons, badges, indicators); more saturated than `surface`.
  - `bg-hover` — hover state for `bg`.
  - `border` — border color on the surface.
  - `text` — text color used standalone, on the base canvas (no enclosing surface).
```

- [ ] **Replace the entire "Surfaces" section** with:

```markdown
## Surfaces

Surfaces are governed by a strict elevation ladder: **lighter = higher = closer to the viewer** in dark
mode; inverted toward white in light mode. Every named surface token is an alias of exactly one
`--dx-elevation-N` level. Never set a surface to a raw scale value — pick the level that matches the
role and point the token there.

| Level | Name     | Dark      | Light    | Named surfaces                                     |
| ----- | -------- | --------- | -------- | -------------------------------------------------- |
| 0     | `void`   | `n-950`   | `n-200`  | scrim base, window gaps                            |
| 1     | `rail`   | `n-900`   | `n-175`  | `l0-surface` (icon rail)                           |
| 2     | `chrome` | `n-875`   | `n-150`  | `sidebar-surface`, `header-surface`, `l1-surface`, `r0-surface`, `r1-surface` |
| 3     | `canvas` | `n-850`   | `n-125`  | `base-surface`, `deck-surface`                     |
| 4     | `raised` | `n-825`   | `n-100`  | `card-surface`, `group-surface`, `input-surface`   |
| 5     | `bar`    | `n-800`   | `n-75`   | `toolbar-surface` (sticky, drop-shadowed)          |
| 6     | `modal`  | `n-775`   | `n-50`   | `modal-surface` (dialogs)                          |
| 7     | `float`  | `n-750`   | `white`  | `popover-surface` (menus, popovers, toasts, tooltips) |

The primitive `--dx-elevation-0…7` is defined in `semantic.css` using `light-dark()`. Raw scale values
(`n-*`) are in `palette.css` — the docs table above is for human reference only.

### Visual hierarchy (dark)

```
popover/float   n-750  ↑ highest / closest to viewer
modal/dialog    n-775
toolbar         n-800  (sticky bar; content passes beneath)
card/raised     n-825
canvas/deck     n-850
chrome/sidebar  n-875
rail/L0         n-900
void            n-950  ↓ lowest
```
```

- [ ] **Add an "Elevation primitive" section** immediately after "Surfaces":

```markdown
## Elevation primitive

The `--dx-elevation-0…7` custom properties in `semantic.css` are the single source of truth. They are
private (`--dx-*` prefix) — never use them directly in component CSS; use the named surface tokens
(`bg-card-surface`, `dx-modal-surface`, etc.) instead.

When adding a new surface:

1. Decide which elevation level the new surface belongs to (see the table above).
2. Add `--color-<name>-surface: var(--dx-elevation-N);` in the `Surfaces` block of `semantic.css`.
3. Add a matching `--color-<name>-fg` if text/icons will sit on it.
4. If the surface needs a utility class (like `dx-modal-surface`), add it to `surface.css`.
```

- [ ] **Update "Adding a new token" step 1** to read:

```markdown
1. Does an existing semantic token already cover it? For a new named surface, check the elevation
   ladder first — the new surface probably fits an existing level and should alias `--dx-elevation-N`
   rather than a raw scale value.
```

- [ ] **Commit:**
```bash
git add packages/ui/ui-theme/src/css/DESIGN_SYSTEM.md
git commit -m "docs(ui-theme): rewrite DESIGN_SYSTEM.md — elevation ladder, drop fill role"
```

---

## Task 10: Push and CI check

- [ ] **Push branch:**
```bash
git push -u origin claude/compassionate-mclaren-b485af
```

- [ ] **Check CI:**
```bash
gh run list --branch claude/compassionate-mclaren-b485af --limit 5 --workflow "Check"
```
Wait ~5 min then re-run until `status=completed`. If `conclusion=failure`:
```bash
gh run view <run-id> --log-failed 2>&1 | head -60
```
Fix root cause, commit, push.
