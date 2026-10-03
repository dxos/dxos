//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { Segment, sourceHash } from '@dxos/nlp';

import * as Language from './Language.ts';

/**
 * A cached structural analysis of one object's text: nested paragraph / sentence / clause /
 * vocabulary regions, each carrying its extent in the source and in the translation.
 *
 * Persisted rather than recomputed because the analysis costs a model round-trip on every open,
 * and the text it describes usually has not changed. `sourceHash` is what makes that safe: it is
 * compared against the live text, so a stale analysis is detected rather than trusted.
 */
export class Analysis extends Type.makeObject<Analysis>(DXN.make('org.dxos.type.lingo.analysis', '0.1.0'))(
  Schema.Struct({
    /** The object whose text was analyzed — a document, an email, a transcript. */
    subject: Ref.Ref(Obj.Unknown),
    language: Ref.Ref(Language.Language),
    /** Hash of the analyzed source text; diverges when the document is edited. */
    sourceHash: Schema.String,
    /** Hash of the translation the paired ranges point into. */
    targetHash: Schema.optional(Schema.String),
    /**
     * The translation itself. Stored alongside the ranges because the paired offsets are only
     * meaningful against this exact text — re-translating would move them.
     */
    translation: Schema.optional(Schema.String),
    segments: Schema.mutable(Schema.Array(Segment)),
  }).pipe(
    LabelAnnotation.set(['sourceHash']),
    Annotation.IconAnnotation.set({ icon: 'ph--brackets-angle--regular', hue: 'teal' }),
  ),
) {}

/** Creates an Analysis object. */
export const make = (props: Obj.MakeProps<typeof Analysis>): Analysis => Obj.make(Analysis, props);

/** Checks if a value is an Analysis object. */
export const instanceOf = (value: unknown): value is Analysis => Obj.instanceOf(Analysis, value);

/**
 * True when `text` is no longer the text this analysis describes, so its offsets cannot be trusted.
 */
export const isStale = (analysis: Analysis, text: string): boolean => sourceHash(text) !== analysis.sourceHash;
