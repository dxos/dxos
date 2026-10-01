//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Binding, type CodeFile } from '../code-file.ts';
import { IMPORT_TARGETS, MODULES, type PackageName, nextParts } from '../targets.ts';
import { hasRenameRule, renames } from './renames.ts';
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
      const target = IMPORT_TARGETS[pkg][imported];
      if (!target) {
        if ((pkg === 'react-ui' || pkg === 'react-ui-list') && /^[A-Z]\w*Props$/.test(imported)) {
          file.report(specifier, `type ${imported} has no Next counterpart`);
        }
        continue;
      }
      switch (target.kind) {
        case 'none':
          file.report(specifier, `${imported}: ${target.reason}`);
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
