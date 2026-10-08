//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selection: a schema-driven form over the properties every selected element
// declares alike (one element: its whole schema; a node's from its registry definition), so every field
// a type has is editable without a per-type form. Values the elements disagree on show as mixed; an edit
// writes only the changed fields, to every element, as one batch of `update` intents.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type Database } from '@dxos/echo';
import {
  Form,
  type FormFieldMap,
  type FormFieldOverride,
  type FormFieldRenderer,
  type FormUpdateMeta,
  type RefFieldDataProps,
} from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useRegistry } from '../../hooks/index.ts';
import { SCENE_OVERLAY_ATTRIBUTE } from '../../hooks/useWheel.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { nodeDef } from '../../model/node-def.ts';
import { type Projection } from '../../model/projection.ts';
import { type NodeRegistry, defaultNodeRegistry } from '../../model/registry.ts';
import { NO_STYLES } from '../../model/store.ts';
import {
  BaseNode,
  CurveLink,
  type Element,
  type Layer,
  LineLink,
  type LinkType,
  type Node,
  type NodeStyle,
  SmartLink,
  SplineLink,
  type StyleClass,
  type StyleMap,
  getElement,
  isLink,
  isNoteNode,
  isPortalNode,
  showsContents,
} from '../../model/types.ts';
import { elementLayer, sceneLayers } from '../../utils/layers.ts';
import { MAX_PORTS_PER_SIDE, portsPerSideOf } from '../../utils/ports.ts';
import { commonSchema, mergeValues, patchValues } from '../../utils/properties.ts';
import { type SceneOption } from '../../utils/scenes.ts';
import { flipLink } from '../../utils/shapes.ts';
import { classedLink, classedNode, resolveStyle, splitClassEdit } from '../../utils/style.ts';
import { AlignField } from './AlignField.tsx';
import { ClassField, StyleClassesContext } from './ClassField.tsx';
import { FontField } from './FontField.tsx';
import { LayerField, LayersContext } from './LayerField.tsx';
import { SceneField, SceneOptionsContext } from './SceneField.tsx';
import { OutlineStyleField, StyleGridField } from './StyleGrid.tsx';

/** Identity, ordering and geometry lists are the surface's, not the user's. */
const HIDDEN = ['id', 'type', 'z', 'ports', 'points', 'source', 'target'];

/**
 * A string list as one entry per line: a UML compartment reads as a block of text, so a textarea
 * beats the generic array field's row of inputs. Blank lines survive while typing (they round-trip
 * through split/join) and are dropped on blur, when the form saves.
 */
export const LinesField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const lines: string[] = getValue() ?? [];
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <Input.Textarea
        rows={4}
        classNames='font-mono'
        disabled={!!readonly}
        value={lines.join('\n')}
        onChange={(event) => onValueChange(type, event.target.value.split('\n'))}
        onBlur={(event) => {
          onValueChange(
            type,
            lines.map((line) => line.trim()).filter((line) => line.length > 0),
          );
          onBlur(event);
        }}
      />
    </Form.Field>
  );
};

/** Renderers by field path the panel always uses (the style grid); node types add their own (`NodeDef.fields`). */
export const DEFAULT_FIELDS: FormFieldMap = {
  'style.hue': StyleGridField,
  'style.alignHorizontal': AlignField,
  'style.fontFamily': FontField,
  'scene': SceneField,
  'class': ClassField,
  'layer': LayerField,
};

const LINK_SCHEMAS: Record<LinkType, Schema.Codec<any, any>> = {
  line: LineLink,
  curve: CurveLink,
  spline: SplineLink,
  smart: SmartLink,
};

/** An element's own schema; a type the registry does not know gets the core base's (`BaseNode`, or a line). */
const schemaOf = (nodes: NodeRegistry, element: Element): Schema.Codec<any, any> =>
  isLink(element) ? (LINK_SCHEMAS[element.type] ?? LineLink) : (nodeDef(nodes, element)?.schema ?? BaseNode);

/** Where a type places its text unless styled otherwise: a note from the top left, a label in the middle. */
const textAlign = (node: Node): Pick<NodeStyle, 'alignHorizontal' | 'alignVertical'> =>
  isNoteNode(node)
    ? { alignHorizontal: 'left', alignVertical: 'top' }
    : { alignHorizontal: 'center', alignVertical: 'middle' };

/**
 * What the form shows for an element: what the view draws, so its class's look, an unset fill, border or Show
 * contents read as they look and an unset port count as the type's.
 */
const formValues = (
  nodes: NodeRegistry,
  element: Element,
  styles: StyleMap,
  layers: readonly Layer[],
): Record<string, unknown> =>
  isLink(element)
    ? { ...element, layer: elementLayer(element, layers), style: classedLink(element, styles).style }
    : {
        ...element,
        layer: elementLayer(element, layers),
        style: { ...textAlign(element), ...resolveStyle(classedNode(element, styles).style) },
        portsPerSide: portsPerSideOf(nodes, element),
        ...(isPortalNode(element) ? { contents: showsContents(element) } : {}),
      };

