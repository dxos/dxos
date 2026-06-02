//
// Copyright 2026 DXOS.org
//

/**
 * PostCSS plugin: expand a compact hue/role table into `--color-<hue>-<role>` theme tokens.
 *
 * Source CSS declares (inside `@theme`):
 *
 *   @dx-hue-roles {            // default tones shared by every hue ("<light> <dark>")
 *     fill: 600 700;
 *     surface: 200 800;
 *     foreground: 500 200;
 *     text: 600 300;
 *     border: 600 600;
 *   }
 *   @dx-hue rose { foreground: 700 200; fill-hover: 800 800; }   // per-hue overrides / additions
 *   @dx-hue-palette neutral red ... rose;                        // emit point + hue list
 *   @dx-hue-alias { primary: blue; error: rose; }                // semantic name → source hue
 *
 * Each `--color-<hue>-<role>` resolves to its override tones when present, else the base tones.
 * When the light and dark tones are equal the value collapses to a single `var()`, otherwise it
 * becomes `light-dark(var(--color-<hue>-<light>), var(--color-<hue>-<dark>))`.
 *
 * `@dx-hue-alias` emits, for each `<name>: <hue>` pair, `--color-<name>-<role>: var(--color-<hue>-<role>)`
 * for every role the source hue defines — so semantic palettes stay in lockstep with their source.
 *
 * Runs inside the Vite/PostCSS pipeline (see ThemePlugin), so editing the table or overrides
 * re-expands the tokens on HMR with no rebuild.
 */

// Canonical emit order; a role is only emitted for a hue when defined in the base table or its override.
const EMIT_ORDER = ['fill', 'fill-hover', 'surface', 'foreground', 'text', 'border'];

const parseTones = (value) => value.trim().split(/\s+/);

const toValue = (hue, tones) => {
  const [light, dark = light] = tones;
  return light === dark
    ? `var(--color-${hue}-${light})`
    : `light-dark(var(--color-${hue}-${light}), var(--color-${hue}-${dark}))`;
};

const dxHueRoles = () => ({
  postcssPlugin: 'dx-hue-roles',
  Once(root, { postcss }) {
    let paletteNode = null;
    let aliasNode = null;
    let hues = [];
    const aliases = [];
    const base = {};
    const overrides = {};
    const toRemove = [];

    root.walkAtRules((atRule) => {
      switch (atRule.name) {
        case 'dx-hue-roles': {
          atRule.walkDecls((decl) => {
            base[decl.prop] = parseTones(decl.value);
          });
          toRemove.push(atRule);
          break;
        }
        case 'dx-hue': {
          const hue = atRule.params.trim();
          const map = (overrides[hue] ??= {});
          atRule.walkDecls((decl) => {
            map[decl.prop] = parseTones(decl.value);
          });
          toRemove.push(atRule);
          break;
        }
        case 'dx-hue-palette': {
          hues = atRule.params.split(/[\s,]+/).filter(Boolean);
          paletteNode = atRule;
          break;
        }
        case 'dx-hue-alias': {
          atRule.walkDecls((decl) => {
            aliases.push([decl.prop, decl.value.trim()]);
          });
          aliasNode = atRule;
          break;
        }
        default:
          break;
      }
    });

    if (!paletteNode) {
      return;
    }

    // Roles defined for a given hue, in canonical order.
    const rolesFor = (hue) => EMIT_ORDER.filter((role) => (overrides[hue] ?? {})[role] ?? base[role]);

    // Generated tokens are wrapped in their own `@theme` block: the directives must live at the
    // top level (Tailwind's `@theme` parser rejects non-custom-property at-rules), but the emitted
    // `--color-*` tokens must sit inside `@theme` to register as Tailwind theme values.
    const theme = postcss.atRule({ name: 'theme', raws: { afterName: ' ', between: '', semicolon: true } });

    for (const hue of hues) {
      for (const role of rolesFor(hue)) {
        const tones = (overrides[hue] ?? {})[role] ?? base[role];
        theme.append(postcss.decl({ prop: `--color-${hue}-${role}`, value: toValue(hue, tones) }));
      }
    }

    for (const [name, hue] of aliases) {
      for (const role of rolesFor(hue)) {
        theme.append(postcss.decl({ prop: `--color-${name}-${role}`, value: `var(--color-${hue}-${role})` }));
      }
    }

    paletteNode.replaceWith(theme);
    toRemove.forEach((node) => node.remove());
    if (aliasNode) {
      aliasNode.remove();
    }
  },
});

dxHueRoles.postcss = true;

export default dxHueRoles;
