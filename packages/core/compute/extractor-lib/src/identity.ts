//
// Copyright 2026 DXOS.org
//

import { type IdentitySpec } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { extractDomain } from './domain';

/** Canonical form of an email address — the one normalization every path must share. */
export const normalizeEmail = (email: string | undefined): string | undefined => {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

/** Canonical form of a phone number: digits and a leading `+` only, so formatting never splits an identity. */
export const normalizePhone = (phone: string | undefined): string | undefined => {
  const normalized = phone?.replace(/[^\d+]/g, '');
  return normalized && /\d/.test(normalized) ? normalized : undefined;
};

/**
 * Identity for a Person: its email addresses. Names are deliberately excluded — role inboxes share
 * a display name (`DXOS` vs `DXOS via TestFlight`) while being different senders, and a false merge
 * is far more expensive than a missed one. Foreign keys are added generically by the engine, which
 * is what links a mail-sourced Person to the same human synced from Google Contacts.
 */
export const personIdentitySpec: IdentitySpec<typeof Person.Person> = {
  type: Person.Person,

  keys: (person) =>
    (person.emails ?? [])
      .map((email) => normalizeEmail(email.value))
      .filter((value): value is string => !!value)
      .map((value) => `email:${value}`),

  inputKeys: (input) => {
    const email = normalizeEmail(typeof input === 'string' ? input : (input as { email?: string })?.email);
    return email ? [`email:${email}`] : [];
  },

  makeEmpty: () => Person.make(),

  merge: (target, source) => {
    fillScalars(target, source, [
      'fullName',
      'preferredName',
      'nickname',
      'image',
      'jobTitle',
      'department',
      'notes',
      'birthday',
    ]);
    if (!target.organization && source.organization) {
      target.organization = source.organization;
    }
    if (!target.location && source.location) {
      target.location = [...source.location];
    }

    target.emails = unionLabelled(target.emails, source.emails, (value) => normalizeEmail(value), normalizeEmail);
    target.phoneNumbers = unionLabelled(target.phoneNumbers, source.phoneNumbers, normalizePhone);
    target.urls = unionLabelled(target.urls, source.urls, (value) => value?.trim().toLowerCase());
    target.identities = unionLabelled(target.identities, source.identities, (value) => value?.trim());
    target.addresses = unionLabelled(target.addresses, source.addresses, (value) => JSON.stringify(value));
  },
};

/**
 * Identity for an Organization: its website's domain. Names collide too readily across unrelated
 * companies to key on, so they are excluded for the same reason Person excludes names.
 */
export const organizationIdentitySpec: IdentitySpec<typeof Organization.Organization> = {
  type: Organization.Organization,

  keys: (organization) => {
    const domain = organizationDomain(organization.website);
    return domain ? [`domain:${domain}`] : [];
  },

  inputKeys: (input) => {
    const source = typeof input === 'string' ? input : (input as { email?: string; domain?: string });
    const domain =
      typeof source === 'string'
        ? organizationDomain(source)
        : (source?.domain?.toLowerCase() ?? (source?.email ? extractDomain(source.email) : undefined));
    return domain ? [`domain:${domain}`] : [];
  },

  makeEmpty: () => Organization.make({}),

  merge: (target, source) => {
    fillScalars(target, source, ['name', 'website', 'description', 'image', 'status']);
  },
};

/** All identity specs this package provides; pass to `fromIdentitySpecs` to build the registry layer. */
export const identitySpecs = [personIdentitySpec, organizationIdentitySpec];

/** Hostname of a website (bare domains and full URLs both accepted), or `undefined` when unparseable. */
const organizationDomain = (website: string | undefined): string | undefined => {
  if (!website) {
    return undefined;
  }
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

/** Copies each listed scalar from `source` only where `target` has none — target stays authoritative. */
const fillScalars = <T>(target: { [K in keyof T]?: unknown }, source: T, fields: readonly (keyof T)[]): void => {
  for (const field of fields) {
    const incoming = source[field];
    const current = target[field];
    if ((current === undefined || current === '') && incoming !== undefined && incoming !== '') {
      target[field] = incoming;
    }
  }
};

/**
 * Unions two `{ label?, value }` arrays by a normalized form of `value`, keeping the target's
 * entries (and their order) first. `write` optionally rewrites the stored value to its canonical
 * form, so a merge also repairs entries a source stored unnormalized.
 */
const unionLabelled = <V>(
  target: readonly { label?: string; value: V }[] | undefined,
  source: readonly { label?: string; value: V }[] | undefined,
  key: (value: V) => string | undefined,
  write?: (value: V) => V | undefined,
): { label?: string; value: V }[] => {
  const result: { label?: string; value: V }[] = [];
  const seen = new Set<string>();
  for (const entry of [...(target ?? []), ...(source ?? [])]) {
    const identity = key(entry.value);
    if (identity === undefined || seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    const value = write?.(entry.value) ?? entry.value;
    result.push(entry.label === undefined ? { value } : { label: entry.label, value });
  }

  return result;
};
