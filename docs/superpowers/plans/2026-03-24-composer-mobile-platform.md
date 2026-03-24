# Composer Mobile Platform Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire platform detection through ThemePlugin so components can respond to mobile context, then use it to fix font size and disable folding on mobile.

**Architecture:** The existing `ThemeProvider` already has a `platform` field in its context value (`'mobile' | 'desktop'`), but it's never populated. We add `platform` to `ThemePluginOptions`, pass it from `plugin-defs.tsx` (where `isMobile` is known), and consume it in `useExtensions` to skip folding on mobile. We also bump the mobile base font size.

**Tech Stack:** React, TypeScript, CodeMirror extensions, DXOS app-framework capabilities system

---

### Task 1: Increase mobile base font size

**Files:**
- Modify: `packages/apps/composer-app/index.html:32`

- [ ] **Step 1: Update font size**

Change the mobile default from `18px` to `20px`:

```css
html {
  font-size: 20px;
}
```

- [ ] **Step 2: Verify visually**

Run: `moon run composer-app:serve --quiet`
Open on mobile or resize to <768px and confirm larger font.

- [ ] **Step 3: Commit**

```bash
git add packages/apps/composer-app/index.html
git commit -m "fix(composer-app): increase mobile base font size to 20px"
```

---

### Task 2: Add platform to ThemePluginOptions and wire through ThemeProvider

**Files:**
- Modify: `packages/plugins/plugin-theme/src/react-context.tsx:18-51`

- [ ] **Step 1: Add `platform` to `ThemePluginOptions`**

In `react-context.tsx`, add `platform` to the options type:

```typescript
export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
  platform?: 'mobile' | 'desktop';
};
```

- [ ] **Step 2: Pass `platform` through to `<ThemeProvider>`**

In the `context` component inside `Capability.makeModule`, destructure `platform` from the closure and pass it to `ThemeProvider`:

```tsx
<ThemeProvider {...{ tx: propsTx, themeMode, resourceExtensions: resources, platform, ...rest }}>
```

Note: `platform` needs to be captured from the options parameter in the outer `Effect.fnUntraced` closure (alongside `appName`, `propsTx`, etc.) so it's available inside the React component.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-theme/src/react-context.tsx
git commit -m "feat(plugin-theme): wire platform option through to ThemeProvider"
```

---

### Task 3: Pass platform from plugin-defs to ThemePlugin

**Files:**
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx:224-227`

- [ ] **Step 1: Pass platform to ThemePlugin**

Update the `ThemePlugin()` call in `getPlugins()`:

```typescript
ThemePlugin({
  appName: 'Composer',
  noCache: isDev,
  platform: isMobile ? 'mobile' : 'desktop',
}),
```

- [ ] **Step 2: Commit**

```bash
git add packages/apps/composer-app/src/plugin-defs.tsx
git commit -m "feat(composer-app): pass mobile platform to ThemePlugin"
```

---

### Task 4: Disable folding on mobile in useExtensions

**Files:**
- Modify: `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx:36,153`

- [ ] **Step 1: Import useThemeContext**

Add `useThemeContext` to the imports:

```typescript
import { useThemeContext } from '@dxos/react-ui';
```

- [ ] **Step 2: Use platform in useExtensions hook**

Inside `useExtensions`, get the platform from theme context:

```typescript
const { platform } = useThemeContext();
```

Then pass it down to `createBaseExtensions` and use it to gate folding. In `createBaseExtensions`, change the folding line:

```typescript
settings?.folding && platform !== 'mobile' && folding(),
```

Add `platform` to the `ExtensionsOptions` type, the `createBaseExtensions` call, and the `useMemo` dependency array.

- [ ] **Step 3: Verify**

Run: `moon run plugin-markdown:build`
Confirm no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx
git commit -m "fix(plugin-markdown): disable folding on mobile platform"
```
