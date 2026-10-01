//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Binding, type CodeFile } from '../code-file.ts';
import { IMPORT_TARGETS, MODULES, type PackageName, hasNextExport, nextParts } from '../targets.ts';
import { LAYOUT_NAMES, layout } from './layout.ts';
import { hasRenameRule, renames } from './renames.ts';
import { THEME_NAMES, theme } from './theme.ts';
import { type Transform } from './transform.ts';

/** Reports member accesses (`Panel.Toolbar`) whose part the Next composite does not have. */
const checkParts = (file: CodeFile, ref: ts.Identifier, pkg: PackageName, name: string) => {
  const parts = nextParts(pkg, name);
  const parent = ref.parent;
  if (
    parts &&
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === ref &&
    !ts.isJsxClosingElement(parent.parent) &&
    !parts.includes(parent.name.text) &&
    !(file.ran.includes(renames.name) && hasRenameRule(pkg, `${name}.${parent.name.text}`))
  ) {
    file.report(parent, `${name}.${parent.name.text} has no Next part (run renames first, or port by hand)`);
  }
};

const rewrite = (file: CodeFile, binding: Binding, pkg: PackageName, name: string) => {
  const target = MODULES[pkg];
  const module = target.next;
  const { local, specifier } = binding;
  if (!module || !specifier) {
    return;
  }
  if (!target.namespace) {
    if (name !== binding.imported) {
      file.report(specifier, `${binding.imported} → ${name}: rename by hand`);
      return;
    }
    file.moveImport(binding, module);
    for (const ref of file.references(local)) {
      checkParts(file, ref, pkg, name);
    }
    file.count(`${binding.imported} → ${module}`);
    return;
  }

  if (file.isShadowed(local)) {
    file.report(specifier, `${local} is also declared in this file; rewrite its uses by hand`);
    return;
  }
  const refs = file.references(local);
  const exported = refs.find((ref) => ts.isExportSpecifier(ref.parent));
  if (exported) {
    file.report(exported.parent, `${local} is re-exported; re-export Next.${name} by hand`);
    return;
  }
  const namespace = file.ensureImport(module, target.namespace, binding.typeOnly);
  const text = `${namespace}.${name}`;
  for (const ref of refs) {
    checkParts(file, ref, pkg, name);
    if (ts.isShorthandPropertyAssignment(ref.parent)) {
      file.replace(ref.parent, `${local}: ${text}`);
    } else {
      file.replace(ref, text);
    }
  }
  file.removeSpecifier(specifier);
  file.count(`${binding.imported} → ${target.namespace}.${name}`);
};

/** Utility and provider types that stay on the current entry. */
const SURVIVING_TYPES = new Set([
  'ComposableProps',
  'SlottableProps',
  'ThemedClassName',
  'ThemeProviderProps',
  'ErrorBoundaryProps',
]);

/** `FooBarProps` → the Next part `Foo.Bar` (or the leaf `FooBar`) whose props it described. */
const propsSource = (pkg: PackageName, name: string): { pkg: PackageName; path: string[] } | undefined => {
  const base = name.replace(/Props$/, '');
  for (let split = base.length - 1; split > 0; split--) {
    const [composite, part] = [base.slice(0, split), base.slice(split)];
    if (nextParts(pkg, composite)?.includes(part)) {
      return { pkg, path: [composite, part] };
    }
  }
  return hasNextExport(pkg, base) ? { pkg, path: [base] } : undefined;
};

/**
 * A `*Props` type with no Next name becomes a local alias of the props of the Next part it described, so its uses are
 * untouched; each alias is reported, since the Next part's props differ from the current ones.
 */
const aliasProps = (file: CodeFile, binding: Binding) => {
  const { pkg, imported, local, specifier } = binding;
  if (!specifier || SURVIVING_TYPES.has(imported)) {
    return;
  }
  const source = propsSource(pkg, imported);
  if (!source) {
    file.report(specifier, `type ${imported} has no Next counterpart`);
    return;
  }
  if (file.references(local).some((ref) => ts.isExportSpecifier(ref.parent)) || file.isShadowed(local)) {
    file.report(specifier, `type ${imported} is re-exported or shadowed; alias it by hand`);
    return;
  }
  const part = file.nameFor(source.pkg, 'next', source.path, { typeOnly: true });
  const alias = `${file.reactType('ComponentProps')}<typeof ${part}>`;
  file.removeSpecifier(specifier);
  file.addAfterImports(`type ${local} = ${alias};`);
  file.count(`${imported} → local alias of ComponentProps`);
  file.report(specifier, `type ${imported} is now a local alias of ComponentProps<typeof ${source.path.join('.')}>`);
};

/** Names whose uses an earlier transform reported one by one, so the import says nothing more. */
const reportedPerUse = (file: CodeFile, imported: string) =>
  (file.ran.includes(layout.name) && LAYOUT_NAMES.has(imported)) ||
  (file.ran.includes(theme.name) && THEME_NAMES.has(imported));

export const imports: Transform = {
  name: 'imports',
  description: 'Current @dxos/react-ui, -list, -form and -menu imports → their Next entries.',
  applies: (text) => text.includes('@dxos/react-ui'),
  run: (file) => {
    for (const binding of [...file.bindings.values()]) {
      if (binding.form !== 'current') {
        continue;
      }
      const { pkg, imported, specifier } = binding;
      if (!specifier) {
        file.report(binding.declaration, `namespace import of ${MODULES[pkg].current}; rewrite by hand`);
        continue;
      }
      const module = MODULES[pkg];
      if (module.moveAll && module.next) {
        file.moveImport(binding, module.next);
        file.count(`${MODULES[pkg].current} → ${module.next}`);
        continue;
      }
      // A type-only `Label` is the i18n label type (ui-types), not the Label component.
      if (pkg === 'react-ui' && imported === 'Label' && binding.typeOnly) {
        continue;
      }
      const target = IMPORT_TARGETS[pkg][imported];
      if (!target) {
        if ((pkg === 'react-ui' || pkg === 'react-ui-list') && /^[A-Z]\w*Props$/.test(imported)) {
          aliasProps(file, binding);
        }
        continue;
      }
      switch (target.kind) {
        case 'none':
          if (!(reportedPerUse(file, imported) && file.references(binding.local).length > 0)) {
            file.report(specifier, `${imported}: ${target.reason}`);
          }
          break;
        case 'keep':
          break;
        case 'renames':
          if (file.references(binding.local).length === 0) {
            file.removeSpecifier(specifier);
          } else {
            file.report(specifier, `${imported} is converted by the renames transform; run it first`);
          }
          break;
        case 'next':
          rewrite(file, binding, target.pkg, target.name);
          break;
      }
    }
  },
};
