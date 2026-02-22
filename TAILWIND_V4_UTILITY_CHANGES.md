# Tailwind CSS v4 Utility Changes Summary

## Overview
This document summarizes utility class changes in Tailwind CSS v4 that may require codebase updates.

## Breaking Changes

### 1. Removed Deprecated Utilities

#### Box Decoration Utilities (RENAMED)
- **Removed**: `decoration-slice`, `decoration-clone`
- **Replacement**: Use `box-decoration-slice` and `box-decoration-clone` instead
- **Impact**: ✅ **None found** - Codebase scan found no usage of these utilities

#### Filter Utilities (REMOVED)
- **Removed**: `filter`, `backdrop-filter`
- **Reason**: Modern browsers support filter properties without prefixes
- **Migration**: These utilities can be safely removed from markup
- **Impact**: ✅ **None found** - Codebase scan found no usage of these utilities

### 2. Arbitrary Value Syntax Changes

#### CSS Variables in Arbitrary Values
**Before (v3):**
```html
<div class="bg-[--my-color]">
```

**After (v4):**
```html
<div class="bg-[var(--my-color)]">
```

**Impact**: Must explicitly use `var()` wrapper for CSS variable references in arbitrary values.

#### Comma Handling in Arbitrary Values
**Before (v3):**
```html
<!-- Commas were automatically converted to spaces in certain utilities -->
<div class="grid-cols-[repeat(3,1fr)]">
```

**After (v4):**
```html
<!-- Use underscores to represent spaces -->
<div class="grid-cols-[repeat(3_1fr)]">
```

**Affected Utilities**: `grid-cols-*`, `grid-rows-*`, `object-*`

**Impact**: ⚠️ **Requires manual review** - Scan found 44 files with arbitrary value syntax; these need individual review for:
- CSS variable usage without `var()`
- Comma usage in grid/object utilities

### 3. Preflight (Base Styles) Changes

#### Placeholder Text Color
**Before (v3):**
- Used configured `gray-400` color by default

**After (v4):**
- Uses current text color at 50% opacity

**Impact**: Visual change - placeholder text will inherit text color instead of using gray.

#### Button Cursor
**Before (v3):**
- `cursor: pointer` on buttons

**After (v4):**
- `cursor: default` on buttons (matches native browser behavior)

**Impact**: Visual/UX change - buttons no longer show pointer cursor by default.

## New Features

### Color Palette Update
- Default palette upgraded from RGB to OKLCH color space
- Wider color gamut for more vivid colors
- May cause subtle visual differences in default theme colors

### Performance Improvements
- Full rebuilds: 3.5x faster
- Incremental builds: 8x faster
- Our migration achieved: ~4.5x faster (62.7s → 13.8s)

## Migration Audit Results

### ✅ Passed Checks
1. **No deprecated box-decoration utilities** (`decoration-slice`, `decoration-clone`)
2. **No removed filter utilities** (`filter`, `backdrop-filter`)
3. **Build successful** with Tailwind v4.2.0
4. **Linter passed** with no Tailwind-related issues

### ⚠️ Manual Review Required

#### 1. CSS Variables Without `var()` Wrapper

**Files requiring updates:**

1. `/packages/ui/ui-theme/src/styles/fragments/dimension.ts:8`
   ```typescript
   // BEFORE (v3):
   export const textBlockWidth = 'is-full mli-auto max-is-[--text-content]';

   // AFTER (v4):
   export const textBlockWidth = 'is-full mli-auto max-is-[var(--text-content)]';
   ```

2. `/packages/ui/ui-theme/src/styles/components/menu.ts:16`
   ```typescript
   // BEFORE (v3):
   mx('rounded p-1 max-bs-[--radix-dropdown-menu-content-available-height] overflow-y-auto', ...etc);

   // AFTER (v4):
   mx('rounded p-1 max-bs-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto', ...etc);
   ```

**Search for all occurrences:**
```bash
grep -rn '\[[^v][^a][^r]--[a-zA-Z0-9-_]*\]' packages/ui/ui-theme/src/styles/ --include="*.ts"
```

#### 2. Grid Track List Commas (Need Underscores)

**Files requiring updates:**

