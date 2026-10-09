//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

/**
 * Scrolling regions use `@dxos/react-ui/ScrollArea`, not a raw overflow box.
 *
 * A `<div className='overflow-y-auto'>` has no themed scrollbar, does not host the bar in the end gutter, and drops
 * out of the Container gutter grid, so it reads as a working scroller while diverging from every other surface.
 *
 * Only packages that depend on `@dxos/react-ui` are checked — elsewhere there is no ScrollArea to reach for — and the
 * ScrollArea implementation itself is exempt.
 *
 * @example
 * // ❌ Bad
 * <div className='flex flex-col overflow-y-auto' />
 *
 * // ✅ Good
 * <ScrollArea.Root>
 *   <ScrollArea.Viewport asChild>
 *     <Layout.Container>…</Layout.Container>
 *   </ScrollArea.Viewport>
 * </ScrollArea.Root>
 */

const REACT_UI = '@dxos/react-ui';

/** The overflow values that make the element a scroll container. `hidden` and `clip` only clip. */
const SCROLLS = /^overflow(-[xy])?-(auto|scroll)$/;

/** Class-bearing attributes. `mx()` is this repo's class merger. */
const ATTRIBUTES = new Set(['className', 'classNames', 'class']);

/** Directories inside `@dxos/react-ui` that implement scrolling and so are allowed to spell it out. */
const IMPLEMENTATION = /\/src\/next\/components\/(ScrollArea|ScrollContainer)\//;

/** Nearest `package.json` per directory, so each file costs one lookup per new directory. */
const manifests = new Map();

const findManifest = (dir) => {
  if (manifests.has(dir)) {
    return manifests.get(dir);
  }
  const file = path.join(dir, 'package.json');
  let manifest;
  if (fs.existsSync(file)) {
    try {
      manifest = { dir, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      manifest = null;
    }
  } else {
    const parent = path.dirname(dir);
    manifest = parent === dir ? null : findManifest(parent);
  }
  manifests.set(dir, manifest);
  return manifest;
};

const usesReactUi = ({ json }) =>
  json.name === REACT_UI ||
  [json.dependencies, json.devDependencies, json.peerDependencies].some((deps) => deps && REACT_UI in deps);

/** A variant (`hover:`, `md:`, `[&>div]:`) retargets the class, so only unprefixed classes describe this element. */
const unprefixed = (className) => !className.includes(':');

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'use ScrollArea for scrolling regions instead of overflow-auto/scroll classes',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths (matched as a path suffix) exempt from the rule.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawScroll:
        '`{{className}}` makes a raw scroll box. Use `ScrollArea.Root` > `ScrollArea.Viewport` from `@dxos/react-ui/ScrollArea` so the scrollbar is themed and sits in the gutter.',
    },
  },
  create: (context) => {
    const filePath = context.filename.split(path.sep).join('/');
    const allow = context.options[0]?.allow ?? [];
    if (allow.some((entry) => filePath === entry || filePath.endsWith(`/${entry}`))) {
      return {};
    }

    const manifest = findManifest(path.dirname(path.resolve(context.filename)));
    if (!manifest || !usesReactUi(manifest)) {
      return {};
    }
    if (manifest.json.name === REACT_UI && IMPLEMENTATION.test(filePath)) {
      return {};
    }

    // A literal inside `mx()` inside a `classNames` attribute matches two of the selectors below.
    const seen = new Set();

    const checkLiteral = (node) => {
      if (seen.has(node)) {
        return;
      }
      seen.add(node);

      if (typeof node.value !== 'string') {
        return;
      }
      const className = node.value
        .split(/\s+/)
        .filter(unprefixed)
        .find((cls) => SCROLLS.test(cls));
      if (className) {
        context.report({ node, messageId: 'rawScroll', data: { className } });
      }
    };

    return {
      'JSXAttribute > Literal': (node) => {
        if (ATTRIBUTES.has(node.parent.name?.name)) {
          checkLiteral(node);
        }
      },
      'JSXAttribute JSXExpressionContainer Literal': (node) => {
        const attribute = context.sourceCode
          .getAncestors(node)
          .findLast((ancestor) => ancestor.type === 'JSXAttribute');
        if (attribute && ATTRIBUTES.has(attribute.name?.name)) {
          checkLiteral(node);
        }
      },
      'CallExpression[callee.name="mx"] Literal': checkLiteral,
    };
  },
};
