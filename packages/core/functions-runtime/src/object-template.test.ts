import { describe, expect, it } from 'vitest';

import { objectTemplate } from './object-template';

interface TestContext {
  event: {
    name: string;
    timestamp: Date;
  };
  trigger: {
    id: string;
    concurrency: number;
    spec: {
      kind: 'queue';
      queue: string;
    };
  };
  function: {
    id: string;
    name: string;
  };
}

describe('objectTemplate', () => {
  it('should build a template', () => {
    const template = objectTemplate<TestContext>((c) => ({ name: c.event.name }));
    expect(template).toEqual({ name: '{{event.name}}' });
  });

  it('should build a template with constants', () => {
    const template = objectTemplate<TestContext>((c) => ({ name: c.event.name, constant: 'constant' }));
    expect(template).toEqual({ name: '{{event.name}}', constant: 'constant' });
  });

  it('should build a template with string interpolation', () => {
    const template = objectTemplate<TestContext>((c) => ({ name: `${c.event.name}-${c.trigger.id}` }));
    expect(template).toEqual({ name: '{{event.name}}-{{trigger.id}}' });
  });

  it('should build a template with root reference', () => {
    const template = objectTemplate<TestContext>((c) => ({ root: c }));
    expect(template).toEqual({ root: '{{$}}' });
  });
});
