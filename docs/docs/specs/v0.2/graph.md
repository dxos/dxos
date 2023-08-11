# Graph API
a proposal for `plugin.provides.graph`

```tsx
// let's say nodes are like this
export type Node<T = any> = {
  id: string;
  label: string;
  data: T;
};

const toNode = (e: any) => ({});

// a trivial spaces plugin which renders documents as children to the space
export const Plugin = () => {
  return {
    provides: {
      graph: {
        nodes: (parent: Node, publish: Function) => {
          const space = parent.data;
          if (!(space instanceof Object)) return; // instanceof SpaceProxy
          const query = space.db.query();
          const observer = query.observe((entity: any) => publish(toNode(entity)));
          return () => observer.stop();
        },
      },
    },
  };
};

// what if we needed a static node under which to group some stuff 
export const PluginNesting = () => {
  return {
    provides: {
      graph: {
        nodes: (parent: Node, upsert: Function, remove: Function) => {
          const space = parent.data;
          if (!(space instanceof Object)) return;
          const query = space.db.query();
          // make a static node
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

// maybe it's cumbersome to pass a parent to the upsert/removes?
// what if the upsert/remove functions were directly on the nodes?

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
```
                     ;,_            ,
                  _uP~"b          d"u,
                 dP'   "b       ,d"  "o
                d"    , `b     d"'    "b
               l] [    " `l,  d"       lb
               Ol ?     "  "b`"=uoqo,_  "l
             ,dBb "b        "b,    `"~~TObup,_
           ,d" (db.`"         ""     "tbc,_ `~"Yuu,_
         .d" l`T'  '=                      ~     `""Yu,
       ,dO` gP,                           `u,   b,_  "b7
      d?' ,d" l,                           `"b,_ `~b  "1
    ,8i' dl   `l                 ,ggQOV",dbgq,._"  `l  lb
   .df' (O,    "             ,ggQY"~  , @@@@@d"bd~  `b "1
  .df'   `"           -=@QgpOY""     (b  @@@@P db    `Lp"b,
 .d(                  _               "ko "=d_,Q`  ,_  "  "b,
 Ql         .         `"qo,._          "tQo,_`""bo ;tb,    `"b,
(qQ         |L           ~"QQQgggc,_.,dObc,opooO  `"~~";.   __,7,
`qp         t\io,_           `~"TOOggQV""""        _,dg,_ =PIQHib.
 `qp        `Q["tQQQo,_                          ,pl{QOP"'   7AFR`
   `         `tb  '""tQQQg,_             p" "b   `       .;-.`Vl'
              "Yb      `"tQOOo,__    _,edb    ` .__   /`/'|  |b;=;.__
                            `"tQQQOOOOP""        `"\QV;qQObob"`-._`\_~~-._
                                 """"    ._        /   | |oP"\_   ~\ ~\_  ~\
                                         `~"\ic,qggddOOP"|  |  ~\   `\  ~-._
                                           ,qP`"""|"   | `\ `;   `\   `\
                                _        _,p"     |    |   `\`;    |    |
                                 "boo,._dP"       `\_  `\    `\|   `\   ;
                                  `"7tY~'            `\  `\    `|_   |
                                                           `~\  |
```