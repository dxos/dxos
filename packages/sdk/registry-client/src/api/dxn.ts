//
// Copyright 2021 DXOS.org
//

import { DomainKey } from './domain-key.js';

export type DXNString = string;

/**
 * Decentralized Name.
 * Example: dxn://example:foo/bar
 */
export class DXN {
  static parse (name: string) {
    const match = name.match(/^(0x)?([^:]+):([^:@]+)(@?)([^:]+)?/);
    if (!match) {
      throw new Error(`Invalid DXN: ${name}`);
    }

    const [, hex, authority, path, at, tag] = match;
    if (at && !tag) {
      throw new Error(`Invalid DXN tag: ${name}`);
    }

    if (hex) {
      return DXN.fromDomainKey(DomainKey.fromHex(authority), path, tag);
    } else {
      return DXN.fromDomainName(authority, path, tag);
    }
  }

  static fromDomainKey (domainKey: DomainKey, path: string, tag?: string) {
    path = DXN.validatePath(DXN.normalize(path));
    tag = tag && DXN.validateTag(DXN.normalize(tag));
    return new DXN(domainKey, path, tag);
  }

  static fromDomainName (domainName: string, path: string, tag?: string) {
    domainName = DXN.validateDomainName(DXN.normalize(domainName));
    path = DXN.validatePath(DXN.normalize(path));
    tag = tag && DXN.validateTag(DXN.normalize(tag));
    return new DXN(domainName, path, tag);
  }

  static urlencode (dxn: DXN) {
    const [authorityPath, maybeTag] = dxn.toString().split('@');
    const tag = maybeTag ? `@${maybeTag}` : '';
    return `${authorityPath.replace(/\//g, '.')}${tag}`;
  }

  static urldecode (encodedDxn: string) {
    const [authorityPath, maybeTag] = encodedDxn.split('@');
    const tag = maybeTag ? `@${maybeTag}` : '';
    return DXN.parse(`${authorityPath.replace(/\./g, '/')}${tag}`);
  }

  private constructor (
    public readonly authority: DomainKey | string,
    public readonly path: string,
    public readonly tag?: string
  ) {}

  /**
   * Create new DXN overriding specified fields.
   */
  with ({ authority, path, tag }: { authority?: DomainKey | string, path?: string, tag?: string | null }) {
    authority = authority ?? this.authority;
    path = path ?? this.path;
    tag = tag === null ? undefined : tag ?? this.tag;

    if (typeof authority === 'string') {
      return DXN.fromDomainName(authority, path, tag);
    } else {
      return DXN.fromDomainKey(authority, path, tag);
    }
  }

  toString () {
    const tag = this.tag ? `@${this.tag}` : '';

    if (typeof this.authority === 'string') {
      return `${this.authority}:${this.path}${tag}`;
    } else {
      return `0x${this.authority.toHex()}:${this.path}${tag}`;
    }
  }

  private static normalize (part: string) {
    return part.trim().toLowerCase();
  }

  /**
   * Lower-case.
   * Starts with a letter.
   * Min 3 and max 32 characters.
   * Must not have multiple hyphens in a row or end with a hyphen.
   * @param domain
   */
  private static validateDomainName (domain: string) {
    if (!domain.match(/^[a-z][a-z0-9-]{2,31}$/)) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    domain.split('-').forEach(word => {
      if (word.length === 0 || word.endsWith('-')) {
        throw new Error(`Invalid domain: ${domain}`);
      }
    });

    return domain;
  }

  /**
   * Validates DXN path.
   * Change to lower-case.
   * Starts with a letter.
   * Min 3 and max 64 characters.
   * Must not have multiple periods in a row or end with a period or hyphen.
   * @param path
   */
  // TODO(burdon): Separate function to normalize (e.g., change to lowercase, replaces dots).
  // TODO(burdon): Separate function to encode (e.g., change / to .).
  private static validatePath (path: string) {
    if (!path.match(/^[a-z][a-z\d-/]{0,63}$/)) {
      throw new Error(`Invalid path: ${path}`);
    }

    // Prohibit repeated or trailing delimiters.
    path.split(/[./-]/).forEach(word => {
      if (word.length === 0 || word.endsWith('-') || word.endsWith('.') || word.endsWith('/')) {
        throw new Error(`Invalid path: ${path}`);
      }
    });

    return path;
  }

  /**
   * Validates DXN tag.
   * @param tag
   */
  private static validateTag (tag: string) {
    if (!tag.match(/^[a-z0-9-.]{0,32}$/)) {
      throw new Error(`Invalid tag: ${tag}`);
    }

    // Prohibit repeated or trailing delimiters.
    tag.split(/[.-]/).forEach(word => {
      if (word.length === 0 || word.endsWith('-') || word.endsWith('.')) {
        throw new Error(`Invalid tag: ${tag}`);
      }
    });

    return tag;
  }
}
