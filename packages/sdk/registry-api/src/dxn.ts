//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DomainKey } from './models';

export class DXN {
  static parse (dxn: string) {
    if (dxn.startsWith('~')) {
      const [domainKey, resource] = dxn.slice(1).split(':');
      return DXN.fromDomainKey(DomainKey.fromHex(domainKey), resource);
    } else {
      const [domain, resource] = dxn.split(':');
      return DXN.fromDomainName(domain, resource);
    }
  }

  static fromDomainKey (domainKey: DomainKey, resourceName: string) {
    if (!resourceName.match(/^[a-zA-Z0-9-.]+$/)) {
      throw new Error('Invalid resource name');
    }

    return new DXN(resourceName, undefined, domainKey);
  }

  static fromDomainName (domain: string, resource: string) {
    if (!domain.match(/^[a-zA-Z0-9-]+$/)) {
      throw new Error(`Invalid domain name: '${domain}'`);
    }
    if (!resource.match(/^[a-zA-Z0-9-.]+$/)) {
      throw new Error(`Invalid resource name: '${resource}'`);
    }

    return new DXN(resource, domain, undefined);
  }

  private constructor (
    public readonly resource: string,
    public readonly domain?: string,
    public readonly key?: DomainKey
  ) {}

  toString () {
    if (this.domain) {
      return `${this.domain}:${this.resource}`;
    } else {
      assert(this.key);
      return `~${this.key.toHex()}:${this.resource}`;
    }
  }
}
