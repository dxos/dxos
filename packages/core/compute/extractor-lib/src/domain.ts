//
// Copyright 2026 DXOS.org
//

/** Extract the domain portion of an email address (lower-cased). */
export const extractDomain = (email: string): string | undefined => email.match(/@(.+)/)?.[1]?.toLowerCase();

// Consumer mail providers whose domain identifies no organization — a sender at one of these must
// never mint an Organization named after their mailbox host.
const FREE_MAIL_DOMAINS = new Set([
  'aol.com',
  'att.net',
  'comcast.net',
  'fastmail.com',
  'fastmail.fm',
  'gmail.com',
  'gmx.com',
  'gmx.net',
  'googlemail.com',
  'hey.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'mac.com',
  'mail.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'pm.me',
  'proton.me',
  'protonmail.com',
  'verizon.net',
  'yahoo.com',
  'ymail.com',
  'zoho.com',
]);

/** Whether the domain is a consumer mail provider rather than an organization's own. */
export const isFreeMailDomain = (domain: string | undefined): boolean =>
  !!domain && FREE_MAIL_DOMAINS.has(domain.toLowerCase());

/**
 * Placeholder display name for an Organization derived from its domain — the second-level label,
 * capitalized (`kirkconsult.com` → `Kirkconsult`). Enrichment (real name, logo) is a later pass.
 */
export const organizationNameFromDomain = (domain: string): string => {
  const parts = domain.split('.');
  const label = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Host equality or sub-domain match either direction (website normalized to a URL hostname). */
export const matchesDomain = (website: string | undefined, domain: string): boolean => {
  if (!website) {
    return false;
  }
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
  } catch {
    return false;
  }
};
