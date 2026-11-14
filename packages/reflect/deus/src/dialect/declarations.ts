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

/** A block type's role, links and look, as its `ext` blocks declare them. */
export type Declaration = {
  role?: Role;
  /** Relationship by field name. */
  links: Readonly<Record<string, Relationship>>;
  /** A Phosphor icon name. */
  icon?: string;
  /** A theme hue. */
  hue?: string;
};

const isRole = (value: string | undefined): value is Role => ROLES.some((role) => role === value);

const isRelationship = (value: string): value is Relationship =>
  RELATIONSHIPS.some((relationship) => relationship === value);

/**
 * The block types the texts declare, by name. Later texts override earlier ones: a role, icon or hue replaces the
 * earlier one and links override field by field, so the spec's own text goes last. An `ext` that `extends` another
 * starts from the parent's declaration, whichever text declares the parent.
 */
export const declarationsOf = (texts: readonly string[]): Map<string, Declaration> => {
  // Each type's own declaration, merged across the texts, and the parent it names.
  const own = new Map<string, Declaration & { parent?: string }>();
  for (const text of texts) {
    for (const { type, id, body } of parseMdlBlocks(text)) {
      if (type !== 'ext' || !id) {
        continue;
      }
      const fields = parseFields(body);
      const earlier = own.get(id);
      const parent = fields.get('extends')?.inline?.replace(/@.*$/, '') ?? earlier?.parent;
      const role = fields.get('role')?.inline;
      const links: Record<string, Relationship> = {};
      for (const line of fields.get('links')?.lines ?? []) {
        const [field, value = ''] = line.split(/:\s*/);
        const relationship = value.trim();
        if (isRelationship(relationship)) {
          links[field.trim()] = relationship;
        }
      }
      const declaredRole = isRole(role) ? role : earlier?.role;
      const icon = fields.get('icon')?.inline ?? earlier?.icon;
      const hue = fields.get('hue')?.inline ?? earlier?.hue;
      own.set(id, {
        ...(declaredRole && { role: declaredRole }),
        links: { ...earlier?.links, ...links },
        ...(icon && { icon }),
        ...(hue && { hue }),
        ...(parent && { parent }),
      });
    }
  }

  const declarations = new Map<string, Declaration>();
  const resolve = (id: string, seen: ReadonlySet<string>): Declaration | undefined => {
    const resolved = declarations.get(id);
    const declared = own.get(id);
    if (resolved || !declared || seen.has(id)) {
      return resolved;
    }
    const { parent, ...declaration } = declared;
    const base = parent === undefined ? undefined : resolve(parent, new Set([...seen, id]));
    const role = declaration.role ?? base?.role;
    const icon = declaration.icon ?? base?.icon;
    const hue = declaration.hue ?? base?.hue;
    const result: Declaration = {
      ...(role && { role }),
      links: { ...base?.links, ...declaration.links },
      ...(icon && { icon }),
      ...(hue && { hue }),
    };
    declarations.set(id, result);
    return result;
  };
  own.forEach((_, id) => resolve(id, new Set()));
  return declarations;
};
