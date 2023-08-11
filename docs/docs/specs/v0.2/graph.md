# Graph API
a proposal for `plugin.provides.graph`

```tsx
export type Node<T = any> = {
  id: string;
  label: string;
  data: T;
};

const toNode = (e: any) => ({});

export const Plugin = () => {
  return {
    provides: {
      graph: {
        nodes: (parent: Node, publish: Function) => {
          const space = parent.data;
          if (!(space instanceof Object)) return;
          const query = space.db.query();
          const observer = query.observe((entity: any) => publish(toNode(entity)));
          return () => observer.stop();
        },
      },
    },
  };
};

export const PluginNesting = () => {
  return {
    provides: {
      graph: {
        nodes: (parent: Node, upsert: Function, remove: Function) => {
          const space = parent.data;
          if (!(space instanceof Object)) return;
          const query = space.db.query();
          const group = upsert({
            id: 'static_folder',
            name: 'Documents',
          });
          const observer = query.observe({
            added: (entity: any) => upsert(toNode(entity), group),
            changed: (entity: any) => upsert(toNode(entity), group),
            removed: (entity: any) => remove(toNode(entity), group),
          });
          return () => observer.stop();
        },
      },
    },
  };
};

export type Node2<T = any> = {
  id: string;
  label: string;
  data: T;
  add(e: any): any;
  remove(e: any): any;
}

export const PluginNesting2 = () => {
  return {
    provides: {
      graph: {
        nodes: (parent: Node2) => {
          const space = parent.data;
          if (!(space instanceof Object)) return;
          const query = space.db.query();
          const group = parent.add({
            id: 'static_folder',
            name: 'Documents',
          });
          const observer = query.observe({
            added: (entity: any) => group.add(toNode(entity)),
            changed: (entity: any) => group.add(toNode(entity)),
            removed: (entity: any) => group.remove(toNode(entity)),
          });
          return () => observer.stop();
        },
      },
    },
  };
};
```