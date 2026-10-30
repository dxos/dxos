//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React from 'react';

import type * as Spec from '@dxos/compute/Spec';
import { Filter, Obj } from '@dxos/echo';

import { Feature, SpecText } from '#types';

import { featureEmbeds } from '../../components/SpecDocumentEditor/index.ts';
import { type FeatureEmbedField, FeatureEmbedSection } from './FeatureEmbedSection.tsx';

export type FeatureEmbedExtensionsOptions = {
  attendableId?: string;
  /** The name of a feature `/feature` makes from a line of prose, or a line with no text before it. */
  newName: string;
};

/**
 * The editor extensions for a spec's text: its embeds drawn as editable feature sections, edits synced to the spec, a
 * pasted embed copied and `/feature`, whose new section takes the cursor in the field left to fill in. None for a spec
 * not in a database.
 */
export const featureEmbedExtensions = (
  spec: Spec.Spec,
  { attendableId, newName }: FeatureEmbedExtensionsOptions,
): Extension[] => {
  const db = Obj.getDatabase(spec);
  if (!db) {
    return [];
  }
  // The feature `/feature` made last and the field to fill in next, until its section mounts and takes the cursor.
  let created: { id: string; field: FeatureEmbedField } | undefined;
  const claimFocus = (id: string): FeatureEmbedField | undefined => {
    if (created?.id !== id) {
      return undefined;
    }
    const { field } = created;
    created = undefined;
    return field;
  };

  return [
    featureEmbeds({
      Component: (props) => (
        <FeatureEmbedSection {...props} db={db} attendableId={attendableId} claimFocus={claimFocus} />
      ),
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
      // A sentence of prose becomes the description of a feature still to be named; a phrase names it.
      onCreate: (text) => {
        const prose = !!text && /[.!?]$/.test(text);
        const feature = db.add(
          Feature.make({
            name: prose || !text ? newName : text,
            description: prose ? text : undefined,
            status: 'planned',
          }),
        );
        created = { id: feature.id, field: prose || !text ? 'name' : 'description' };
        return SpecText.makeEmbed(feature);
      },
    }),
  ];
};
