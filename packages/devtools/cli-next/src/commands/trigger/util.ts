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

import { Database, Filter, Obj } from '@dxos/echo';
import { getProperties } from '@dxos/effect';
import { Function, Trigger } from '@dxos/functions';

import { FormBuilder } from '../../util';

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

  return (
    FormBuilder.of({
      title:
        fn && Obj.instanceOf(Function.Function, fn)
          ? (fn.name ?? fn.key ?? fn.id)
          : (trigger.function?.dxn?.toString() ?? 'Unknown'),
    })
      .set({
        key: 'status',
        value: trigger.enabled ? 'enabled' : 'disabled',
        color: trigger.enabled ? Ansi.green : Ansi.blackBright,
      })
      .set({
        key: 'id',
        value: trigger.id,
      })
      .set({
        key: 'kind',
        value: trigger.spec?.kind,
      })
      .set({
        key: 'remote',
        value: remoteStatus,
        color: Match.type<TriggerRemoteStatus>().pipe(
          Match.withReturnType<Ansi.Ansi>(),
          Match.when('available', () => Ansi.green),
          Match.when('not available', () => Ansi.yellow),
          Match.when('n/a', () => Ansi.blackBright),
          Match.exhaustive,
        ),
      })
      .set({
        key: 'spec',
        value: trigger.spec && printSpec(trigger.spec),
      })
      // TODO(burdon): Remove?
      // .set({
      //   key: 'input node',
      //   value: trigger.inputNodeId,
      // })
      // .set({
      //   key: 'input',
      //   value: (builder) =>
      //     builder
      //       .each(Object.entries(trigger.input ?? {}), ([key, value]) =>
      //         builder.set({
      //           key,
      //           value: typeof value === 'string' ? value : JSON.stringify(value),
      //         }),
      //       )
      //       .build(),
      // })
      .build()
  );
});

const printSpec = <T extends Trigger.Spec>(spec: T): FormBuilder => {
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
      return FormBuilder.of({}).set({ key: 'unknown', value: 'Unknown spec type' });
  }
};

const printTimer = (spec: Trigger.TimerSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'cron', value: spec.cron });

const printSubscription = (spec: Trigger.SubscriptionSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'query', value: spec.query?.raw ?? '[Query AST]' });

const printWebhook = (spec: Trigger.WebhookSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'method', value: spec.method })
    .set({ key: 'port', value: spec.port });

const printQueue = (spec: Trigger.QueueSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'queue', value: spec.queue });

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
 * Selects a function interactively from available functions.
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