/**
 * How the panel presents fields. Ranges are the editor's, not the model's: a check on the stored schema would
 * make a record outside them (an older or imported scene) fail validation and drop out of the scene. The style
 * grid at `style.hue` also sets `style.tone`, which has no field of its own.
 */
const FIELD_OVERRIDES: Record<string, FormFieldOverride> = {
  'style.hue': { label: 'Style' },
  'style.tone': { hidden: true },
  'style.alignVertical': { hidden: true },
  'style.fontSize': { hidden: true },
  'portsPerSide': { min: 1, max: MAX_PORTS_PER_SIDE, step: 1 },
  'scene': { label: 'Scene' },
  'layer': { label: 'Layer' },
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The selection by kind, e.g. "3 nodes, 2 links". */
const describeSelection = (elements: readonly Element[]) => {
  const links = elements.filter(isLink).length;
  const nodes = elements.length - links;
  return [nodes > 0 && plural(nodes, 'node'), links > 0 && plural(links, 'link')].filter(Boolean).join(', ');
};

export type PropertiesProps = Util.ThemedClassName<{
  projection: Projection;
  atoms: SceneViewAtoms;
  nodes?: NodeRegistry;
  fields?: FormFieldMap;
  /** Show the fields without letting them change; also implied by a projection that cannot `update`. */
  readonly?: boolean;
  /** The database a reference field picks from; without it reference fields are read-only. */
  db?: Database.Database;
  /** Narrows a reference field's candidates (e.g. to objects of one kind). */
  getOptions?: RefFieldDataProps['getOptions'];
  /** A host's per-selection field overrides (e.g. a field it allows only in some states), over the panel's own. */
  overrides?: (elements: readonly Element[]) => Record<string, FormFieldOverride>;
  /** The scenes a scene shape may open (`sceneOptions`); without them its scene is not editable here. */
  sceneOptions?: readonly SceneOption[];
  /** The drawing's style classes (`SceneStore.styles`); without them elements take no class. */
  styles?: Atom.Writable<StyleMap>;
  /** Moves the selection into a new scene (`groupIntoScene`); offered for a selection of several elements. */
  onGroup?: () => void;
}>;

export const Properties = ({
  classNames,
  projection,
  atoms,
  nodes = defaultNodeRegistry,
  fields,
  readonly: readonlyProp = false,
  db,
  getOptions,
  overrides,
  sceneOptions,
  styles,
  onGroup,
}: PropertiesProps) => {
  const registry = useRegistry();
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const elements = useMemo(() => [...selection].flatMap((id) => getElement(scene, id) ?? []), [scene, selection]);
  const readonly = readonlyProp || !projection.capabilities.update;
  const styleMap = useAtomValue(styles ?? NO_STYLES);
  const layers = useMemo(() => sceneLayers(scene), [scene]);

  // Keyed by the selected types, so the schema (and the form built on it) holds while values change under it.
  const typesKey = [...new Set(elements.map((element) => element.type))].sort().join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => commonSchema(elements.map((element) => schemaOf(nodes, element))), [typesKey, nodes]);
  const { values, fieldOverrides } = useMemo(() => {
    const shown = elements.map((element) => formValues(nodes, element, styleMap, layers));
    const { values, mixed } = mergeValues(shown, Object.keys(shown[0] ?? {}));
    // A value the elements disagree on shows as indeterminate until it is edited, then applies to all of them.
    const fieldOverrides: Record<string, FormFieldOverride> = {
      ...FIELD_OVERRIDES,
      ...(sceneOptions ? {} : { scene: { hidden: true } }),
      ...(styles ? {} : { class: { hidden: true } }),
      ...overrides?.(elements),
    };
    for (const path of mixed) {
      fieldOverrides[path] = { ...fieldOverrides[path], indeterminate: true };
    }
    return { values, fieldOverrides };
  }, [elements, nodes, overrides, sceneOptions, styles, styleMap, layers]);

  const onSave = useCallback(
    (values: Record<string, unknown>, { changed }: FormUpdateMeta<Record<string, unknown>>) => {
      const paths = Object.keys(changed).filter((path) => changed[path as keyof typeof changed]);
      // A classed element's look is its class's: an edit of it restyles the class, and so every element deriving it.
      const classes: Record<string, StyleClass> = {};
      const intents = elements.map((element) => {
        const shown = formValues(nodes, element, styleMap, layers);
        const patch = patchValues(shown, values, paths);
        const styleClass = styles && element.class ? (classes[element.class] ?? styleMap[element.class]) : undefined;
        // Taking a class drops the element's own look, so it derives the class's whole rather than in part.
        if (typeof patch.class === 'string') {
          return { kind: 'update' as const, id: element.id, values: { ...patch, style: undefined } };
        }
        if (!styleClass || !('style' in patch)) {
          return { kind: 'update' as const, id: element.id, values: patch };
        }
        // A link's look is the common base of its class's style; a node's, the whole of it.
        const look = isLink(element)
          ? classedLink(element, styleMap).style
          : resolveStyle(classedNode(element, styleMap).style);
        const split = splitClassEdit(look, patch.style, styleClass.style ?? {}, element.style);
        classes[styleClass.id] = { ...styleClass, style: split.classLook };
        return { kind: 'update' as const, id: element.id, values: { ...patch, style: split.own } };
      });
      if (styles && Object.keys(classes).length > 0) {
        registry.set(styles, { ...styleMap, ...classes });
      }
      projection.apply({ kind: 'batch', intents });
    },
    [projection, elements, nodes, styles, styleMap, layers, registry],
  );

  // A new class takes the selected element's look, and the element then follows it rather than carrying its own.
  const single = elements.length === 1 ? elements[0] : undefined;
  const onCreateClass = useCallback(() => {
    if (!styles || !single) {
      return;
    }
    const id = `class-${crypto.randomUUID()}`;
    const name = `Class ${Object.keys(styleMap).length + 1}`;
    const style = isLink(single) ? classedLink(single, styleMap).style : classedNode(single, styleMap).style;
    const styleClass: StyleClass = { id, name, ...(style ? { style } : {}) };
    registry.set(styles, { ...styleMap, [id]: styleClass });
    projection.apply({ kind: 'update', id: single.id, values: { class: id, style: undefined } });
  }, [styles, single, styleMap, registry, projection]);

  // Reverses every selected link (source and target swap; an arrow comes to point the other way), as one batch.
  const links = useMemo(() => elements.filter(isLink), [elements]);
  const onFlip = useCallback(() => {
    projection.apply({
      kind: 'batch',
      intents: links.map((link) => ({ kind: 'update' as const, id: link.id, values: flipLink(link) })),
    });
    // A spline's control points run the other way after a flip, so a selected point's index names another one.
    registry.set(atoms.point, undefined);
  }, [projection, links, registry, atoms.point]);

  // The selected node types' own renderers over the panel's; a host's `fields` win over both. One style picker for
  // every kind: its fill rows only when every element is a node, since a link has a colour but no fill.
  const fieldMap = useMemo(
    () => ({
      ...DEFAULT_FIELDS,
      ...(elements.some(isLink) ? { 'style.hue': OutlineStyleField } : {}),
      ...Object.assign(
        {},
        ...elements.map((element) => (isLink(element) ? {} : (nodeDef(nodes, element)?.fields ?? {}))),
      ),
      ...fields,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typesKey, nodes, fields],
  );

  if (elements.length === 0) {
    return (
      <div
        className={mx('flex flex-col overflow-hidden', classNames)}
        data-testid='properties'
        {...{ [SCENE_OVERLAY_ATTRIBUTE]: true }}
      >
        <div className='p-2 text-sm text-fg-muted'>Select a node or link to edit its properties.</div>
      </div>
    );
  }

  const summary = elements.length > 1 && `${describeSelection(elements)}${schema ? '' : ' — no shared properties'}`;
  return (
    <div
      className={mx('flex flex-col overflow-hidden', classNames)}
      data-testid='properties'
      {...{ [SCENE_OVERLAY_ATTRIBUTE]: true }}
    >
      <Toolbar.Root data-testid='properties-toolbar'>
        {onGroup && elements.length > 1 && elements.some((element) => !isLink(element)) && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--frame-corners--regular'
            label='New scene from selection'
            disabled={readonly}
            data-testid='properties-group'
            onClick={onGroup}
          />
        )}
        {styles && single && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--swatches--regular'
            label='New class from selection'
            disabled={readonly}
            data-testid='properties-new-class'
            onClick={onCreateClass}
          />
        )}
        {links.length > 0 && links.length === elements.length && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--arrows-left-right--regular'
            label='Flip direction'
            disabled={readonly}
            data-testid='properties-flip'
            onClick={onFlip}
          />
        )}
      </Toolbar.Root>
      {schema ? (
        <LayersContext.Provider value={layers}>
          <StyleClassesContext.Provider value={styleMap}>
            <SceneOptionsContext.Provider value={sceneOptions ?? []}>
              <Form.Root
                key={[...selection].join()}
                schema={schema}
                values={values}
                fieldOverrides={fieldOverrides}
                fieldMap={fieldMap}
                db={db}
                getOptions={getOptions}
                readonly={readonly}
                autoSave
                onSave={onSave}
              >
                {/* Scrolling: the panel is as tall as its host, and a long form (a class with many members) scrolls inside it. */}
                <Form.Viewport scroll>
                  <Form.Content>
                    <Form.Fields exclude={HIDDEN} />
                    {summary && (
                      <p className='text-sm text-fg-muted' data-testid='properties-summary'>
                        {summary}
                      </p>
                    )}
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            </SceneOptionsContext.Provider>
          </StyleClassesContext.Provider>
        </LayersContext.Provider>
      ) : (
        <p className='p-2 text-sm text-fg-muted' data-testid='properties-summary'>
          {summary}
        </p>
      )}
    </div>
  );
};
