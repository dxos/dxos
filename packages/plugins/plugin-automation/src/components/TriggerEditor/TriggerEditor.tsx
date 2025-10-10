//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { FunctionTrigger, FunctionType, ScriptType } from '@dxos/functions';
import { Filter, Ref, type Space, useQuery } from '@dxos/react-client/echo';
import { Input, useDensityContext, useElevationContext, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor, createBasicExtensions, createThemeExtensions } from '@dxos/react-ui-editor';
import { type CustomInputMap, Form, InputHeader, SelectInput, useRefQueryLookupHandler } from '@dxos/react-ui-form';
import { inputTheme, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

import { FunctionInputEditor, type FunctionInputEditorProps } from './FunctionInputEditor';
import { SpecSelector } from './SpecSelector';

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTrigger;
  // TODO(wittjosiah): This needs to apply to whole spec but currently only applies to spec.kind & spec.query.
  readonlySpec?: boolean;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, readonlySpec, onSave, onCancel }: TriggerEditorProps) => {
  const handleSave = (values: FunctionTrigger) => {
    onSave?.(values);
  };

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });
  const Custom = useCustomInputs({ space, readonlySpec, onQueryRefOptions: handleRefQueryLookup });

  return (
    <Form
      outerSpacing={false}
      Custom={Custom}
      schema={FunctionTrigger}
      values={trigger}
      onSave={handleSave}
      onCancel={onCancel}
      onQueryRefOptions={handleRefQueryLookup}
    />
  );
};

const useCustomInputs = ({
  space,
  readonlySpec,
  onQueryRefOptions,
}: {
  space: Space;
  readonlySpec?: boolean;
  onQueryRefOptions: FunctionInputEditorProps['onQueryRefOptions'];
}) => {
  const { t } = useTranslation(meta.id);
  const functions = useQuery(space, Filter.type(FunctionType));
  const workflows = useQuery(space, Filter.type(ComputeGraph));
  const scripts = useQuery(space, Filter.type(ScriptType));

  return useMemo(
    (): CustomInputMap => ({
      // Function selector.
      ['function' satisfies keyof FunctionTrigger]: (props) => {
        const getValue = useCallback(() => {
          const formValue = props.getValue();
          if (Ref.isRef(formValue)) {
            return formValue.dxn.toString() as string;
          }
          return undefined;
        }, [props]);

        const handleOnValueChange = useCallback(
          (_type: any, dxnString: string) => {
            const dxn = Type.DXN.parse(dxnString);
            if (dxn) {
              const ref = Ref.fromDXN(dxn);
              props.onValueChange('object', ref);
            }
          },
          [props.onValueChange],
        );

        return (
          <SelectInput
            {...props}
            getValue={getValue as any}
            onValueChange={handleOnValueChange}
            options={getWorkflowOptions(workflows).concat(getFunctionOptions(scripts, functions))}
          />
        );
      },

      // Spec selector.
      ['spec.kind' as const]: (props) => <SpecSelector {...props} readonly={readonlySpec ? 'disabled-input' : false} />,

      // TODO(wittjosiah): Copied from ViewEditor.
      // Query input editor.
      ['spec.query' as const]: (props) => {
        const { themeMode } = useThemeContext();
        const density = useDensityContext();
        const elevation = useElevationContext();
        const value = props.getValue() as any;

        // TODO(wittjosiah): Including props.onValueChange in deps causes infinite loop.
        const handleChange = useCallback(
          (text: string) => props.onValueChange('object', { ...value, string: text }),
          [],
        );

        const extensions = useMemo(
          () => [
            createBasicExtensions({ readOnly: readonlySpec, placeholder: t('query placeholder') }),
            createThemeExtensions({ themeMode }),
          ],
          [],
        );

        // TODO(wittjosiah): This is probably not the right way to do these styles.
        return (
          <Input.Root>
            <InputHeader label={props.label} />
            <Editor
              classNames={mx(
                inputTheme.input({ density, elevation }),
                'flex items-center',
                'focus-within:bg-focusSurface focus-within:border-separator focus-within:hover:bg-focusSurface',
              )}
              extensions={extensions}
              value={value.string}
              onChange={handleChange}
            />
          </Input.Root>
        );
      },

      // Function input editor.
      ['input' as const]: (props) => (
        <FunctionInputEditor {...props} functions={functions} onQueryRefOptions={onQueryRefOptions} />
      ),
    }),
    [workflows, scripts, functions, readonlySpec],
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: ScriptType[], functions: FunctionType[]) => {
  const getLabel = (fn: FunctionType) => scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:echo:@:${fn.id}` }));
};
