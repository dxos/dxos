//
// Copyright 2025 DXOS.org
//

import * as Prompt from '@effect/cli/Prompt';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { FormBuilder } from '@dxos/cli-util';
import { Annotation, Database, type Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { getProperties } from '@dxos/effect';
import { Function, Trigger } from '@dxos/functions';
import { QueueAnnotation } from '@dxos/schema';

export type TriggerRemoteStatus = 'available' | 'not available' | 'n/a';

/**
 * Determines the remote status of a trigger.
 * Only timer/cron triggers can be checked for remote availability.
 */
export const getTriggerRemoteStatus = (trigger: Trigger.Trigger, remoteCronIds: string[]): TriggerRemoteStatus => {
  if (trigger.spec?.kind !== 'timer') {
    return 'n/a';
  }
  return remoteCronIds.includes(trigger.id) ? 'available' : 'not available';
};

/**
 * Pretty prints a trigger with ANSI colors.
 */
export const printTrigger = Effect.fn(function* (trigger: Trigger.Trigger, remoteStatus?: TriggerRemoteStatus) {
  const fn = trigger.function && (yield* Database.Service.load(trigger.function));

  return FormBuilder.make({
    title: trigger.id,
  }).pipe(
    FormBuilder.set(
      'status',
      trigger.enabled ? 'enabled' : 'disabled',
      trigger.enabled ? Ansi.green : Ansi.blackBright,
    ),
    FormBuilder.option('kind', Option.fromNullable(trigger.spec?.kind)),
    FormBuilder.option(
      'remote',
      Option.fromNullable(remoteStatus),
      Match.type<TriggerRemoteStatus>().pipe(
        Match.withReturnType<Ansi.Ansi>(),
        Match.when('available', () => Ansi.green),
        Match.when('not available', () => Ansi.yellow),
        Match.when('n/a', () => Ansi.blackBright),
        Match.exhaustive,
      ),
    ),
    FormBuilder.when(
      fn,
      FormBuilder.nest(
        'function',
        FormBuilder.make().pipe(FormBuilder.set('key', fn!.key), FormBuilder.set('dxn', fn!.dxn?.toString())),
      ),
    ),
    FormBuilder.nestedOption('spec', Option.fromNullable(trigger.spec).pipe(Option.map(printSpec))),
    FormBuilder.build,
  );
});

const printSpec = <T extends Trigger.Spec>(spec: T): FormBuilder.FormBuilder => {
  switch (spec.kind) {
    case 'timer':
      return printTimer(spec);
    case 'subscription':
      return printSubscription(spec);
    case 'webhook':
      return printWebhook(spec);
    case 'queue':
      return printQueue(spec);
    default:
      return FormBuilder.make({}).pipe(FormBuilder.set('unknown', 'Unknown spec type'));
  }
};

const printTimer = (spec: Trigger.TimerSpec) => FormBuilder.make({}).pipe(FormBuilder.set('cron', spec.cron));

const printSubscription = (spec: Trigger.SubscriptionSpec) =>
  FormBuilder.make({}).pipe(FormBuilder.set('query', spec.query?.raw ?? '[Query AST]'));

const printWebhook = (spec: Trigger.WebhookSpec) =>
  FormBuilder.make({}).pipe(FormBuilder.set('method', spec.method), FormBuilder.set('port', spec.port));

const printQueue = (spec: Trigger.QueueSpec) => FormBuilder.make({}).pipe(FormBuilder.set('queue', spec.queue));

/**
 * Prompts for input values based on an Effect schema.
 * First shows a multi-select to choose which properties to specify,
 * then prompts for values of the selected properties.
 * Required properties are automatically included and cannot be unselected.
 * @param schema - The Effect schema to prompt for
 * @param defaults - Optional default values to use as initial values and pre-select optional properties
 */
export const promptForSchemaInput = Effect.fn(function* (
  schema: Schema.Schema.AnyNoContext | undefined,
  defaults?: Record<string, any> | undefined,
) {
  if (!schema) {
    return {};
  }

  const ast = schema.ast;

  // Check if it's a struct/object type
  if (!SchemaAST.isTypeLiteral(ast)) {
    return {};
  }

  const properties = getProperties(ast);
  if (properties.length === 0) {
    return {};
  }

  // Separate required and optional properties
  const requiredProperties: typeof properties = [];
  const optionalProperties: typeof properties = [];

  for (const prop of properties) {
    if (prop.isOptional) {
      optionalProperties.push(prop);
    } else {
      requiredProperties.push(prop);
    }
  }

  // Build property info
  const propertyInfo = properties.map((prop) => {
    const key = prop.name.toString();
    return {
      prop,
      key,
      isRequired: !prop.isOptional,
    };
  });

  // Multi-select: show all properties and let user select which optional ones to include
  const selectedKeys = new Set<string>();

  // Required properties are automatically selected
  for (const info of propertyInfo) {
    if (info.isRequired) {
      selectedKeys.add(info.key);
    }
  }

  // Show required properties that will be automatically included
  if (requiredProperties.length > 0) {
    const requiredNames = requiredProperties.map((p) => {
      const info = propertyInfo.find((i) => i.prop === p);
      return info?.key ?? p.name.toString();
    });
    yield* Console.log(`Required properties (will be included): ${requiredNames.join(', ')}`);
  }

  // For optional properties, use multi-select to choose which ones to include
  if (optionalProperties.length > 0) {
    const optionalInfo = propertyInfo.filter((info) => !info.isRequired);
    const choices = optionalInfo.map((info) => {
      const hasDefault = defaults?.[info.key] !== undefined;
      const defaultText = hasDefault ? ` (current: ${JSON.stringify(defaults[info.key])})` : '';
      return {
        title: `${info.key}${defaultText}`,
        value: info.key,
        description: hasDefault ? 'Has default value' : undefined,
      };
    });

    const selected = yield* Prompt.multiSelect({
      message: 'Select optional properties to include:',
      choices,
    });

    // Add selected optional properties to selectedKeys
    for (const key of selected) {
      selectedKeys.add(String(key));
    }
  }

  // If no properties selected (shouldn't happen if there are required ones), return empty
  if (selectedKeys.size === 0) {
    return {};
  }

  // Prompt for values of selected properties
  const inputObj: Record<string, any> = {};

  for (const info of propertyInfo) {
    if (!selectedKeys.has(info.key)) {
      continue;
    }

    const key = info.key;
    const propType = info.prop.type;
    const schemaDefault = Option.getOrUndefined(SchemaAST.getDefaultAnnotation(propType));
    const defaultValue = defaults?.[key] ?? schemaDefault;

    if (SchemaAST.isBooleanKeyword(propType)) {
      const initialValue =
        typeof defaultValue === 'boolean' ? defaultValue : typeof schemaDefault === 'boolean' ? schemaDefault : false;
      const value = yield* Prompt.confirm({
        message: `${info.key}${defaults?.[key] !== undefined ? ` (current: ${defaults[key]})` : ''}:`,
        initial: initialValue,
      });
      inputObj[key] = value;
    } else if (SchemaAST.isNumberKeyword(propType)) {
      const currentValue = typeof defaultValue === 'number' ? String(defaultValue) : '';
      const valueStr = yield* Prompt.text({
        message: `${info.key}${currentValue ? ` (current: ${currentValue}, press Enter to keep)` : ''}:`,
      }).pipe(Prompt.run);
      inputObj[key] = valueStr === '' && defaultValue !== undefined ? defaultValue : parseFloat(valueStr) || 0;
    } else if (SchemaAST.isStringKeyword(propType)) {
      const currentValue = typeof defaultValue === 'string' ? defaultValue : '';
      const valueStr = yield* Prompt.text({
        message: `${info.key}${currentValue ? ` (current: ${currentValue}, press Enter to keep)` : ''}:`,
      }).pipe(Prompt.run);
      inputObj[key] = valueStr === '' && defaultValue !== undefined ? defaultValue : valueStr;
    } else if (Ref.isRefType(propType)) {
      const isDefaultTemplate =
        typeof defaultValue === 'string' && defaultValue.startsWith('{{') && defaultValue.endsWith('}}');
      const useTemplate = yield* Prompt.confirm({
        message: `Use a template to specify ${info.key}?${isDefaultTemplate ? ' (current: template)' : ''}`,
        initial: isDefaultTemplate,
      });
      if (useTemplate) {
        const currentValue = typeof defaultValue === 'string' ? defaultValue : '';
        const templateStr = yield* Prompt.text({
          message: `${info.key} template${currentValue ? ` (current: ${currentValue}, press Enter to keep)` : ''}:`,
        }).pipe(Prompt.run);
        inputObj[key] = templateStr === '' && defaultValue !== undefined ? defaultValue : templateStr;
      } else {
        const annotation = Annotation.ReferenceAnnotation.getFromAst(propType).pipe(Option.getOrThrow);
        const objects = yield* Database.Service.runQuery(Filter.typename(annotation.typename));
        if (objects.length === 0) {
          inputObj[key] = undefined;
        } else {
          const selected = yield* Prompt.select({
            message: `Select ${info.key}:`,
            choices: objects.map((obj: Entity.Any) => ({
              title: Obj.getLabel(obj) ?? obj.id,
              value: Ref.make(obj),
              description: Obj.getDescription(obj),
            })),
          });
          inputObj[key] = selected;
        }
      }
    } else {
      // For other types, prompt as string and let validation handle it
      const currentValue = defaultValue !== undefined ? String(defaultValue) : '';
      const valueStr = yield* Prompt.text({
        message: `${info.key}${currentValue ? ` (current: ${currentValue}, press Enter to keep)` : ''}:`,
      }).pipe(Prompt.run);
      inputObj[key] = valueStr === '' && defaultValue !== undefined ? defaultValue : valueStr;
    }
  }

  return inputObj;
});

/**
 * Selects a function interactively from available functions in the database.
 * Queries the database for functions and prompts the user to select one.
 */
export const selectFunction = Effect.fn(function* () {
  const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));

  if (functions.length === 0) {
    return yield* Effect.fail(new Error('No functions available'));
  }

  const selected = yield* Prompt.select({
    message: 'Select a function:',
    choices: functions.map((fn: Function.Function) => ({
      title: fn.name ?? fn.id,
      value: fn.id,
      description: fn.description,
    })),
  });

  return String(selected);
});

