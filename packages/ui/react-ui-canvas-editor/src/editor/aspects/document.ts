//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { sampleDocument } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type ModelIntent, findLayout } from '@dxos/scene';

import { withoutHidden } from '../scene-rows.ts';
import { type EditorConfig, type EditorDocument, type EditorTime, type HostOffers } from './context.ts';
import { type AspectOptions, type SceneEditorHostProps, editsInRole, keep, setChanged } from './host.ts';

/** Which writes the host offers, by the callbacks it passes. */
const offersOf = <C>(props: SceneEditorHostProps<C>): HostOffers => {
  const editing = editsInRole(props.role);
  return {
    model: props.onModelIntent !== undefined,
    layers: props.onLayersChange !== undefined,
    lock: editing && props.onReadonlyChange !== undefined,
    animation: props.shots !== undefined && props.onShotChange !== undefined,
    camera: props.onCameraChange !== undefined,
    clipboard: props.codec !== undefined,
  };
};

const sameOffers = (left: HostOffers, right: HostOffers): boolean =>
  left.model === right.model &&
  left.layers === right.layers &&
  left.lock === right.lock &&
  left.animation === right.animation &&
  left.camera === right.camera &&
  left.clipboard === right.clipboard;

/**
 * What the editor shows, and the one write path: each edit constrained by the layout's mode and recorded for undo, a
 * model edit or transaction as one step.
 */
export const createDocumentAspect = <C>(
  { registry, config, latest, store }: AspectOptions<C>,
  {
    editorConfig,
    time,
    path,
  }: {
    editorConfig: EditorConfig;
    time: EditorTime;
    /** The dimension's drill path, read lazily: the dimension is built over this aspect. */
    path: () => Atom.Atom<readonly string[]>;
  },
) => {
  const initial = latest.current.props;
  const picture = !editsInRole(initial.role);
  const atoms = {
    document: keep(initial.document),
    scene: keep(initial.scene),
    readonly: keep((initial.readonly ?? false) || picture),
    picture: keep(picture),
    host: keep(offersOf(initial)),
    sceneChoice: keep(initial.sceneChoice),
  };
  const rootLayout = Atom.keepAlive(
    Atom.make((get) => get(atoms.document).scenes.find((record) => record.id === get(atoms.scene))?.layout),
  );
  const layout = Atom.keepAlive(Atom.make((get) => get(path()).at(-1) ?? get(rootLayout)));
  const visible = Atom.keepAlive(Atom.make((get) => withoutHidden(get(atoms.document))));
  // While the Timeline panel's playhead is off the start (or it plays), the viewport draws the shot sampled there.
  const shown = Atom.keepAlive(
    Atom.make((get) => {
      const drawn = get(visible);
      const shots = get(time.atoms.shots);
      const timeline = (shots?.find((shot) => shot.id === get(time.atoms.shot)) ?? shots?.[0])?.timeline;
      const open = get(layout);
      const at = get(time.atoms.time);
      return timeline && open !== undefined && (get(time.atoms.playing) || at > 0)
        ? sampleDocument(drawn, open, timeline, at)
        : drawn;
    }),
  );

  // Inside a transaction, writes go straight to the host and the transaction records them as one step.
  let transacting = false;
  const intent = (target: string, edit: LayoutIntent) => {
    const { props, display } = latest.current;
    const record = config.constrain && findLayout(props.document, target);
    // Grid mode (guides off) snaps a lattice scene to the grid, as the canvas does; the engine's guides default on.
    const next =
      record && config.constrain
        ? config.constrain(record, edit, { snap: display.snap, lattice: display.guides !== false })
        : edit;
    if (!next) {
      return;
    }
    props.history && !transacting
      ? props.history.record(() => props.onIntent(target, next))
      : props.onIntent(target, next);
  };
  const modelIntent = (intent: ModelIntent): readonly string[] => {
    const { onModelIntent, readDocument, history } = latest.current.props;
    if (!onModelIntent) {
      return [];
    }
    const before = readDocument?.();
    const problems = onModelIntent(intent);
    problems.length === 0 && before && readDocument && !transacting && history?.recordDocument(before, readDocument());
    store.setNotice(problems.length > 0 ? problems.join(' ') : undefined);
    return problems;
  };
  const transaction = (change: () => void) => {
    const { history, readDocument } = latest.current.props;
    const before = history && !transacting ? readDocument?.() : undefined;
    if (!before || !readDocument) {
      change();
      return;
    }
    transacting = true;
    try {
      change();
    } finally {
      transacting = false;
    }
    history?.recordDocument(before, readDocument());
  };

  const aspect: EditorDocument = {
    config: editorConfig,
    atoms: { ...atoms, shown, rootLayout, layout },
    commands: {
      intent,
      modelIntent,
      transaction,
      setLayers: (target, layers) => latest.current.props.onLayersChange?.(target, layers),
      setReadonly: (readonly) => latest.current.props.onReadonlyChange?.(readonly),
    },
  };
  const sync = () => {
    const { props } = latest.current;
    const picture = !editsInRole(props.role);
    setChanged(registry, atoms.document, props.document);
    setChanged(registry, atoms.scene, props.scene);
    setChanged(registry, atoms.picture, picture);
    setChanged(registry, atoms.readonly, (props.readonly ?? false) || picture);
    const offers = offersOf(props);
    sameOffers(offers, registry.get(atoms.host)) || registry.set(atoms.host, offers);
    setChanged(registry, atoms.sceneChoice, props.sceneChoice);
  };
  return { aspect, sync };
};
