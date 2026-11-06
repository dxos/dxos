//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '../extension/blocks.ts';
import { parseFields } from '../review/fields.ts';

/** What instances of a block type are to a spec (`lang/core.mdl`, Roles and Links). */
export const ROLES = ['anchor', 'structure', 'verification', 'context'] as const;
export type Role = (typeof ROLES)[number];

/** How a field's values relate the block to the blocks they name (`lang/core.mdl`, Roles and Links). */
export const RELATIONSHIPS = [
  'aggregates',
  'composes',
  'depends-on',
  'extends',
  'generalizes',
  'implements',
  'part-of',
  'references',
  'verifies',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

/** A block type's role and links, as its `ext` blocks declare them. */
export type Declaration = {
  role?: Role;
  /** Relationship by field name. */
  links: Readonly<Record<string, Relationship>>;
};

const isRole = (value: string | undefined): value is Role => ROLES.some((role) => role === value);

const isRelationship = (value: string): value is Relationship =>
  RELATIONSHIPS.some((relationship) => relationship === value);

/**
 * The block types the texts declare, by name. Later texts override earlier ones: a role replaces the earlier role and
 * links override field by field, so the spec's own text goes last. An `ext` that `extends` another declared before it
 * starts from the parent's declaration.
 */
export const declarationsOf = (texts: readonly string[]): Map<string, Declaration> => {
  const declarations = new Map<string, Declaration>();
  for (const text of texts) {
    for (const { type, id, body } of parseMdlBlocks(text)) {
      if (type !== 'ext' || !id) {
        continue;
      }
      const fields = parseFields(body);
      const parent = fields.get('extends')?.inline;
      const base = declarations.get(id) ?? (parent ? declarations.get(parent.replace(/@.*$/, '')) : undefined);
      const role = fields.get('role')?.inline;
      const links: Record<string, Relationship> = {};
      for (const line of fields.get('links')?.lines ?? []) {
        const [field, value = ''] = line.split(/:\s*/);
        const relationship = value.trim();
        if (isRelationship(relationship)) {
          links[field.trim()] = relationship;
        }
      }
      const declaredRole = isRole(role) ? role : base?.role;
      declarations.set(id, {
        ...(declaredRole && { role: declaredRole }),
        links: { ...base?.links, ...links },
      });
    }
  }
  return declarations;
};
