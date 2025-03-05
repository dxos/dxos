import { getTypename, ObjectId, type HasId, type HasTypename } from '@dxos/echo-schema';

export type RegistryQuery = {
  /**
   * Query specific registry IDs.
   */
  id?: string | string[];

  /**
   * Query specific registry names.
   */
  name?: string | string[];

  /**
   * Query specific registry types.
   */
  type?: string | string[];
};

export class RegistryClient {
  constructor(private readonly _url: string) {}

  async publish(objects: (HasId & HasTypename)[]) {
    for (const object of objects) {
      if (!ObjectId.isValid(object.id)) {
        throw new Error('Object must have an id');
      }
      if (typeof getTypename(object) !== 'string') {
        throw new Error('Object must have a typename');
      }
    }

    const { success, reason } = await this._call('/object', { method: 'POST', body: { objects } });
    if (!success) {
      throw new Error(`Failed to publish objects: ${reason}`);
    }
  }

  async query(query: RegistryQuery): Promise<(HasId & HasTypename)[]> {
    const params = new URLSearchParams();
    if (query.id) {
      if (Array.isArray(query.id)) {
        throw new Error('Arrays of IDs are not supported');
      }
      params.set('id', query.id);
    }
    if (query.name) {
      if (Array.isArray(query.name)) {
        throw new Error('Arrays of names are not supported');
      }
      params.set('name', query.name);
    }
    if (query.type) {
      if (Array.isArray(query.type)) {
        throw new Error('Arrays of types are not supported');
      }
      params.set('type', query.type);
    }

    const { success, data, reason } = await this._call('/object', { method: 'GET', query: params });
    if (!success) {
      throw new Error(`Failed to query registry: ${reason}`);
    }
    return data;
  }

  private async _call(
    path: string,
    { method, body, query }: { method: 'POST' | 'GET'; body?: unknown; query?: URLSearchParams },
  ): Promise<any> {
    let url = new URL(path, this._url);
    if (query) {
      url.search = query.toString();
    }
    const response = await fetch(url, {
      method,
      headers:
        typeof body === 'object' && body !== null
          ? {
              'Content-Type': 'application/json',
            }
          : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data;
  }
}
