//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import type * as Spec from '@dxos/compute/Spec';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { objectEmbedFocus } from '@dxos/ui-editor';

import { Feature, SpecText } from '#types';

import { featureEmbeds } from './feature-embeds.ts';

/** The fields of a new feature's section `/feature` puts the cursor in, each an editor bound to the feature. */
const FIELDS = {
  name: '[data-testid="name"] [contenteditable="true"]',
  description: '[data-testid="description"] [contenteditable="true"]',
};

export type FeatureEmbedExtensionsOptions = {
  /** The name of a feature `/feature` makes from a line of prose, or a line with no text before it. */
  newName: string;
};

/**
 * The editor extensions for a spec's text: edits synced to the spec, a pasted embed copied and `/feature`, whose new
 * section takes the cursor in the field left to fill in. None for a spec not in a database.
 */
export const featureEmbedExtensions = (spec: Spec.Spec, { newName }: FeatureEmbedExtensionsOptions): Extension[] => {
  const db = Obj.getDatabase(spec);
  if (!db) {
    return [];
  }
  // The feature `/feature` made last and the field to fill in next, until its section mounts and takes the cursor.
  let created: { id: string; field: string } | undefined;
  const claimFocus = (id: string): string | undefined => {
    if (created?.id !== id) {
      return undefined;
    }
    const { field } = created;
    created = undefined;
    return field;
  };

  return [
    objectEmbedFocus.of(claimFocus),
    featureEmbeds({
      // A pass can outlive its database, as when the editor closes mid-pass.
      onChange: ({ removed }) =>
        void SpecText.sync(spec, { removed }).catch((error) => log.warn('spec text sync failed', { error })),
      onCopy: (id) => {
        const [original] = db.query(Filter.id(id)).runSync();
        if (!Feature.instanceOf(original)) {
          return undefined;
        }
        const { name, description, status } = original;
        const copy = db.add(
          Feature.make({ name, description, status, requirements: Feature.getRequirements(original) }),
        );
        return Obj.getURI(copy);
      },
      // A sentence of prose becomes the description of a feature still to be named; a phrase names it.
      onCreate: (text) => {
        const prose = !!text && /[.!?]$/.test(text);
        const feature = db.add(
          Feature.make({
            name: prose || !text ? newName : text,
            description: prose ? text : '',
            status: 'planned',
          }),
        );
        created = { id: feature.id, field: prose || !text ? FIELDS.name : FIELDS.description };
        return SpecText.makeEmbed(feature);
      },
    }),
  ];
};
