//
// Copyright 2026 DXOS.org
//

'use strict';

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The canonical shape: `<root>.operation.<domain>.<verbNoun>`.
 *
 * `<domain>` is the defining package, which is what makes this checkable at all — a rule can read
 * package.json, where a judgement like "name it after the subject" could never be verified.
 */
const KEY_RE = /^(org\.dxos|com\.example|org\.example)\.operation\.([a-z][a-zA-Z0-9]*)\.([a-z][a-zA-Z0-9]*)$/;

/** A fixture may omit the domain — `com.example.operation.fib` names no package and owns none. */
const FIXTURE_KEY_RE = /^(com\.example|org\.example)\.operation\.([a-z][a-zA-Z0-9]*)(\.[a-z][a-zA-Z0-9]*)*$/;

/**
 * Verbs enforced strictly. Anything outside the list is reported as unknown rather than wrong: an
 * exhaustive dictionary would rot, and the shape is still checked by the camelCase split above.
 */
const VERBS = new Set([
  'accept',
  'add',
  'adjust',
  'analyze',
  'append',
  'apply',
  'archive',
  'assign',
  'attach',
  'bind',
  'build',
  'cancel',
  'capture',
  'classify',
  'clear',
  'clone',
  'close',
  'collect',
  'complete',
  'connect',
  'convert',
  'copy',
  'crawl',
  'create',
  'curate',
  'delegate',
  'delete',
  'deploy',
  'disable',
  'disconnect',
  'download',
  'draft',
  'draw',
  'drop',
  'duplicate',
  'edit',
  'emit',
  'enable',
  'enrich',
  'ensure',
  'exec',
  'expose',
  'export',
  'extract',
  'fetch',
  'find',
  'fork',
  'format',
  'generate',
  'get',
  'grant',
  'group',
  'handle',
  'hide',
  'import',
  'insert',
  'inspect',
  'install',
  'invoke',
  'join',
  'link',
  'list',
  'load',
  'log',
  'make',
  'mark',
  'materialize',
  'merge',
  'migrate',
  'mount',
  'move',
  'navigate',
  'normalize',
  'open',
  'parse',
  'pause',
  'ping',
  'plan',
  'play',
  'print',
  'probe',
  'process',
  'promote',
  'publish',
  'pull',
  'push',
  'query',
  'randomize',
  'read',
  'rebuild',
  'record',
  'recover',
  'redeem',
  'refresh',
  'register',
  'reject',
  'relay',
  'reload',
  'remove',
  'rename',
  'render',
  'reset',
  'research',
  'resolve',
  'respond',
  'restore',
  'retry',
  'retrieve',
  'revert',
  'revoke',
  'run',
  'save',
  'scaffold',
  'scan',
  'schedule',
  'scroll',
  'search',
  'select',
  'send',
  'set',
  'share',
  'show',
  'sleep',
  'snapshot',
  'sort',
  'start',
  'stop',
  'stub',
  'submit',
  'suggest',
  'summarize',
  'switch',
  'sync',
  'track',
  'transcribe',
  'translate',
  'unsubscribe',
  'update',
  'upload',
  'verify',
  'wait',
  'watch',
  'write',
]);

/** A verb ending here reads as a fragment: `convertTo` passes every other check and means nothing. */
const PREPOSITIONS = new Set(['to', 'from', 'with', 'for', 'in', 'on', 'at', 'by', 'of', 'into', 'onto']);

const words = (verb) => verb.match(/[A-Z]?[a-z0-9]+/g) ?? [];

