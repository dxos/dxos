//
// Copyright 2021 DXOS.org
//

import { DomainKey } from './domain-key';

/**
 * Decentralized Name.
 * Example: dxn://example:foo.bar
 */
// TODO(burdon): dxn:// prefix?
// TODO(burdon): Dots or slashes?
export class DXN {
  /**
   * Lower-case.
   * Starts with a letter.
   * Min 3 and max 32 characters.
   * Must not have multiple hyphens in a row or end with a hyphen.
   * @param domain
   */
  static validateDomain (domain: string) {
    domain = domain.toLowerCase();
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
   * Lower-case.
   * Starts with a letter.
   * Min 3 and max 64 characters.
   * Must not have multiple periods in a row or end with a period or hyphen.
   * TODO(burdon): Allow slashes? (URL representation?)
   * @param resource
   */
  static validateResource (resource: string) {
    resource = resource.trim().toLowerCase();
    if (!resource.match(/^[a-z][a-z0-9-.]{0,63}$/)) {
      throw new Error(`Invalid resource: ${resource}`);
    }

    resource.split(/[.-]/).forEach(word => {
      if (word.length === 0 || word.endsWith('-') || word.endsWith('.')) {
        throw new Error(`Invalid resource: ${resource}`);
      }
    });

    return resource;
  }

  static parse (dxn: string) {
    const match = dxn.match(/^(~?)([^:]+):([^:]+)/);
    if (!match) {
      throw new Error(`Invalid DXN: ${dxn}`);
    }

    const [, tilda, domain, resource] = match;
    if (tilda) {
      return DXN.fromDomainKey(DomainKey.fromHex(domain), resource);
    } else {
      return DXN.fromDomainName(domain, resource);
    }
  }

  static fromDomainKey (key: DomainKey, resource: string) {
    resource = DXN.validateResource(resource);
    return new DXN({ key, resource });
  }

  static fromDomainName (domain: string, resource: string) {
    domain = DXN.validateDomain(domain);
    resource = DXN.validateResource(resource);
    return new DXN({ domain, resource });
  }

  public readonly key?: DomainKey;
  public readonly domain?: string;
  public readonly resource: string; // TODO(burdon): Rename path? name?

  private constructor ({ key, domain, resource }: {
    key?: DomainKey,
    domain?: string,
    resource: string
  }) {
    this.key = key;
    this.domain = domain;
    this.resource = resource;
  }

  toString () {
    if (this.domain) {
      return `${this.domain}:${this.resource}`;
    } else {
      return `~${this.key!.toHex()}:${this.resource}`;
    }
  }
}
