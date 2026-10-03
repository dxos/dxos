//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Database, type Entity, Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { type FormFieldRendererProps, FormFieldRow, RefField } from '@dxos/react-ui-form';

import { MediaArtifact } from '#types';

// The reference annotation names the referenced typename; read the way `RefField` does.
const REFERENCE_ANNOTATION_ID = '@dxos/schema/annotation/Reference';

const isArtifactRef = (ast: SchemaAST.AST): boolean =>
  SchemaEx.findAnnotation<{ typename?: string }>(ast, REFERENCE_ANNOTATION_ID)?.typename ===
  Type.getTypename(MediaArtifact.MediaArtifact);

/** Whether a request field references a media artifact (a provider's "reference image"). */
export const isArtifactRefField = (field: Schema.Top): boolean => {
  // An optional field wraps its schema; the reference annotation sits on the wrapped one.
  const inner = 'schema' in field && field.schema ? (field.schema as Schema.Top) : field;
  return isArtifactRef(inner.ast) || isArtifactRef(field.ast);
};

/** The active space's image artifacts: what a reference is consumed as, whatever the request's kind. */
const useImageArtifacts = (db?: Database.Database): Entity.Any[] =>
  // Queried by DXN: the picker's option type is the untyped entity, which the DXN overload yields.
  useQuery(db, Filter.type(DXN.make(Type.getTypename(MediaArtifact.MediaArtifact)), { kind: 'image' }));

/**
 * A request field that references a media artifact: the picker lists the active space's image
 * artifacts, since a reference is consumed as a still whatever the request's own kind.
 */
export const ArtifactRefField = (props: FormFieldRendererProps) => {
  const space = useActiveSpace();

  return (
    <FormFieldRow
      label={props.label}
      description={props.description}
      error={props.getStatus().error}
      required={props.required}
      readonly={props.readonly}
      presentation={props.presentation}
    >
      <RefField {...props} db={space?.db} useResults={useImageArtifacts} />
    </FormFieldRow>
  );
};

ArtifactRefField.displayName = 'ArtifactRefField';
