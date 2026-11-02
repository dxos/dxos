//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Filter, Obj } from '@dxos/echo';

import { Feature, FeatureLink, FeatureOperation } from '#types';

/** Finds the feature a DXN names in this space ({@link FeatureLink.resolve}). */
const resolveLink = Effect.fn(function* (
  dxn: DXN.DXN,
): Effect.fn.Return<FeatureLink.Resolution<Feature.Feature>, never, Database.Service> {
  const mnemonic = DXN.getMnemonic(dxn);
  const key = Filter.key(DXN.getName(dxn), { version: DXN.getVersion(dxn) });
  const byKey = (yield* Database.query(Filter.and(Filter.type(Feature.Feature), key)).run).filter(Feature.instanceOf);
  const byMnemonic = mnemonic
    ? (yield* Database.query(Filter.and(Filter.type(Feature.Feature), Filter.mnemonic(mnemonic))).run).filter(
        Feature.instanceOf,
      )
    : [];
  return FeatureLink.resolve(dxn, { byKey, byMnemonic });
});

const handler: Operation.WithHandler<typeof FeatureOperation.ImportLinks> = FeatureOperation.ImportLinks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ links }) {
      const code = new Map<Feature.Feature, Feature.CodeLink[]>();
      const unresolved: { dxn: string; path: string; line: number; status: FeatureLink.Status }[] = [];
      const outdated: { dxn: string; link: string; status: FeatureLink.Status }[] = [];
      for (const { dxn: value, path, line, symbol, kind } of links) {
        const dxn = DXN.tryMake(value);
        const resolution: FeatureLink.Resolution<Feature.Feature> = dxn
          ? yield* resolveLink(dxn)
          : { status: 'missing' };
        if (resolution.status === 'missing' || resolution.status === 'ambiguous') {
          unresolved.push({ dxn: value, path, line, status: resolution.status });
          continue;
        }
        const { feature, status } = resolution;
        const link = Feature.getLink(feature);
        if (status !== 'exact' && link) {
          outdated.push({ dxn: value, link, status });
        }
        code.set(feature, [...(code.get(feature) ?? []), { path, line, symbol, kind }]);
      }
      for (const [feature, featureCode] of code) {
        Obj.update(feature, (feature) => {
          feature.code = featureCode;
        });
      }
      yield* Database.flush();
      return { features: code.size, unresolved, outdated };
    }),
  ),
);

export default handler;
