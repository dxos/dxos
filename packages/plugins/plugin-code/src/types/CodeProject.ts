//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';

import { meta } from '../meta';
import * as SourceFile from './SourceFile';
import * as Spec from './Spec';

export const CodeProject = Schema.Struct({
  name: Schema.optional(Schema.String),
  spec: Ref.Ref(Spec.Spec),
  files: Schema.optional(Schema.Array(Ref.Ref(SourceFile.SourceFile))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.codeProject',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--app-window--regular',
    hue: meta.iconHue,
  }),
);

export interface CodeProject extends Schema.Schema.Type<typeof CodeProject> {}

export const make = ({ name, spec, files = [] }: { name?: string; spec: Spec.Spec; files?: SourceFile.SourceFile[] }) =>
  Obj.make(CodeProject, {
    name,
    spec: Ref.make(spec),
    files: files.map((file) => Ref.make(file)),
  });
