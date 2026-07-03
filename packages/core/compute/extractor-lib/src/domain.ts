//
// Copyright 2026 DXOS.org
//

/** Extract the domain portion of an email address (lower-cased). */
export const extractDomain = (email: string): string | undefined => email.match(/@(.+)/)?.[1]?.toLowerCase();

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
