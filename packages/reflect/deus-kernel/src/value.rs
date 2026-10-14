//
// Copyright 2026 DXOS.org
//

//! Runtime values, matching the TypeScript kernel's representation and semantics.

use std::cell::{OnceCell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;

use crate::machine::{Frame, Machine, TermId};
use crate::text::{json, Text};

/// An interned type or ability name.
pub type Sym = u32;

/// A lexical environment: a linked list of bindings, innermost first. A letrec cell is filled
/// after the closures that capture it exist, so a binding is set once rather than at creation.
pub type Env = Option<Rc<EnvNode>>;

pub struct EnvNode {
    pub value: OnceCell<Value>,
    pub next: Env,
}

pub fn push(env: &Env, value: Value) -> Env {
    Some(Rc::new(EnvNode {
        value: OnceCell::from(value),
        next: env.clone(),
    }))
}

pub struct Con {
    pub ty: Sym,
    pub tag: u32,
    pub fields: Vec<Value>,
}

pub struct Closure {
    pub lam: TermId,
    pub env: Env,
}

pub type PrimFn = fn(&mut Machine, &[Value]) -> Result<Value, Fail>;
pub type ControlFn = fn(&mut Machine, &[Value]) -> Result<TermId, Fail>;

pub struct Prim {
    /// For diagnostics; the table is keyed by the same name.
    #[allow(dead_code)]
    pub name: &'static str,
    pub arity: usize,
    pub func: PrimFn,
    /// Replaces the machine's control with a term instead of returning a value (`Code.run`).
    pub control: Option<ControlFn>,
}

pub struct ConFn {
    pub ty: Sym,
    pub tag: u32,
    pub arity: usize,
}

pub struct OpFn {
    pub ability: Sym,
    pub index: u32,
    pub arity: usize,
}

pub struct Pap {
    pub func: Value,
    pub args: Vec<Value>,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub enum Key {
    Int(i32),
    Text(Text),
}

/// A hash map that iterates in insertion order, as a JavaScript `Map` does.
#[derive(Default)]
pub struct Table {
    pub mutable: bool,
    index: HashMap<Key, usize>,
    entries: Vec<Option<(Key, Value)>>,
}

impl Table {
    pub fn new(mutable: bool) -> Table {
        Table {
            mutable,
            index: HashMap::new(),
            entries: Vec::new(),
        }
    }

    pub fn get(&self, key: &Key) -> Option<&Value> {
        self.index
            .get(key)
            .and_then(|slot| self.entries[*slot].as_ref().map(|entry| &entry.1))
    }

    pub fn has(&self, key: &Key) -> bool {
        self.index.contains_key(key)
    }

    pub fn set(&mut self, key: Key, value: Value) {
        match self.index.get(&key) {
            Some(slot) => self.entries[*slot] = Some((key, value)),
            None => {
                self.index.insert(key.clone(), self.entries.len());
                self.entries.push(Some((key, value)));
            }
        }
    }

    pub fn delete(&mut self, key: &Key) {
        if let Some(slot) = self.index.remove(key) {
            self.entries[slot] = None;
        }
    }

    pub fn size(&self) -> usize {
        self.index.len()
    }

    pub fn keys(&self) -> Vec<Key> {
        self.entries
            .iter()
            .flatten()
            .map(|entry| entry.0.clone())
            .collect()
    }
}

#[derive(Clone)]
pub enum Value {
    Int(i32),
    Bool(bool),
    Text(Text),
    Con(Rc<Con>),
    Closure(Rc<Closure>),
    Prim(Rc<Prim>),
    ConFn(Rc<ConFn>),
    OpFn(Rc<OpFn>),
    Pap(Rc<Pap>),
    Cont(Rc<Vec<Frame>>),
    Cell(Rc<RefCell<Value>>),
    Table(Rc<RefCell<Table>>),
}

/// How a run fails: the three tiers below `Throw` (D14) plus an orderly exit.
#[derive(Debug)]
pub enum Fail {
    Defect(String),
    /// The step budget ran out; reported as a defect.
    Budget(String),
    Panic(String),
    Exit(i32),
}

pub fn defect<T>(message: impl Into<String>) -> Result<T, Fail> {
    Err(Fail::Defect(message.into()))
}

/// Interned names of types and abilities.
#[derive(Default)]
pub struct Symbols {
    names: Vec<Rc<str>>,
    index: HashMap<Rc<str>, Sym>,
}

impl Symbols {
    pub fn intern(&mut self, name: &str) -> Sym {
        if let Some(sym) = self.index.get(name) {
            return *sym;
        }
        let name: Rc<str> = Rc::from(name);
        let sym = self.names.len() as Sym;
        self.names.push(name.clone());
        self.index.insert(name, sym);
        sym
    }

    pub fn name(&self, sym: Sym) -> &str {
        &self.names[sym as usize]
    }
}

/// Well-known symbols, interned first so their numbers are fixed.
pub const UNIT: Sym = 0;
pub const LIST: Sym = 1;
pub const OPTION: Sym = 2;
pub const PAIR: Sym = 3;
pub const BOOL: Sym = 4;
pub const DEFECT: Sym = 6;
/// Interned first, in this order, so the constants above name them; `#IO` keeps `#Defect` at 6.
pub const WELL_KNOWN: [&str; 7] = [
    "#Unit", "#List", "#Option", "#Pair", "#Bool", "#IO", "#Defect",
];

pub fn con(ty: Sym, tag: u32, fields: Vec<Value>) -> Value {
    Value::Con(Rc::new(Con { ty, tag, fields }))
}

pub fn unit() -> Value {
    con(UNIT, 0, Vec::new())
}

pub fn nil() -> Value {
    con(LIST, 0, Vec::new())
}

pub fn none() -> Value {
    con(OPTION, 0, Vec::new())
}

pub fn some(value: Value) -> Value {
    con(OPTION, 1, vec![value])
}

pub fn pair(first: Value, second: Value) -> Value {
    con(PAIR, 0, vec![first, second])
}

pub fn list_from(values: Vec<Value>) -> Value {
    let mut out = nil();
    for value in values.into_iter().rev() {
        out = con(LIST, 1, vec![value, out]);
    }
    out
}

/// The elements of a cons list (stops at anything that is not a cons cell).
pub fn list_to(list: &Value) -> Vec<Value> {
    let mut out = Vec::new();
    let mut cell = list.clone();
    loop {
        match &cell {
            Value::Con(con) if con.tag == 1 && con.fields.len() == 2 => {
                out.push(con.fields[0].clone());
                let next = con.fields[1].clone();
                cell = next;
            }
            _ => return out,
        }
    }
}

fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Int(x), Value::Int(y)) => x == y,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::Text(x), Value::Text(y)) => x == y,
        (Value::Con(x), Value::Con(y)) => Rc::ptr_eq(x, y),
        (Value::Closure(x), Value::Closure(y)) => Rc::ptr_eq(x, y),
        (Value::Prim(x), Value::Prim(y)) => Rc::ptr_eq(x, y),
        (Value::ConFn(x), Value::ConFn(y)) => Rc::ptr_eq(x, y),
        (Value::OpFn(x), Value::OpFn(y)) => Rc::ptr_eq(x, y),
        (Value::Pap(x), Value::Pap(y)) => Rc::ptr_eq(x, y),
        (Value::Cont(x), Value::Cont(y)) => Rc::ptr_eq(x, y),
        (Value::Cell(x), Value::Cell(y)) => Rc::ptr_eq(x, y),
        (Value::Table(x), Value::Table(y)) => Rc::ptr_eq(x, y),
        _ => false,
    }
}

