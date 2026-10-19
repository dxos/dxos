//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import path from 'node:path';
import { describe, it } from 'vitest';

import rule from '../rules/folder-barrel-imports.js';

// The rule is path-only, so the files need not exist.
const src = path.join(path.sep, 'repo', 'packages', 'pkg', 'src');
const file = (...parts: string[]) => path.join(src, ...parts);

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('folder-barrel-imports', () => {
  it('allows same-folder files, child barrels, ancestor files and cross-folder barrels', () => {
    ruleTester.run('folder-barrel-imports', rule, {
      valid: [
        // Same folder.
        { filename: file('components', 'Canvas', 'Canvas.tsx'), code: "import { a } from './useSceneKeys.ts';" },
        // A direct child's barrel.
        { filename: file('components', 'index.ts'), code: "export * from './Canvas/index.ts';" },
        // An ancestor's own file (lexical scope).
        {
          filename: file('components', 'inspectors', 'LayersInspector', 'LayersInspector.tsx'),
          code: "import { type InspectorProps } from '../types.ts';",
        },
        // Across: the barrel of the first folder below the common ancestor.
        {
          filename: file('components', 'Canvas', 'Canvas.tsx'),
          code: "import { ToolsPanel } from '../panels/index.ts';",
        },
        { filename: file('components', 'Canvas', 'Canvas.tsx'), code: "import { mx } from '../../utils/index.ts';" },
        // Type-only and re-exports are checked the same way, and pass through barrels.
        { filename: file('hooks', 'useWheel.ts'), code: "import type { Camera } from '../model/index.ts';" },
        // Package imports and imports leaving `src` are out of scope.
        { filename: file('components', 'Canvas', 'Canvas.tsx'), code: "import { Button } from '@dxos/react-ui';" },
        { filename: file('index.ts'), code: "import pkg from '../package.json';" },
        // Tests and stories follow the same rule.
        { filename: file('components', 'Canvas', 'Canvas.stories.tsx'), code: "import { Canvas } from './index.ts';" },
      ],
      invalid: [
        // Into a child folder's file.
        {
          filename: file('components', 'index.ts'),
          code: "export * from './Canvas/Canvas.tsx';",
          errors: [{ messageId: 'descendant', data: { barrel: './Canvas/index.ts' } }],
        },
        // Past a child's barrel into a grandchild.
        {
          filename: file('components', 'index.ts'),
          code: "export * from './panels/ToolsPanel/index.ts';",
          errors: [{ messageId: 'descendant', data: { barrel: './panels/index.ts' } }],
        },
        // Across into a file.
        {
          filename: file('components', 'Canvas', 'useSceneKeys.ts'),
          code: "import { handlePoint } from '../ControlFrame/ControlFrame.tsx';",
          errors: [{ messageId: 'across', data: { barrel: '../ControlFrame/index.ts' } }],
        },
        // Across, past the first barrel below the common ancestor.
        {
          filename: file('components', 'Canvas', 'useSceneKeys.ts'),
          code: "import { toolForKey } from '../panels/ToolsPanel/index.ts';",
          errors: [{ messageId: 'across', data: { barrel: '../panels/index.ts' } }],
        },
        // A test is held to the same rule.
        {
          filename: file('components', 'Canvas', 'Canvas.test.ts'),
          code: "import { createTree } from '../../builder/fixtures.ts';",
          errors: [{ messageId: 'across', data: { barrel: '../../builder/index.ts' } }],
        },
        // An ancestor's barrel re-exports this folder.
        {
          filename: file('components', 'inspectors', 'LayersInspector', 'LayersInspector.tsx'),
          code: "import { InspectorMenu } from '../index.ts';",
          errors: [{ messageId: 'ancestorBarrel' }],
        },
        // Dynamic imports too.
        {
          filename: file('components', 'Canvas', 'Canvas.tsx'),
          code: "const mod = import('../panels/ToolsPanel/ToolsPanel.tsx');",
          errors: [{ messageId: 'across', data: { barrel: '../panels/index.ts' } }],
        },
      ],
    });
  });

  it('accepts every barrel stem listed in `barrels`', () => {
    ruleTester.run('folder-barrel-imports', rule, {
      valid: [
        // `testing` is a barrel by default.
        {
          filename: file('components', 'Canvas', 'Canvas.test.ts'),
          code: "import { createTree } from '../../builder/testing.ts';",
        },
        { filename: file('components', 'index.ts'), code: "export * from './Canvas/testing.tsx';" },
        // A custom stem.
        {
          filename: file('components', 'Canvas', 'Canvas.tsx'),
          code: "import { tools } from '../panels/headless.ts';",
          options: [{ barrels: ['index', 'headless'] }],
        },
      ],
      invalid: [
        // Without `testing` listed, it is just a file.
        {
          filename: file('components', 'Canvas', 'Canvas.test.ts'),
          code: "import { createTree } from '../../builder/testing.ts';",
          options: [{ barrels: ['index'] }],
          errors: [{ messageId: 'across', data: { barrel: '../../builder/index.ts' } }],
        },
        // Past the first barrel, the suggestion keeps the barrel kind.
        {
          filename: file('components', 'Canvas', 'Canvas.test.ts'),
          code: "import { createTree } from '../panels/ToolsPanel/testing.ts';",
          errors: [{ messageId: 'across', data: { barrel: '../panels/testing.ts' } }],
        },
        {
          filename: file('components', 'index.ts'),
          code: "export * from './panels/ToolsPanel/testing.ts';",
          errors: [{ messageId: 'descendant', data: { barrel: './panels/testing.ts' } }],
        },
        // Every listed stem is an ancestor barrel.
        {
          filename: file('components', 'inspectors', 'LayersInspector', 'LayersInspector.test.ts'),
          code: "import { createInspector } from '../testing.ts';",
          errors: [{ messageId: 'ancestorBarrel' }],
        },
        // A file named like a barrel is not one in a non-source extension.
        {
          filename: file('components', 'Canvas', 'Canvas.tsx'),
          code: "import styles from '../panels/index.css';",
          errors: [{ messageId: 'across', data: { barrel: '../panels/index.ts' } }],
        },
      ],
    });
  });

  it('exempts importers listed in `allow`', () => {
    const headless = "export { toolForKey } from './components/panels/ToolsPanel/tools.ts';";
    ruleTester.run('folder-barrel-imports', rule, {
      valid: [
        { filename: file('headless.ts'), code: headless, options: [{ allow: ['src/headless.ts'] }] },
        { filename: file('headless.ts'), code: headless, options: [{ allow: ['pkg/src/headless.ts'] }] },
      ],
      invalid: [
        // A suffix matches whole path segments only.
        {
          filename: file('myheadless.ts'),
          code: headless,
          options: [{ allow: ['headless.ts'] }],
          errors: [{ messageId: 'descendant', data: { barrel: './components/index.ts' } }],
        },
        // Other files stay checked.
        {
          filename: file('index.ts'),
          code: headless,
          options: [{ allow: ['src/headless.ts'] }],
          errors: [{ messageId: 'descendant', data: { barrel: './components/index.ts' } }],
        },
      ],
    });
  });
});
