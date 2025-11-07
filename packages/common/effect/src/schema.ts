import * as Schema from 'effect/Schema';

export interface opaque<T, S extends Schema.Schema.All> extends Schema.Schema<S['Type'], S['Encoded'], S['Context']> {
  new (_: never): T;
}

export const opaque = <S extends Schema.Schema.All>(schema: S): opaque<S['Type'], S> => {
  return schema as any;
};