/**
 * Selects a trigger interactively from available triggers.
 * If kind is provided, filters triggers by that kind.
 * Queries the database for triggers and prompts the user to select one.
 */
export const selectTrigger = Effect.fn(function* (kind?: Trigger.Kind) {
  const triggers = yield* Database.Service.runQuery(Filter.type(Trigger.Trigger));
  const filteredTriggers = kind ? triggers.filter((trigger) => trigger.spec?.kind === kind) : triggers;

  if (filteredTriggers.length === 0) {
    return yield* Effect.fail(new Error(kind ? `No ${kind} triggers available` : 'No triggers available'));
  }

  const choices = yield* Effect.all(
    filteredTriggers.map((trigger) =>
      Effect.gen(function* () {
        const fn = trigger.function ? yield* Database.Service.load(trigger.function) : undefined;
        const functionName = fn && Obj.instanceOf(Function.Function, fn) ? (fn.name ?? fn.key ?? fn.id) : undefined;
        const title = functionName ?? trigger.id;
        const description = `${trigger.enabled ? 'enabled' : 'disabled'} - ${trigger.spec?.kind ?? 'unknown'}`;

        return {
          title,
          value: trigger.id,
          description,
        };
      }),
    ),
  );

  const selected = yield* Prompt.select({
    message: kind ? `Select a ${kind} trigger:` : 'Select a trigger:',
    choices,
  });

  return String(selected);
});