/// Structural equality over data; functions are equal only to themselves.
pub fn equal(a: &Value, b: &Value) -> bool {
    let (mut a, mut b) = (a.clone(), b.clone());
    loop {
        if same(&a, &b) {
            return true;
        }
        let (Value::Con(x), Value::Con(y)) = (&a, &b) else {
            return false;
        };
        if x.tag != y.tag || x.ty != y.ty || x.fields.len() != y.fields.len() {
            return false;
        }
        let n = x.fields.len();
        if n == 0 {
            return true;
        }
        for index in 0..n - 1 {
            if !equal(&x.fields[index], &y.fields[index]) {
                return false;
            }
        }
        let (next_a, next_b) = (x.fields[n - 1].clone(), y.fields[n - 1].clone());
        a = next_a;
        b = next_b;
    }
}

fn rank(value: &Value) -> u8 {
    match value {
        Value::Bool(_) => 0,
        Value::Int(_) => 1,
        Value::Text(_) => 2,
        Value::Con(_) => 3,
        _ => 4,
    }
}

/// Total structural order, as the TypeScript kernel computes it (constructor fields of
/// different lengths compare by the length difference).
pub fn compare(a: &Value, b: &Value) -> Result<i32, Fail> {
    let (mut a, mut b) = (a.clone(), b.clone());
    loop {
        if same(&a, &b) {
            return Ok(0);
        }
        match (&a, &b) {
            (Value::Int(x), Value::Int(y)) => return Ok(if x < y { -1 } else { 1 }),
            (Value::Text(x), Value::Text(y)) => {
                return Ok(if x < y {
                    -1
                } else if x > y {
                    1
                } else {
                    0
                })
            }
            (Value::Bool(x), Value::Bool(_)) => return Ok(if *x { 1 } else { -1 }),
            (Value::Con(x), Value::Con(y)) => {
                if x.tag != y.tag {
                    return Ok(if x.tag < y.tag { -1 } else { 1 });
                }
                let n = x.fields.len().min(y.fields.len());
                if n == 0 {
                    return Ok(x.fields.len() as i32 - y.fields.len() as i32);
                }
                for index in 0..n - 1 {
                    let c = compare(&x.fields[index], &y.fields[index])?;
                    if c != 0 {
                        return Ok(c);
                    }
                }
                let (next_a, next_b) = (x.fields[n - 1].clone(), y.fields[n - 1].clone());
                a = next_a;
                b = next_b;
            }
            _ => {
                let (ra, rb) = (rank(&a), rank(&b));
                if ra != rb {
                    return Ok(if ra < rb { -1 } else { 1 });
                }
                return defect("cannot compare functions");
            }
        }
    }
}

