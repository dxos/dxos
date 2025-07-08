//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';

// Product
// - Modules (models?): sets of propostitional statements about somethings (a company, person, project, "our challenge", "our toolchain", "problem X", etc.)
//  - Discuss with colleagues and AI and click to accept/reject premises which are then added to the module.
//  - Modules are used in reasoning.
//  - Out of the box: team is assigned a "game" to come up with shared models for everyone else in the team.
//  - Ultra transparancy.
// - New modules can be created on the fly inside the AI and we can collaboratively chat with the model.
// - Models can referernce each other canonically.
// - Models include open questions/issues to solve.
// - Could be product ideas, technical issues. they have a goal. can be associated with tools (blueprints) that can join (temporarily) and do work.

// TODO(burdon): Goal > Action > Result.
// Mode
// - Goals
// - Issues

// Build self-building knowledge base.

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
      typename: 'dxos.org/teyp/Proposition',
      version: '0.1.0',
    }),
  );

  export const make = (props: Pick<Any, 'text'>) => Obj.make(Any, Fields.make(props));
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
      typename: 'dxos.org/type/OKRS',
      version: '0.1.0',
    }),
  );

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Any>> {}

  export const make = () => Obj.make(Any, { objectives: [], keyResults: [] });
}

/**
 * Create document (or outline or product description) then create an SWOT analysis object, then the AI will chat with you to create this outcome.
 */
export namespace SWOT {
  const Properties = Schema.Struct({
    subject: Schema.optional(Ref.Any).annotations({
      description: 'Subject of the analysis, which could be a document or a structured object.',
    }),
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

export namespace Plan {
  const Properties = Schema.Struct({
    name: Schema.String,
  });

  const Any = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/Plan',
      version: '0.1.0',
    }),
  );

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Any>> {}

  export const make = ({ name }: Any) => Obj.make(Any, { name });
}

// TODO(burdon): Types or variants of a type?
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
    const analysis = SWOT.make();
    expect(analysis.strengths).toHaveLength(0);
  });
});