1. `/packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:66`
   ```tsx
   // BEFORE (v3):
   <div className='grid grid-cols-[1fr,360px] is-full bs-full'>

   // AFTER (v4):
   <div className='grid grid-cols-[1fr_360px] is-full bs-full'>
   ```

2. `/packages/ui/react-ui-canvas-compute/src/shapes/Queue.tsx:66`
   ```tsx
   // BEFORE (v3):
   <div className={mx('grid grid-cols-[80px,1fr]', classNames)}>

   // AFTER (v4):
   <div className={mx('grid grid-cols-[80px_1fr]', classNames)}>
   ```

3. `/packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:125`
   ```tsx
   // BEFORE (v3):
   <div className='grid grid-cols-[1fr,360px] is-full bs-full'>

   // AFTER (v4):
   <div className='grid grid-cols-[1fr_360px] is-full bs-full'>
   ```

**Note**: Commas inside CSS functions like `repeat()` and `minmax()` should remain unchanged.

**Examples of CORRECT usage (no changes needed):**
- `grid-cols-[repeat(6,min-content)]` ✅ (comma inside `repeat()`)
- `grid-cols-[minmax(min-content,1fr)_3fr]` ✅ (comma inside `minmax()`, underscore between tracks)
- `grid-cols-[var(--rail-item)_minmax(0,1fr)]` ✅ (underscore between tracks)

**Search for problematic patterns:**
```bash
# Find grid utilities with comma-separated track lists (not inside functions)
grep -rn 'grid-cols-\[[0-9a-z]*,[0-9a-z]*\]' packages/ --include="*.tsx" --include="*.ts"
```

## Testing Recommendations

### Visual Regression Testing
1. **Placeholder text**: Check forms and inputs for placeholder color changes
2. **Button cursors**: Verify button hover states across the application
3. **Color palette**: Review default theme colors for OKLCH changes

### Functional Testing
1. Run full test suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`
2. Visual QA in Storybook: Check all component stories
3. Cross-browser testing: Verify Safari 16.4+, Chrome 111+, Firefox 128+

### Performance Verification
1. Measure build times before/after
2. Verify incremental rebuild performance during development
3. Check production bundle sizes

## Additional Resources

- [Official Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4)
- [Automated Upgrade Tool](https://github.com/tailwindlabs/tailwindcss/tree/next/packages/%40tailwindcss/upgrade)

## Migration Status

- ✅ Dependencies updated to v4.2.0
- ✅ Configuration migrated to CSS-based approach
- ✅ Build successful and 4.5x faster
- ✅ No deprecated utilities found in codebase
- ❌ **REQUIRED**: CSS variable syntax fixes (2 files)
- ❌ **REQUIRED**: Grid track list comma fixes (3 files)
- ⚠️ Visual regression testing pending
- ⚠️ Full test suite pending

## Required Actions

### Immediate (Blocking)

1. **Fix CSS variable syntax in arbitrary values** (2 files):
   - `packages/ui/ui-theme/src/styles/fragments/dimension.ts:8`
   - `packages/ui/ui-theme/src/styles/components/menu.ts:16`

   **Command to find all occurrences:**
   ```bash
   cd /Users/burdon/Code/dxos/dxos-tailwind-v4
   grep -rn '\[[^v][^a][^r]--[a-zA-Z0-9-_]*\]' packages/ui/ui-theme/src/styles/ --include="*.ts"
   ```

2. **Fix grid track list commas** (3 files):
   - `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:66`
   - `packages/ui/react-ui-canvas-compute/src/shapes/Queue.tsx:66`
   - `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:125`

   **Command to find all occurrences:**
   ```bash
   grep -rn 'grid-cols-\[[0-9a-z]*,[0-9a-z]*\]' packages/ --include="*.tsx" --include="*.ts"
   ```

### Testing (Before Merge)

3. **Run full test suite:**
   ```bash
   MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
   ```

4. **Run pre-CI checks:**
   ```bash
   pnpm -w pre-ci
   ```

5. **Visual regression testing:**
   - Start Storybook and visually verify component styles
   - Check placeholder text colors in forms
   - Verify button cursor behavior
   - Review default color palette changes

6. **Cross-browser verification:**
   - Safari 16.4+
   - Chrome 111+
   - Firefox 128+
