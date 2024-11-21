//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { TriggerKind } from '@dxos/functions/src';
import { FunctionTriggerSchema, type FunctionTriggerType, type FunctionTrigger } from '@dxos/functions/types';
import { useTranslation } from '@dxos/react-ui';
import { Form, SelectInput } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';

export type TriggerEditorProps = {
  // space: Space;
  trigger: FunctionTrigger;
};

export const TriggerEditor = ({ trigger }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  // const scripts = useQuery(space, Filter.schema(ScriptType));
  // const script = useMemo(() => scripts.find((script) => script.id === trigger.function), [trigger.function, scripts]);

  // useLocalTriggerManager(space);

  // useEffect(() => {
  //   void space.db.schemaRegistry
  //     .query()
  //     .then((schemas) => {
  //       // TODO(zan): We should solve double adding of stored schemas in the schema registry.
  //       state.schemas = distinctBy([...state.schemas, ...schemas], (schema) => schema.typename).sort((a, b) =>
  //         a.typename < b.typename ? -1 : 1,
  //       );
  //     })
  //     .catch(() => {});
  // }, [space]);

  // Keen an enriched version of the schema in memory so we can share it with prompt editor.
  // useEffect(() => {
  //   const spec = trigger.spec;
  //   invariant(spec);
  //   if (spec.type === 'subscription') {
  //     if (spec.filter) {
  //       const type = spec.filter.type;
  //       const foundSchema = state.schemas.find((schema) => schema.typename === type);
  //       if (foundSchema) {
  //         state.selectedSchema[trigger.id] = foundSchema;
  //       }
  //     }
  //   }
  //   // TODO(burdon): API issue.
  // }, [JSON.stringify(trigger.spec), state.schemas]);

  // useEffect(() => {
  //   if (!trigger.meta) {
  //     const extension = getFunctionMetaExtension(trigger, script);
  //     trigger.meta = extension?.initialValue?.();
  //   }
  // }, [trigger.function, trigger.meta]);

  return (
    <Form<FunctionTriggerType>
      schema={FunctionTriggerSchema}
      values={trigger}
      filter={(props) => props.filter((p) => p.name !== 'meta')}
      Custom={{
        ['function' satisfies keyof FunctionTriggerType]: (props) => (
          <SelectInput<FunctionTriggerType>
            {...props}
            // TODO(burdon): Query for functions.
            options={[].map((value) => ({
              value,
              label: value,
            }))}
          />
        ),
        ['spec.type' as const]: (props) => (
          <SelectInput<FunctionTriggerType>
            {...props}
            options={Object.values(TriggerKind).map((kind) => ({
              value: kind,
              label: t(`trigger type ${kind}`),
            }))}
          />
        ),
      }}
    />
  );
};