/**
 * Selects a queue interactively from available queues in the database.
 * Queries schemas with QueueAnnotation, then queries objects of those types,
 * and extracts queue DXNs from the objects' queue properties.
 */
export const selectQueue = Effect.fn(function* () {
  // Query schema registry for schemas with QueueAnnotation
  const schemas = yield* Database.Service.runSchemaQuery({ location: ['database', 'runtime'] });

  // Filter schemas that have QueueAnnotation
  const queueSchemas = schemas.filter((schema) => {
    const annotation = QueueAnnotation.get(schema);
    return Option.isSome(annotation) && annotation.value === true;
  });

  if (queueSchemas.length === 0) {
    return yield* Effect.fail(new Error('No schemas with Queue annotation found'));
  }

  // Collect all objects with queues
  const queueChoices: Array<{ title: string; value: string; description?: string }> = [];

  // Process each schema, skipping ones that fail
  for (const schema of queueSchemas) {
    yield* Effect.gen(function* () {
      const typename = Type.getTypename(schema);
      const objects = yield* Database.Service.runQuery(Filter.type(typename));

      for (const obj of objects) {
        // Access the queue property (which is a Ref<Queue>)
        const queueRef = (obj as any).queue as Ref.Ref<any> | undefined;
        if (!queueRef) {
          continue;
        }

        const queueDxn = queueRef.dxn.toString();
        const label = Obj.getLabel(obj) ?? obj.id;
        const description = Obj.getTypename(obj);

        queueChoices.push({
          title: label,
          value: queueDxn,
          description,
        });
      }
    }).pipe(Effect.catchAll(() => Effect.void));
  }

  if (queueChoices.length === 0) {
    return yield* Effect.fail(new Error('No objects with queue properties found'));
  }

  const selected = yield* Prompt.select({
    message: 'Select a queue:',
    choices: queueChoices,
  });

  return String(selected);
});

/**
 * Pretty prints trigger removal result with ANSI colors.
 */
export const printTriggerRemoved = (id: string) =>
  FormBuilder.make({ title: 'Trigger removed' }).pipe(FormBuilder.set('id', id), FormBuilder.build);
