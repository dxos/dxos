//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { type SpecDocument } from '@dxos/types';

import { Feature, Spec, SpecText } from '#types';

import { featureEmbeds } from '../../components/SpecDocumentEditor/index.ts';
import { FeatureEmbedCard } from './FeatureEmbedCard.tsx';

export type FeatureEmbedExtensionsOptions = {
  attendableId?: string;
  /** The name of a feature `/feature` makes on a line with no text before it. */
  newName: string;
  /** Called with a feature `/feature` made. */
  onCreate?: (id: string) => void;
};

/**
 * The editor extensions for a spec's document: its embeds drawn as feature cards, edits synced to the spec, a pasted
 * embed copied and `/feature`. None for a document no spec holds.
 */
export const featureEmbedExtensions = (
  document: SpecDocument.SpecDocument,
  { attendableId, newName, onCreate }: FeatureEmbedExtensionsOptions,
): Extension[] => {
  const parent = Obj.getParent(document);
  const db = Obj.getDatabase(document);
  if (!Spec.instanceOf(parent) || !db) {
    return [];
  }
  const spec = parent;

  return [
    featureEmbeds({
      Component: (props) => <FeatureEmbedCard {...props} db={db} attendableId={attendableId} />,
      onChange: ({ removed }) => void SpecText.sync(spec, { removed }),
      onCopy: (id) => {
        const [original] = db.query(Filter.id(id)).runSync();
        if (!Feature.instanceOf(original)) {
          return undefined;
        }
        const { name, description, requirements, status } = original;
        const copy = db.add(
          Feature.make({
            name,
            description,
            status,
            requirements: (requirements ?? []).map((requirement) => ({ ...requirement })),
          }),
        );
        return Obj.getURI(copy);
      },
      onCreate: (name) => {
        const feature = db.add(Feature.make({ name: name ?? newName, status: 'planned' }));
        onCreate?.(feature.id);
        return SpecText.makeEmbed(feature);
      },
    }),
  ];
};
