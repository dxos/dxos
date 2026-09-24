//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import * as Task from './Task.ts';

/**
 * One pre-baked answer an asker offers. `title` is the key — it is what a reader clicks and what
 * lands in {@link Question.selectedAnswer} — so an option carries no id of its own: a question with
 * two options reading the same is a badly written question, not a shape to model around.
 */
export const AnswerOption = Schema.Struct({
  title: Schema.String.annotate({ title: 'Title' }),
  /** Expanded rationale, shown under the option. */
  description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
}).annotate({ title: 'Answer Option' });
export type AnswerOption = Schema.Schema.Type<typeof AnswerOption>;

/**
 * A question an agent put to a person, attached to the task it blocks.
 *
 * An object rather than a message because it outlives the turn that asked it: the task points at it
 * as an artifact, and the agent that resumes reads the answer back off it.
 *
 * `options` are a convenience, never a constraint — a surface rendering this MUST also accept
 * free-form text, since the point of asking is that the asker did not know.
 */
export class Question extends Type.makeObject<Question>(DXN.make('org.dxos.type.question', '0.1.0'))(
  Schema.Struct({
    /** The question itself, as put to the reader. */
    text: Schema.String.annotate({ title: 'Question' }),

    /** Why it is being asked — what the agent is blocked on, in one or two sentences. */
    context: Schema.optional(Schema.String.annotate({ title: 'Context' })),

    /** Suggested answers. May be empty; free-form is always allowed. */
    options: Schema.optional(Schema.Array(AnswerOption).annotate({ title: 'Options' })),

    /**
     * The task this question blocks. Optional because a question can outlive its task, and because
     * a caller outside the planning tool may have none — readers must handle its absence.
     */
    task: Schema.optional(Ref.Ref(Task.Task).annotate({ title: 'Task' })),

    /**
     * The conversation feed to resume once answered. Held as an unknown ref because the feed's type
     * lives in `@dxos/assistant`, which depends on this package — the ref is resolved by the
     * surface that answers, not here.
     */
    conversation: Schema.optional(Ref.Ref(Obj.Unknown).pipe(Annotation.FormInputAnnotation.set(false))),

    /**
     * What the reader answered — the chosen option's `title`, or free-form text. Its presence is
     * what "answered" means; there is no separate flag to fall out of step with it.
     */
    selectedAnswer: Schema.optional(Schema.String.annotate({ title: 'Answer' })),

    asked: Format.DateTime.annotate({ title: 'Asked' }),
    answered: Schema.optional(Format.DateTime.annotate({ title: 'Answered' })),
  }).pipe(
    LabelAnnotation.set(['text']),
    Annotation.IconAnnotation.set({ icon: 'ph--question--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Question>, 'asked'> & { asked?: string };

/** `asked` defaults to now: every caller would otherwise stamp it, and one that forgets writes a lie. */
export const make = ({ asked, ...props }: MakeProps): Question =>
  Obj.make(Question, { ...props, asked: asked ?? new Date().toISOString() });

/**
 * A question is answered exactly when it carries an answer. Takes the field rather than the object
 * so a React snapshot — which is the shape a card actually renders from — answers the same way.
 */
export const isAnswered = (question: Pick<Question, 'selectedAnswer'>): boolean =>
  question.selectedAnswer !== undefined;

/**
 * Records an answer. Blank text is rejected rather than stored, so an empty submission cannot
 * silently mark a question answered and resume an agent with nothing to go on.
 */
export const answer = (question: Question, text: string, options: { date?: string } = {}): boolean => {
  const trimmed = text.trim();
  if (trimmed === '') {
    return false;
  }
  Obj.update(question, (question) => {
    question.selectedAnswer = trimmed;
    question.answered = options.date ?? new Date().toISOString();
  });
  return true;
};
