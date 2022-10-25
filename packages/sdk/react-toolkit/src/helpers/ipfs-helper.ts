//
// Copyright 2020 DXOS.org
//

import urlJoin from 'url-join';

/**
 * IPFS gateway HTTP methods.
 * Imported from wirelineio/appkit
 */
export class IpfsHelper {
  _ipfsGateway: string;

  constructor(ipfsGateway: string | any) {
    console.assert(ipfsGateway);
    this._ipfsGateway = ipfsGateway.endsWith('/') ? ipfsGateway : `${ipfsGateway}/`;
  }

  url(cid: string) {
    return cid ? urlJoin(this._ipfsGateway, cid) : this._ipfsGateway;
  }

  async upload(body: any, contentType = 'text/plain'): Promise<string> {
    const response: any = await this._fetch({
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': contentType
      },
      referrer: 'no-referrer',
      body
    });

    return response.headers.get('Ipfs-Hash');
  }

  async download(cid: string): Promise<string> {
    const response: any = await this._fetch(
      {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain'
        },
        referrer: 'no-referrer'
      },
      cid
    );

    return response.text();
  }

  async _fetch(request: any, cid = ''): Promise<{}> {
    let response: any;
    const gateway = this._ipfsGateway;
    try {
      const url = cid ? urlJoin(gateway, cid) : gateway;
      response = await fetch(url, request);
      if (!response.ok) {
        response = null;
      }
    } catch (err: any) {
      console.error(err);
      response = null;
    }

    if (!response) {
      throw new Error(`IPFS request failed: ${JSON.stringify(request)}`);
    }

    return response;
  }
}
