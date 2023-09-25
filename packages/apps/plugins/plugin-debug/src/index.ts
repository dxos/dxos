//
// Copyright 2023 DXOS.org
//

export * from './DebugPlugin';

// plugin

const builderFn = (parent: Node<Space>) => {
  const objects = parent.db.query({ type: 'kanban' }).objects; // <--- SIGNAL READ

  const x = state(2);

  const y1 = computed(() => x * 2);

  const y2 = () => x * 2;

  return objects.map((data) => ({
    id: data.id,

    label: data.title, // <--- SIGNAL READ

    get color() {
      return data.nested.color;
    },

    set color(value) {
      data.nested.color = value;
    },
  }));
};

// graph builder

const createNode = () => {
  effect(() => {
    const nodeInits = builderFn(parent);

    untrack(() => upsertNodes(nodeInits));
  });
};
