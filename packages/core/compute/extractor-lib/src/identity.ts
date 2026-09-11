//
// Copyright 2026 DXOS.org
//

import { type IdentitySpec } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { extractDomain } from './domain.ts';

/** Canonical form of an email address — the one normalization every path must share. */
export const normalizeEmail = (email: string | undefined): string | undefined => {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

/** Canonical form of a phone number: digits and a leading `+` only, so formatting never splits an identity. */
export const normalizePhone = (phone: string | undefined): string | undefined => {
  const trimmed = phone?.trim();
  if (!trimmed) {
    return undefined;
  }
  // A `+` anywhere but the front is punctuation, not a country-code marker; keeping it would make
  // `+1415…` and `1415…+` two identities.
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${trimmed.startsWith('+') ? '+' : ''}${digits}` : undefined;
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
    target.addresses = unionLabelled(target.addresses, source.addresses, addressKey);
  },
};

/**
 * Identity for an Organization: its website's domain. Names collide too readily across unrelated
 * companies to key on, so they are excluded for the same reason Person excludes names.
 */
export const organizationIdentitySpec: IdentitySpec<typeof Organization.Organization> = {
  type: Organization.Organization,

  keys: (organization) => {
    const domain = normalizeDomain(organization.website);
    return domain ? [`domain:${domain}`] : [];
  },

  inputKeys: (input) => {
    const source = typeof input === 'string' ? input : (input as { email?: string; domain?: string });
    const domain =
      typeof source === 'string'
        ? normalizeDomain(source)
        : normalizeDomain(source?.domain ?? (source?.email ? extractDomain(source.email) : undefined));
    return domain ? [`domain:${domain}`] : [];
  },

  makeEmpty: () => Organization.make({}),

  merge: (target, source) => {
    fillScalars(target, source, ['name', 'website', 'description', 'image', 'status']);
  },
};

/** All identity specs this package provides; pass to `fromIdentitySpecs` to build the registry layer. */
export const identitySpecs = [personIdentitySpec, organizationIdentitySpec];

/**
 * Order-independent key for a compound address: `JSON.stringify` follows insertion order, so two
 * equal addresses built by different code paths would key differently and both survive a merge.
 */
const addressKey = (value: unknown): string => {
  const fields = Object.entries((value ?? {}) as Record<string, unknown>)
    .filter(([, field]) => field !== undefined && field !== '')
    .map(([name, field]): [string, unknown] => [name, typeof field === 'string' ? field.trim().toLowerCase() : field]);
  fields.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return JSON.stringify(fields);
};

/**
 * Canonical domain for a website, a bare domain, or an email's domain part — the one normalization
 * both sides of the Organization lookup must share.
 *
 * `www.` is dropped because it is a host alias, not a different organization: keying a website as
 * `www.dxos.org` while a sender at `alice@dxos.org` looked up `dxos.org` meant the two never linked.
 */
export const normalizeDomain = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const host = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
    return host.replace(/^www\./, '') || undefined;
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
 * Detaches a value from whatever object owns it. ECHO refuses to re-parent a nested record, so a
 * compound entry (an address) taken from a loser has to be copied before it can join the survivor.
 */
const copyValue = <V>(value: V): V =>
  value !== null && typeof value === 'object' ? (JSON.parse(JSON.stringify(value)) as V) : value;

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
    // An unkeyable value cannot be compared to anything, so it is kept rather than lost: the merge
    // deletes the losers, and dropping it here would destroy data the user never chose to discard.
    if (identity !== undefined && seen.has(identity)) {
      continue;
    }
    if (identity !== undefined) {
      seen.add(identity);
    }
    const value = copyValue(write?.(entry.value) ?? entry.value);
    result.push(entry.label === undefined ? { value } : { label: entry.label, value });
  }

  return result;
};
