//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, it } from 'vitest';

import { applyObjectTemplate, getObjectTemplateInputSchema } from './json';

describe('json template', () => {
  describe('getObjectTemplateInputSchema', () => {
    it('should extract variables from flat object', () => {
      const template = {
        name: '{{name}}',
        age: '{{age}}',
      };

      const schema = getObjectTemplateInputSchema(template);
      expect(SchemaAST.getPropertySignatures(schema.ast).map(({ name }) => name)).toEqual(['name', 'age']);
    });

    it('should extract variables from nested object', () => {
      const template = {
        person: {
          name: '{{name}}',
          details: {
            age: '{{age}}',
          },
        },
      };

      const schema = getObjectTemplateInputSchema(template);
      expect(SchemaAST.getPropertySignatures(schema.ast).map(({ name }) => name)).toEqual(['name', 'age']);
    });

    it('should handle non-string values', () => {
      const template = {
        name: '{{name}}',
        active: true,
        count: 42,
      };

      const schema = getObjectTemplateInputSchema(template);
      expect(SchemaAST.getPropertySignatures(schema.ast).map(({ name }) => name)).toEqual(['name']);
    });
  });

  describe('applyObjectTemplate', () => {
    it('should replace variables in flat object', () => {
      const template = {
        name: '{{name}}',
        greeting: 'Hello {{name}}!',
      };

      const result = applyObjectTemplate(template, { name: 'Alice' });
      expect(result).toEqual({
        name: 'Alice',
        greeting: 'Hello Alice!',
      });
    });

    it('should replace variables in nested object', () => {
      const template = {
        person: {
          name: '{{name}}',
          details: {
            age: '{{age}}',
          },
        },
      };

      const result = applyObjectTemplate(template, { name: 'Bob', age: '30' });
      expect(result).toEqual({
        person: {
          name: 'Bob',
          details: {
            age: '30',
          },
        },
      });
    });

    it('should handle standalone template variable containing an object', () => {
      const template = {
        user: '{{userObj}}',
        other: 'static',
      };

      const result = applyObjectTemplate(template, {
        userObj: {
          name: 'Alice',
          age: 30,
          address: {
            street: '123 Main St',
            city: 'Springfield',
          },
        },
      });

      expect(result).toEqual({
        user: {
          name: 'Alice',
          age: 30,
          address: {
            street: '123 Main St',
            city: 'Springfield',
          },
        },
        other: 'static',
      });
    });

    it('should handle standalone template variable containing an array', () => {
      const template = {
        items: '{{itemsList}}',
      };

      const result = applyObjectTemplate(template, {
        itemsList: [1, 2, { nested: 'value' }],
      });

      expect(result).toEqual({
        items: [1, 2, { nested: 'value' }],
      });
    });

    it('should throw error for unresolved variables', () => {
      const template = {
        name: '{{name}}',
        age: '{{age}}',
      };

      expect(() => applyObjectTemplate(template, { name: 'Dave' })).toThrow('Unresolved properties: [age]');
    });

    it('should handle mixed standalone and interpolated templates', () => {
      const template = {
        user: '{{userObj}}',
        greeting: 'Welcome {{name}}!',
        metadata: {
          tags: '{{tags}}',
        },
      };

      const result = applyObjectTemplate(template, {
        userObj: { id: 1, role: 'admin' },
        name: 'Alice',
        tags: ['important', 'featured'],
      });

      expect(result).toEqual({
        user: { id: 1, role: 'admin' },
        greeting: 'Welcome Alice!',
        metadata: {
          tags: ['important', 'featured'],
        },
      });
    });
  });
});
