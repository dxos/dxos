//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultTemplates } from '../templates';

// The create dialog's custom panel and the per-object companion both read templates from the
// `AutomationCapabilities.Template` capability, which plugin-automation seeds with `defaultTemplates`.
// The full create-object → SpaceOperation.AddObject path is exercised by the app e2e (the UI plugin
// variant can't boot in the headless node harness), so here we assert the template the flow depends on.
describe('Automation create templates', () => {
  test('ships a Blank no-op template', ({ expect }) => {
    const blank = defaultTemplates.find((template) => template.id === 'org.dxos.automation.blank');
    expect(blank).toBeDefined();
    expect(blank!.label).toBe('Blank');
    expect(typeof blank!.scaffold).toBe('function');
  });
});
