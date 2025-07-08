//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

// Mode
// - Goals
// - Issues
// - Analysis
// - Objectives
// - KeyResult

// TODO(burdon): Create namespace for each type.
namespace Proposition {
  const Fields = Schema.Struct({
    text: Schema.String,
    // children: Schema.optional(Schema.mutable(Schema.Array(Schema.suspend(() => Any)))).pipe(
    //   Schema.withConstructorDefault(() => []),
    // ),
  });

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Fields>> {}

  export const Any = Fields.pipe(
    Type.Obj({
      typename: 'dxos.org/teyp/Definition',
      version: '0.1.0',
    }),
  );

  export const make = (text: string) => Obj.make(Any, Fields.make({ text }));
}

//
// Templates
// Others:
//  - Employee (for collaboration or peer review)
//  - Project
//  - OKRs
//  - Technical issue
//  - Event
//  - Organization
//  - Compeitior
//  - Go-to-market strategy
//  - Triage
//  - Project plannin
//
// - Extensible library of modules that can be selected out of the box.
// - Modules can be associated with tools and MoE
//

export namespace Analysis {
  const Properties = Schema.Struct({
    strengths: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      description: 'An attribute of the organization that is helpful in achieving its objectives.',
    }),
    weaknesses: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      description: 'A limitation or deficiency within the organization that could hinder its progress.',
    }),
    opportunities: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      description: 'An external factor that the organization could exploit to its advantage.',
    }),
    threats: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      description: 'An external factor that could potentially harm the organization.',
    }),
  }).annotations({
    description:
      'SWOT is a strategic planning technique used to evaluate the Strengths, Weaknesses, Opportunities, and Threats involved in a project or business venture.',
  });

  const Any = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/SWOT',
      version: '0.1.0',
    }),
  );

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Any>> {}

  export const make = () => Obj.make(Any, { strengths: [], weaknesses: [], opportunities: [], threats: [] });
}

export namespace OKRS {
  const Properties = Schema.Struct({
    objectives: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      name: 'Objectives',
      description: 'Qualitative, ambitious aspirations',
    }),
    keyResults: Schema.mutable(Schema.Array(Proposition.Any)).annotations({
      name: 'Key Results',
      description: 'Quantitative metrics tracking progress towards those objectives',
    }),
  }).annotations({
    description: 'A goal-setting framework defining Objectives and Key Results',
  });

  const Any = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/SWOT',
      version: '0.1.0',
    }),
  );

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Any>> {}

  export const make = () => Obj.make(Any, { objectives: [], keyResults: [] });
}

// Build self-building knowledge base.

// TODO(burdon): Types or variants of a type?
export namespace Plan {}
export namespace Project {}
export namespace ProblemStatement {}
export namespace ComptetitiveAnalysis {}
export namespace GoToMarket {}

export namespace Itinerary {}

export namespace Tutorial {}
export namespace Manual {}

export namespace Employee {}

export namespace Review {}

export namespace CityGuide {}

describe('analysis', () => {
  test('sanity', ({ expect }) => {
    const analysis = Analysis.make();
    expect(analysis.strengths).toHaveLength(0);
  });
});