/// Debug rendering, as `show` in the TypeScript kernel.
pub fn show(symbols: &Symbols, value: &Value) -> String {
    match value {
        Value::Int(x) => x.to_string(),
        Value::Bool(x) => x.to_string(),
        Value::Text(x) => json(x),
        Value::Con(con) => match con.ty {
            LIST => {
                let items: Vec<String> = list_to(value)
                    .iter()
                    .map(|item| show(symbols, item))
                    .collect();
                format!("[{}]", items.join(", "))
            }
            UNIT => "()".into(),
            PAIR => format!(
                "({}, {})",
                show(symbols, &con.fields[0]),
                show(symbols, &con.fields[1])
            ),
            OPTION if con.tag == 0 => "none".into(),
            OPTION => format!("(some {})", show(symbols, &con.fields[0])),
            _ => {
                let ty: Vec<u16> = symbols.name(con.ty).encode_utf16().take(8).collect();
                let name = format!("{}#{}", String::from_utf16_lossy(&ty), con.tag);
                if con.fields.is_empty() {
                    name
                } else {
                    let fields: Vec<String> = con
                        .fields
                        .iter()
                        .map(|field| show(symbols, field))
                        .collect();
                    format!("({} {})", name, fields.join(" "))
                }
            }
        },
        _ => "<function>".into(),
    }
}