/** Package short name, which is the domain: `@dxos/plugin-markdown` is `markdown`. */
const domainOf = (name) => {
  const short = name.replace(/^@dxos\//, '').replace(/^plugin-/, '');
  const [head, ...rest] = short.split('-');
  return head + rest.map((part) => part[0].toUpperCase() + part.slice(1)).join('');
};

const packageCache = new Map();

const packageDomain = (filePath) => {
  let dir = dirname(filePath);
  for (let depth = 0; depth < 12; depth++) {
    if (packageCache.has(dir)) {
      return packageCache.get(dir);
    }
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      let domain = null;
      try {
        const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
        domain = name ? domainOf(name) : null;
      } catch {
        domain = null;
      }
      packageCache.set(dir, domain);
      return domain;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
};

/** A fixture is not part of the product surface and must not squat a real namespace. */
const isFixture = (filePath) =>
  /\.test\.tsx?$/.test(filePath) ||
  /\.tst\.tsx?$/.test(filePath) ||
  /\.stories\.tsx?$/.test(filePath) ||
  filePath.includes('/testing/') ||
  filePath.includes('/playground/') ||
  filePath.includes('/templates/') ||
  /\/test-[^/]+\.tsx?$/.test(filePath) ||
  filePath.endsWith('/testing.ts') ||
  filePath.includes('-testing/');

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Operation keys are `<root>.operation.<package>.<verbNoun>`, written as a literal so a key can be found by searching for it.',
    },
    messages: {
      notLiteral:
        'Operation key must be a string literal, not built by a helper — otherwise the key cannot be found by searching for it.',
      badShape: 'Operation key "{{key}}" must match `<root>.operation.<package>.<verbNoun>`.',
      wrongDomain: 'Operation key "{{key}}" must use the defining package as its domain: expected "{{domain}}".',
      fixtureRoot:
        'An operation defined in a test, story or testing/ file must use the `com.example` root, not "{{key}}".',
      productRoot: 'A product operation must not use an example root: "{{key}}".',
      stutter: 'Operation verb "{{verb}}" repeats its domain "{{domain}}"; the domain is already in the tool name.',
      preposition: 'Operation verb "{{verb}}" ends in a preposition, which reads as a fragment.',
      unknownVerb: 'Operation verb "{{verb}}" does not start with a known verb; operations read verb-first.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename ?? context.physicalFilename ?? '';
    const fixture = isFixture(filename);

    /**
     * Resolves a bare identifier to the string a module-scope `const` initialises it with, so a
     * `const KEY = '...'` indirection is still held to the shape rules — the key is greppable, it
     * is just named once. Anything the scope analysis cannot pin down stays unresolved.
     */
    const literalOf = (node) => {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      }
      if (node.type !== 'Identifier') {
        return undefined;
      }
      const scope = context.sourceCode.getScope(node);
      const variable = scope.references.find((ref) => ref.identifier === node)?.resolved;
      const [definition] = variable?.defs ?? [];
      if (definition?.type !== 'Variable' || definition.parent?.kind !== 'const') {
        return undefined;
      }
      const init = definition.node.init;
      return init?.type === 'Literal' && typeof init.value === 'string' ? init.value : undefined;
    };

    const check = (node, key) => {
      // A fixture is held only to its root: it names no package, so it owns no domain, and the
      // shape of a throwaway key is not worth a failing build.
      if (fixture) {
        if (!FIXTURE_KEY_RE.test(key)) {
          context.report({ node, messageId: 'fixtureRoot', data: { key } });
        }
        return;
      }

      const match = KEY_RE.exec(key);
      if (!match) {
        context.report({ node, messageId: 'badShape', data: { key } });
        return;
      }

      const [, root, domain, verb] = match;
      if (root !== 'org.dxos') {
        context.report({ node, messageId: 'productRoot', data: { key } });
        return;
      }

      const expected = packageDomain(filename);
      if (expected && domain !== expected) {
        context.report({ node, messageId: 'wrongDomain', data: { key, domain: expected } });
      }

      const parts = words(verb);
      const head = parts[0]?.toLowerCase();
      if (head && !VERBS.has(head)) {
        context.report({ node, messageId: 'unknownVerb', data: { verb } });
      }
      if (parts.length > 1 && PREPOSITIONS.has(parts[parts.length - 1].toLowerCase())) {
        context.report({ node, messageId: 'preposition', data: { verb } });
      }
      const bare = (word) => word.toLowerCase().replace(/s$/, '');
      if (parts.slice(1).some((word) => bare(word) === bare(domain))) {
        context.report({ node, messageId: 'stutter', data: { verb, domain } });
      }
    };

    return {
      // `meta: { key: ... }` inside an `Operation.make({ ... })` call.
      Property(node) {
        if (
          node.key?.type !== 'Identifier' ||
          node.key.name !== 'key' ||
          !node.parent ||
          node.parent.type !== 'ObjectExpression'
        ) {
          return;
        }

        // The enclosing object must be the `meta` of an Operation.make call.
        const metaProperty = node.parent.parent;
        if (
          metaProperty?.type !== 'Property' ||
          metaProperty.key?.type !== 'Identifier' ||
          metaProperty.key.name !== 'meta'
        ) {
          return;
        }
        const call = metaProperty.parent?.parent;
        const callee = call?.type === 'CallExpression' ? call.callee : undefined;
        const isOperationMake =
          callee?.type === 'MemberExpression' &&
          callee.object?.type === 'Identifier' &&
          callee.object.name === 'Operation' &&
          callee.property?.type === 'Identifier' &&
          callee.property.name === 'make';
        if (!isOperationMake) {
          return;
        }

        const value = node.value;
        // `DXN.make('...')` with a literal, which is the only accepted form.
        if (
          value.type === 'CallExpression' &&
          value.callee?.type === 'MemberExpression' &&
          value.callee.property?.type === 'Identifier' &&
          value.callee.property.name === 'make' &&
          value.arguments.length >= 1
        ) {
          const arg = value.arguments[0];
          const key = literalOf(arg);
          if (key !== undefined) {
            check(arg, key);
          } else if (!fixture) {
            context.report({ node: arg, messageId: 'notLiteral' });
          }
          return;
        }

        // Anything else — a helper call or a template literal — hides the key.
        const key = literalOf(value);
        if (key !== undefined) {
          check(value, key);
        } else if (!fixture) {
          context.report({ node: value, messageId: 'notLiteral' });
        }
      },
    };
  },
};
