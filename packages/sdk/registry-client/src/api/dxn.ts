//
// Copyright 2021 DXOS.org
//

import { DomainKey } from './domain-key';

export type DXNString = string;

/**
 * Decentralized Name.
 * Example: dxn://example:foo/bar
 */
export class DXN {
  static urlencode (dxn: DXN) {
    return dxn.toString().replace(/\//g, '.');
  }

  static urldecode (encodedDxn: string) {
    return DXN.parse(encodedDxn.replace(/\./g, '/'));
  }

  static parse (dxn: string) {
    // TODO(wittjosiah): Make tag optional.
    const match = dxn.match(/^(~?)([^:]+):([^:]+)@([^:]+)/);
    if (!match) {
      throw new Error(`Invalid DXN: ${dxn}`);
    }

    const [, tilda, domain, path, tag] = match;
    if (tilda) {
      return DXN.fromDomainKey(DomainKey.fromHex(domain), path, tag);
    } else {
      return DXN.fromDomainName(domain, path, tag);
    }
  }

  static fromDomainKey (domainKey: DomainKey, path: string, tag?: string) {
    path = DXN.validatePath(DXN.normalize(path));
    tag = tag && DXN.validateTag(DXN.normalize(tag));
    return new DXN({ domainKey, path, tag });
  }

  static fromDomainName (domainName: string, path: string, tag?: string) {
    domainName = DXN.validateDomain(DXN.normalize(domainName));
    path = DXN.validatePath(DXN.normalize(path));
    tag = tag && DXN.validateTag(DXN.normalize(tag));
    return new DXN({ domainName, path, tag });
  }

  public readonly domainKey?: DomainKey;
  public readonly domainName?: string;
  public readonly path: string;
  public readonly tag?: string;

  private constructor ({ domainKey, domainName, path, tag }: {
    domainKey?: DomainKey,
    domainName?: string,
    path: string,
    tag?: string
  }) {
    this.domainKey = domainKey;
    this.domainName = domainName;
    this.path = path;
    this.tag = tag;
  }

  toString () {
    if (this.domainName) {
      return `${this.domainName}:${this.path}@${this.tag}`;
    } else {
      return `~${this.domainKey!.toHex()}:${this.path}@${this.tag}`;
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
  private static validateDomain (domain: string) {
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
