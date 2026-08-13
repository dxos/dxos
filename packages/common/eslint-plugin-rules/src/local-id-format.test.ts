//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/local-id-format.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('local-id-format', () => {
  it('rejects ids the runtime would silently drop', () => {
    ruleTester.run('local-id-format', rule, {
      valid: [
        "Surface.create({ id: 'article.taskSet', component: C });",
        "Surface.create({ id: 'pluginSettings', component: C });",
        "GraphBuilder.createExtension({ id: 'projectChats' });",
        "createExtension({ id: 'mailboxProjectActions' });",
        "createExtensionRaw({ id: 'spaceActions' });",
        // Only the final segment is constrained; a dotted prefix may carry a typename.
        "Surface.create({ id: 'org.dxos.type.task-set.article', component: C });",
        // A computed or non-literal id is out of the rule's reach.
        'Surface.create({ id: someId, component: C });',
        // Unrelated `create` calls keep their own naming.
        "Obj.create({ id: 'some-id' });",
        "create({ id: 'some-id' });",
      ],
      invalid: [
        {
          // The bug this rule exists for: the TaskSet surface never reached the ProjectArticle.
          code: "Surface.create({ id: 'article.task-set', component: C });",
          output: "Surface.create({ id: 'article.taskSet', component: C });",
          errors: [{ messageId: 'invalidLocalId' }],
        },
        {
          code: "Surface.create({ id: 'plugin-settings', component: C });",
          output: "Surface.create({ id: 'pluginSettings', component: C });",
          errors: [{ messageId: 'invalidLocalId' }],
        },
        {
          code: "GraphBuilder.createExtension({ id: 'project_chats' });",
          output: "GraphBuilder.createExtension({ id: 'projectChats' });",
          errors: [{ messageId: 'invalidLocalId' }],
        },
        {
          code: "createExtensionRaw({ id: 'gallery-article' });",
          output: "createExtensionRaw({ id: 'galleryArticle' });",
          errors: [{ messageId: 'invalidLocalId' }],
        },
      ],
    });
  });
});
