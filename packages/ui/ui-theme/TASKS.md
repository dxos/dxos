# UI Theme

## Goals

- Thoroughly research the @dxos/ui-theme system.
- Create a plan to simplify this overly complicated tailwind theme.

## Plan

### Phase 1

- [x] Document how semantic tokens are generated
- [x] Create a list of all custom semantic tokens
- [x] List and very concisely docment the external util functions used from `@ch-ui`

## Semantic Tokens Generation

The semantic token system uses a three-layer architecture from `@ch-ui/tokens`:

1. **Physical Layer** (`physical-colors.ts`): Defines base color palettes using LCH color space
   - Hue palettes (17 colors: red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose)
   - System palettes (neutral, primary) with specific keyPoints [lightness, chroma, hue]
   - Supports multiple gamuts (srgb, p3, rec2020)

2. **Semantic Layer** (`semantic-colors.ts`): Maps physical colors to semantic meaning via "sememes"
   - Combines sememes from multiple domain files (system, calls, codemirror, hue, sheet)
   - Defines light/dark mode values as `[palette, luminosity]` or `[palette, 'luminosity/alpha']`
   - Uses cadence functions to generate consistent elevation and contrast scales

3. **Alias Layer** (`alias-colors.ts`): Creates contextual aliases that map to sememes
   - Conditions: root (default), group (sidebar/cards), modal (elevated surfaces), gridFocusStack
   - Allows same sememe to be referenced by multiple contextual names

**Generation Flow**:
- Physical colors → define hue palettes with keyPoints in LCH space
- Sememes → map [palette, value] pairs for light/dark themes
- Aliases → provide contextual names for sememes based on CSS selectors
- `adapter` from `@ch-ui/tailwind-tokens` converts this to Tailwind config

**Cadence System** (in `sememes-system.ts`):
- `elevationCadence(lightDepth, darkDepth, alpha)`: Surfaces from darker to lighter (scale 0-2)
- `contrastCadence(lightDepth, darkDepth, alpha)`: Contrast from high to low (scale 0-3)
- Generates consistent spacing of luminosity values based on predefined extrema

## Semantic Tokens List

### System Sememes (sememes-system.ts)

**Elevation Cadence** (0=base → 2=highest):
- `baseSurface`, `groupSurface`, `modalSurface`

**Contrast Cadence** (0=lowest contrast → 3=highest):
- `textInputSurfaceBase`, `textInputSurfaceGroup`, `textInputSurfaceModal`
- `inputSurfaceBase`, `inputSurfaceGroup`, `inputSurfaceModal`
- `hoverSurfaceBase`, `hoverSurfaceGroup`, `hoverSurfaceModal`
- `separatorBase`, `separatorGroup`, `separatorModal`, `subduedSeparator`
- `scrollbarTrack`, `scrollbarThumbSubdued`, `scrollbarThumb`, `scrollbarThumbHover`, `scrollbarThumbActive`

**Text/Foreground**:
- `baseText`, `inverseSurfaceText`, `description`, `subdued`, `placeholder`
- `accentText`, `accentSurfaceText`, `accentTextHover`
- `accentFocusIndicator`, `neutralFocusIndicator`

**Special Surfaces**:
- `scrimSurface`, `focusSurface`, `deckSurface`, `inverseSurface`
- `accentSurfaceRelated`, `accentSurfaceHover`, `accentSurface`
- `unAccent`, `unAccentHover`, `hoverOverlay`

**System Aliases** (defined in aliasDefs):
- `activeSurface`, `sidebarSurface`, `headerSurface`, `toolbarSurface`, `cardSurface`
- `textInputSurface`, `inputSurface`, `hoverSurface`, `attention`, `currentRelated`, `separator`

### Hue Sememes (sememes-hue.ts)
Generated for each hue palette (neutral, primary, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose):
- `{hue}Cursor`, `{hue}Text`, `{hue}Fill`, `{hue}Surface`, `{hue}SurfaceText`, `{hue}Screen`

**Valence Aliases**:
- `success*`  → `emerald*`
- `info*`     → `cyan*`
- `warning*`  → `amber*`
- `error*`    → `rose*`
- `current*`  → `primary*`
- `internal*` → `fuchsia*`

### Calls Sememes (sememes-calls.ts)
- `callActive`, `callAlert`

### CodeMirror Sememes (sememes-codemirror.ts)
- `cmCodeblock`, `cmActiveLine`, `cmSeparator`, `cmCursor`, `cmSelection`, `cmFocusedSelection`
- `cmHighlight`, `cmHighlightSurface`, `cmCommentText`, `cmCommentSurface`

### Sheet Sememes (sememes-sheet.ts)
- `axisSurface`, `axisText`, `axisSelectedSurface`, `axisSelectedText`
- `gridCell`, `gridCellSelected`, `gridOverlay`, `gridSelectionOverlay`, `gridHighlight`
- `gridCommented`, `gridCommentedActive`

**Sheet Aliases**:
- `activeSurface`         → `gridLine`
- `accentFocusIndicator`  → `gridFocusIndicatorColor`

## Utils @ch-ui

### From `@ch-ui/tokens`:
- **Types**: `TokenSet`, `Facet`, `SemanticLayer`, `AliasLayer`, `HelicalArcValue`, `ColorsPhysicalLayer`, `LinearPhysicalLayer`, `AccompanyingSeries`, `Gamut`, `HelicalArcSeries`, `PhysicalSeries`, `ResolvedHelicalArcSeries`
- **Functions**: `auditFacet()` - validates token configuration, `parseAlphaLuminosity()` - parses color value strings
- **PostCSS Plugin**: `chTokens({ config })` - processes custom design tokens in CSS

### From `@ch-ui/tailwind-tokens`:
- **Types**: `TailwindAdapterConfig` - configuration for adapter behavior (disposition, tokenization)
- **Default Export**: `adapter(tokenSet, config)` - converts token system to Tailwind config
  - Handles color facet with recursive tokenization
  - Extends Tailwind with borderWidth, ringWidth, ringOffsetWidth, outlineWidth, spacing from lengths facet

### From `@ch-ui/colors`:
- Imported but unused (legacy) in `sememes-system.ts`

### Adapter Config Options:
- `facet`: which token facet to use (colors, lengths, maxSizes)
- `disposition`: 'overwrite' (replace Tailwind defaults) or 'extend' (add to Tailwind defaults)
- `tokenization`: 'recursive' (nested objects), 'omit-series' (flatten), 'keep-series' (preserve series structure)
