import * as Toolkit from '@effect/ai/Toolkit';
import * as Tool from '@effect/ai/Tool';
import { trim } from '@dxos/util';
import * as Schema from 'effect/Schema';
import { Effect } from 'effect';
import * as Layer from 'effect/Layer';
import { DatabaseService } from '@dxos/echo-db';
import { Organization, Person, Task } from '@dxos/types';
import { Filter, Obj, Query, Ref } from '@dxos/echo';

/**
 * Toolkit for executing JavaScript code with access to the database and core types.
 */
export class CodeExecutionToolkit extends Toolkit.make(
  Tool.make('code_sandbox', {
    description: trim`
      Executes JavaScript.

      The code must be a function body that has a "return" statement.
      You will not see console logs. You will only see the return value.

      <example>
        const a = 5;
        const b = 3;
        return a + b;
      </example>

      You have access to a datbase via the "db" variable. You can query, create and update objects.

      <example>
        const { objects } = await db.query(Query.type(Person)).run();
        return object.map(obj => ({ id: obj.id, name: obj.name }))
      </example>

      <example>
        const { id } = db.add(Obj.make(Organization, { name: 'Acme Corp' }));
        return id
      </example>

      <example>
        const acme = await db.query(Query.type(Organization, { name: 'Acme Corp' })).first();
        acme.name = 'New Name';
        return acme;
      </example>

      Objects can reference each other:

      <example>
        const org = await db.query(Query.type(Organization)).first();
        const person = db.add(Obj.make(Person, { name: 'John', organization: Ref.make(org) }));
        return { person, organization: org };
      </example>

      Avaliable types:
        - Organization
        - Person
        - Task
    `,
    parameters: {
      code: Schema.String.annotations({
        description: 'Valid JavaScript to execute in the form of a function body.',
      }),
    },
  }),
) {}

/**
 * Code execution tool implemented using unsafe eval (new Function).
 * WARNING: This is a security risk and should only be used in controlled environments.
 */
export const EvalCodeExecutionLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { db } = yield* DatabaseService;
    return CodeExecutionToolkit.toLayer({
      code_sandbox: Effect.fnUntraced(function* ({ code }) {
        if (!code.includes('return')) {
          throw new Error('Code must contain a return statement');
        }

        console.log(`Executing:\n\n${code}`);

        const context = {
          Query,
          Obj,
          Filter,
          Ref,
          db,
          Person: Person.Person,
          Organization: Organization.Organization,
          Task: Task.Task,
        };

        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const func = new AsyncFunction(...Object.keys(context), code);
        const result = yield* Effect.promise(() => func(...Object.values(context)));
        console.log(`Result: ${JSON.stringify(result, null, 2)}`);

        return result;
      }),
    });
  }),
);
