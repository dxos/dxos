//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

// TODO(burdon): Goal > Action > Result.

// Product Ideas
// Build self-building knowledge base.
// - Modules/Blueprints: sets of propostitional statements about somethings (a company, person, project, "our challenge", "our toolchain", "problem X", etc.)
//   - Discuss with colleagues and AI and click to accept/reject premises which are then added to the module.
//   - Modules are used in reasoning.
//   - Out of the box: team is assigned a "game" to come up with shared models for everyone else in the team.
// - New modules can be created on the fly inside the AI and we can collaboratively chat with the model.
// - Models can referernce each other canonically.
// - Models include open questions/issues to solve.
// - Could be product ideas, technical issues; they have a goal; can be associated with tools (blueprints) that can join (temporarily) and do work.
// - Local LLM (offline).

// ## COMPUTE MODEL
// - BP is unit of packaging.
// - Add to prompt/agent (e.g., notice keeps making mistakes, add new rules).
// - Branching conversations (like git).
// - BP to compile questions for team members (e.g., AMA later); Agent for each team member.

// ## LINEAR
// - Follow-up with refactoring.

// UX
// - Edit Blueprint (schema, prompts, scripts, tool selection).
// - Drag Blueprint into Chat's context window.
// - Output Chat responses into Blueprint (in a structured way).
// - Schema editor, Outline editor, Document editor, Sheet model.

/**
 * Hierarchical data structure.
 */
namespace Proposition {
  const Fields = Schema.Struct({
    text: Schema.String,
    children: Schema.optional(Schema.mutable(Schema.Array(Schema.suspend((): Schema.Schema<Fields> => Fields)))).pipe(
      Schema.withConstructorDefault(() => []),
    ),
  });

  export interface Fields extends Schema.Schema.Type<typeof Fields> {}

  export const Object = Fields.pipe(
    Type.Obj({
      typename: 'dxos.org/type/Proposition',
      version: '0.1.0',
    }),
  );

  export interface Object extends Schema.Schema.Type<typeof Object> {}

  // TODO(burdon): Obfuscates Obj.make?
  export const make = (props: Pick<Object, 'text'>) => Obj.make(Object, Fields.make(props));
}

//
// Templates
// - Templates Registry service.
// - Extensible library of modules that can be selected out of the box.
// - Modules can be associated with tools and MoE.
//

export namespace Research {}

export namespace OKR {
  const Properties = Schema.Struct({
    objectives: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      name: 'Objectives',
      description: 'Qualitative, ambitious aspirations.',
    }),
    keyResults: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      name: 'Key Results',
      description: 'Quantitative metrics tracking progress towards those objectives.',
    }),
  }).annotations({
    description: 'A goal-setting framework defining Objectives and Key Results.',
  });

  const Object = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/OKR',
      version: '0.1.0',
    }),
  );

  export interface Object extends Schema.Schema.Type<Schema.mutable<typeof Object>> {}

  export const make = () => Obj.make(Object, { objectives: [], keyResults: [] });
}

/**
 * Create document (or outline or product description) then create an SWOT analysis object, then the AI will chat with you to create this outcome.
 */
export namespace SWOT {
  const Properties = Schema.Struct({
    subject: Schema.optional(Type.Ref(Proposition.Object)).annotations({
      description: 'Subject of the analysis, which could be a document or a structured object.',
    }),
    strengths: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      description: 'An attribute of the organization that is helpful in achieving its objectives.',
    }),
    weaknesses: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      description: 'A limitation or deficiency within the organization that could hinder its progress.',
    }),
    opportunities: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      description: 'An external factor that the organization could exploit to its advantage.',
    }),
    threats: Schema.mutable(Schema.Array(Proposition.Object)).annotations({
      description: 'An external factor that could potentially harm the organization.',
    }),
  }).annotations({
    description:
      'SWOT is a strategic planning technique used to evaluate the Strengths, Weaknesses, Opportunities, and Threats involved in a project or business venture.',
  });

  const Object = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/SWOT',
      version: '0.1.0',
    }),
  );

  export interface Any extends Schema.Schema.Type<Schema.mutable<typeof Object>> {}

  export const make = () => Obj.make(Object, { strengths: [], weaknesses: [], opportunities: [], threats: [] });
}

export namespace Plan {
  const Properties = Schema.Struct({
    name: Schema.String,
  });

  const Object = Properties.pipe(
    Type.Obj({
      typename: 'dxos.org/type/Plan',
      version: '0.1.0',
    }),
  );

  export interface Object extends Schema.Schema.Type<Schema.mutable<typeof Object>> {}

  export const make = ({ name }: Object) => Obj.make(Object, { name });
}

// TODO(burdon): Types or variants of a type?
export namespace Project {}
export namespace ProblemStatement {}
export namespace ValueProposition {}
export namespace CompetitiveAnalysis {}
export namespace GoToMarket {}
export namespace Itinerary {}
export namespace Tutorial {}
export namespace Manual {}
export namespace EmployeeReview {}
export namespace Review {}
export namespace CityGuide {}
export namespace TrainingPlan {}
export namespace HealthPlan {}

describe('analysis', () => {
  test('SWOT', ({ expect }) => {
    const analysis = SWOT.make();
    analysis.strengths.push(Proposition.make({ text: 'Unique decentralized object graph.' }));
    expect(analysis.strengths).toHaveLength(1);
  });
});
