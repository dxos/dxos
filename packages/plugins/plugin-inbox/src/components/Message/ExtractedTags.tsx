//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { Annotation, Obj, Type } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { useExtractedObjects } from '../../hooks';
import { AnchorIconButton } from '../AnchorIconButton';

/**
 * Renders one row per object extracted from this message (sourced from `ExtractedFrom`
 * relations whose Target is the message). Each row uses the same `[icon-column | label]`
 * layout as the sender row so the message header reads as a list of related entities.
 * Clicking the icon opens a card preview via `DxAnchorActivate` (handled by the deck plugin).
 */
export const ExtractedTags = ({ message }: { message: Message.Message }) => {
  const space = getSpace(message);
  const db = space?.db;
  const objects = useExtractedObjects(db, message);

  if (objects.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1' data-testid='extracted-tags'>
      {objects.map((object) => (
        <ExtractedTagRow key={Obj.getURI(object)} object={object} />
      ))}
    </div>
  );
};

const ExtractedTagRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object) ?? Type.getTypename(object) ?? 'object';
  const icon = iconForObject(object);
  const uri = Obj.getURI(object);
  const echoUri = EchoURI.tryParse(uri.toString());

  return (
    <div
      className='grid grid-cols-[2rem_1fr] gap-1 items-center'
      data-testid={`extracted-tag-${object.id}`}
    >
      <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      <h3 className='truncate text-primary-text'>{label}</h3>
    </div>
  );
};

/**
 * Resolve the phosphor icon from the object's type-level `IconAnnotation` (set on the schema
 * via `Annotation.IconAnnotation.set({ icon, hue })`). Falls back to a generic cube glyph
 * when the object's type isn't registered in the runtime or the annotation is absent.
 */
const iconForObject = (object: Obj.Any): string => {
  const type = Obj.getType(object);
  if (!type) {
    return 'ph--cube--regular';
  }
  const schema = Type.getSchema(type);
  return (
    Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined)?.icon ?? 'ph--cube--regular'
  );
};
