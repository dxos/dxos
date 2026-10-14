//
// Copyright 2026 DXOS.org
//

//! The CEK machine, a port of `src/kernel/machine.ts` (without its JIT). Terms live in flat
//! arrays of `Copy` nodes, so frames and closures refer to code by index, and the evaluation
//! order, the quick paths and therefore the step counts match the TypeScript machine exactly.

use std::collections::HashMap;
use std::rc::Rc;

use crate::host::Host;
use crate::sexp::Sexp;
use crate::text::{text, Text};
use crate::value::*;

pub type TermId = u32;
const NONE_ID: u32 = u32::MAX;

const VAR: u8 = 0;
const CONST: u8 = 1;
const REF: u8 = 2;
const LAM: u8 = 3;
const APP: u8 = 4;
const LET: u8 = 5;
const SEQ: u8 = 6;
const LETREC: u8 = 7;
const IF: u8 = 8;
const MATCH: u8 = 9;
const HANDLE: u8 = 10;

/// One term. Fields by kind: VAR `i` = index; CONST `i` = constant; REF `i` = resolved global,
/// `c` = hash; LAM `i` = arity, `a` = body; APP `a` = callee, `lo..lo+len` = operands; LET/SEQ
/// `a`, `b`; LETREC `lo..` = lambdas, `b` = body; IF `a`, `b`, `c`; MATCH `a` = scrutinee,
/// `lo..` = cases; HANDLE `a` = body, `c` = return clause, `lo..` = clauses.
#[derive(Clone, Copy)]
struct Node {
    t: u8,
    q: bool,
    i: u32,
    a: u32,
    b: u32,
    c: u32,
    lo: u32,
    len: u32,
    owner: u32,
}

#[derive(Clone, Copy)]
struct Case {
    pat: u32,
    guard: u32,
    body: u32,
}

#[derive(Clone, Copy)]
struct Clause {
    ability: Sym,
    index: u32,
    body: u32,
}

const P_ANY: u8 = 0;
const P_VAR: u8 = 1;
const P_AS: u8 = 2;
const P_LIT: u8 = 3;
const P_CON: u8 = 4;

/// A pattern. P_AS `p` = inner; P_LIT `p` = constant; P_CON `ty`, `tag`, `lo..lo+len` = fields.
#[derive(Clone, Copy)]
struct Pattern {
    k: u8,
    p: u32,
    ty: Sym,
    tag: u32,
    lo: u32,
    len: u32,
}

struct Global {
    hash: Rc<str>,
    form: Sexp,
    term: Option<TermId>,
    value: Option<Value>,
}

#[derive(Clone)]
pub enum Frame {
    App {
        term: TermId,
        env: Env,
        func: Option<Value>,
        args: Vec<Value>,
    },
    Let {
        term: TermId,
        env: Env,
    },
    Seq {
        term: TermId,
        env: Env,
    },
    If {
        term: TermId,
        env: Env,
    },
    Match {
        term: TermId,
        env: Env,
    },
    Guard {
        term: TermId,
        env: Env,
        value: Value,
        index: u32,
        bound: Env,
    },
    Handle {
        term: TermId,
        env: Env,
    },
    Global {
        term: TermId,
        global: u32,
    },
    Rest {
        term: TermId,
        args: Vec<Value>,
    },
}

impl Frame {
    fn term(&self) -> TermId {
        match self {
            Frame::App { term, .. }
            | Frame::Let { term, .. }
            | Frame::Seq { term, .. }
            | Frame::If { term, .. }
            | Frame::Match { term, .. }
            | Frame::Guard { term, .. }
            | Frame::Handle { term, .. }
            | Frame::Global { term, .. }
            | Frame::Rest { term, .. } => *term,
        }
    }
}

/// How many definitions a defect's stack trace lists.
const TRACE_DEPTH: usize = 32;

/// Diagnostics a run opts into.
#[derive(Default, Clone)]
pub struct Options {
    pub trace: bool,
    pub profile: bool,
    pub max_steps: Option<u64>,
}

pub struct Machine {
    nodes: Vec<Node>,
    kids: Vec<u32>,
    cases: Vec<Case>,
    clauses: Vec<Clause>,
    patterns: Vec<Pattern>,
    pattern_kids: Vec<u32>,
    consts: Vec<Value>,
    hashes: Vec<Rc<str>>,
    globals: Vec<Global>,
    global_index: HashMap<Rc<str>, u32>,
    run_refs: HashMap<Rc<str>, TermId>,
    pub symbols: Symbols,
    pub prims: HashMap<&'static str, Rc<Prim>>,
    pub host: Box<dyn Host>,
    pub steps: u64,
    pub max_steps: u64,
    pub trace: Option<Vec<u32>>,
    pub profile: Option<(Vec<u32>, HashMap<u32, u64>)>,
    pub defect_trace: Vec<Rc<str>>,
    /// The run in progress, kept while it is suspended on the embedder.
    current: Option<Run>,
    /// IRIs of the user types and abilities an image uses, by hash (its `(type …)` and
    /// `(ability …)` forms), for embedders.
    pub iris: HashMap<String, String>,
}

enum Quick {
    Value(Value),
    Slow,
}

/// The evaluation state of one run (C, E, K and the value being returned).
struct Run {
    stack: Vec<Frame>,
    node: TermId,
    env: Env,
    value: Value,
    evaluating: bool,
    start: TermId,
}

fn lookup(env: &Env, index: u32) -> Result<Value, Fail> {
    let mut cursor = env;
    let mut remaining = index;
    while let Some(node) = cursor {
        if remaining == 0 {
            return Ok(node.value.get().cloned().unwrap_or_else(unit));
        }
        cursor = &node.next;
        remaining -= 1;
    }
    Err(Fail::Panic("unbound variable".into()))
}

fn panic<T>(message: String) -> Result<T, Fail> {
    Err(Fail::Panic(message))
}

impl Machine {
    pub fn new(
        prims: HashMap<&'static str, Rc<Prim>>,
        host: Box<dyn Host>,
        options: &Options,
    ) -> Machine {
        let mut symbols = Symbols::default();
        for name in WELL_KNOWN {
            symbols.intern(name);
        }
        Machine {
            nodes: Vec::new(),
            kids: Vec::new(),
            cases: Vec::new(),
            clauses: Vec::new(),
            patterns: Vec::new(),
            pattern_kids: Vec::new(),
            consts: Vec::new(),
            hashes: Vec::new(),
            globals: Vec::new(),
            global_index: HashMap::new(),
            run_refs: HashMap::new(),
            symbols,
            prims,
            host,
            steps: 0,
            max_steps: options.max_steps.unwrap_or(u64::MAX),
            trace: options.trace.then(Vec::new),
            profile: options.profile.then(|| (Vec::new(), HashMap::new())),
            defect_trace: Vec::new(),
            current: None,
            iris: HashMap::new(),
        }
    }

    /// Registers every `(def "hash" term)` form; other forms are ignored.
    pub fn load(&mut self, forms: &[Sexp]) -> Result<(), Fail> {
        for form in forms {
            let Sexp::List(items) = form else { continue };
            match items.first() {
                Some(Sexp::Sym(head)) if &**head == "def" => {
                    let hash: Rc<str> = Rc::from(crate::text::string(&str_of(items.get(1))?));
                    if !self.global_index.contains_key(&hash) {
                        let form = items
                            .get(2)
                            .cloned()
                            .ok_or_else(|| Fail::Panic("core: def without a term".into()))?;
                        self.global_index
                            .insert(hash.clone(), self.globals.len() as u32);
                        self.globals.push(Global {
                            hash,
                            form,
                            term: None,
                            value: None,
                        });
                    }
                }
                Some(Sexp::Sym(head)) if &**head == "ability" || &**head == "type" => {
                    let hash = crate::text::string(&str_of(items.get(1))?);
                    let iri = crate::text::string(&str_of(items.get(2))?);
                    self.iris.insert(hash, iri);
                }
                _ => {}
            }
        }
        Ok(())
    }

    pub fn has(&self, hash: &str) -> bool {
        self.global_index.contains_key(hash)
    }

    pub fn show(&self, value: &Value) -> String {
        show(&self.symbols, value)
    }

    pub fn hash_of(&self, global: u32) -> Rc<str> {
        self.globals[global as usize].hash.clone()
    }

    //
    // Compiling Core.
    //

    fn node(&mut self, t: u8, owner: u32) -> TermId {
        self.nodes.push(Node {
            t,
            q: false,
            i: 0,
            a: NONE_ID,
            b: NONE_ID,
            c: NONE_ID,
            lo: 0,
            len: 0,
            owner,
        });
        (self.nodes.len() - 1) as TermId
    }

    fn constant(&mut self, value: Value, owner: u32) -> TermId {
        let id = self.node(CONST, owner);
        self.consts.push(value);
        self.nodes[id as usize].i = (self.consts.len() - 1) as u32;
        id
    }

    /// A reference to a global by hash.
    pub fn ref_term(&mut self, hash: &str) -> TermId {
        let id = self.node(REF, NONE_ID);
        self.hashes.push(Rc::from(hash));
        let node = &mut self.nodes[id as usize];
        node.i = NONE_ID;
        node.c = (self.hashes.len() - 1) as u32;
        id
    }

    /// The REF term `Code.run` jumps to; one per hash.
    pub fn run_ref(&mut self, hash: &str) -> TermId {
        if let Some(id) = self.run_refs.get(hash) {
            return *id;
        }
        let id = self.ref_term(hash);
        self.run_refs.insert(Rc::from(hash), id);
        id
    }

    fn is_quick(&self, id: TermId) -> bool {
        let node = &self.nodes[id as usize];
        node.t == VAR || node.t == CONST || node.t == REF || node.q
    }

    fn con_value(&mut self, ty: &str, tag: u32, arity: usize) -> Value {
        let sym = self.symbols.intern(ty);
        if arity > 0 {
            return Value::ConFn(Rc::new(ConFn {
                ty: sym,
                tag,
                arity,
            }));
        }
        if sym == BOOL {
            return Value::Bool(tag == 1);
        }
        con(sym, tag, Fields::new())
    }

    fn compile_pattern(&mut self, form: &Sexp) -> Result<u32, Fail> {
        let parts = list_of(form)?;
        let head = sym_of(parts.first())?;
        let mut pattern = Pattern {
            k: P_ANY,
            p: NONE_ID,
            ty: 0,
            tag: 0,
            lo: 0,
            len: 0,
        };
        match &*head {
            "pany" => {}
            "pvar" => pattern.k = P_VAR,
            "pas" => {
                pattern.k = P_AS;
                pattern.p = self.compile_pattern(arg(&parts, 1)?)?;
            }
            "pint" | "ptext" => {
                pattern.k = P_LIT;
                let value = if &*head == "pint" {
                    Value::Int(int_of(parts.get(1))?)
                } else {
                    Value::Text(str_of(parts.get(1))?)
                };
                self.consts.push(value);
                pattern.p = (self.consts.len() - 1) as u32;
            }
            "pcon" => {
                pattern.k = P_CON;
                pattern.ty = self
                    .symbols
                    .intern(&crate::text::string(&str_of(parts.get(1))?));
                pattern.tag = int_of(parts.get(2))? as u32;
                let subs: Vec<u32> = parts[3..]
                    .iter()
                    .map(|sub| self.compile_pattern(sub))
                    .collect::<Result<_, _>>()?;
                pattern.lo = self.pattern_kids.len() as u32;
                pattern.len = subs.len() as u32;
                self.pattern_kids.extend(subs);
            }
            other => return panic(format!("core: unknown pattern {other}")),
        }
        self.patterns.push(pattern);
        Ok((self.patterns.len() - 1) as u32)
    }

    fn compile(&mut self, form: &Sexp, owner: u32) -> Result<TermId, Fail> {
        let parts = list_of(form)?;
        let head = sym_of(parts.first())?;
        match &*head {
            "var" => {
                let id = self.node(VAR, owner);
                self.nodes[id as usize].i = int_of(parts.get(1))? as u32;
                Ok(id)
            }
            "ref" => {
                let hash = crate::text::string(&str_of(parts.get(1))?);
                let id = self.ref_term(&hash);
                self.nodes[id as usize].owner = owner;
                Ok(id)
            }
            "int" => {
                let value = int_of(parts.get(1))?;
                Ok(self.constant(Value::Int(value), owner))
            }
            "text" => {
                let value = str_of(parts.get(1))?;
                Ok(self.constant(Value::Text(value), owner))
            }
            "lam" => {
                // Nested unary lambdas become one n-ary lambda; `apply` keeps currying.
                let mut arity = 1;
                let mut body = arg(&parts, 1)?.clone();
                loop {
                    let next = match &body {
                        Sexp::List(items) if matches!(items.first(), Some(Sexp::Sym(name)) if &**name == "lam") => {
                            items.get(1).cloned()
                        }
                        _ => None,
                    };
                    match next {
                        Some(inner) => {
                            arity += 1;
                            body = inner;
                        }
                        None => break,
                    }
                }
                let body = self.compile(&body, owner)?;
                let id = self.node(LAM, owner);
                let node = &mut self.nodes[id as usize];
                node.i = arity;
                node.a = body;
                Ok(id)
            }
            "app" => {
                let callee = self.compile(arg(&parts, 1)?, owner)?;
                let operands: Vec<u32> = parts[2..]
                    .iter()
                    .map(|part| self.compile(part, owner))
                    .collect::<Result<_, _>>()?;
                let saturated = {
                    let node = &self.nodes[callee as usize];
                    node.t == CONST
                        && match &self.consts[node.i as usize] {
                            Value::Prim(prim) => {
                                prim.control.is_none() && prim.arity == operands.len()
                            }
                            Value::ConFn(con) => con.arity == operands.len(),
                            _ => false,
                        }
                };
                let q = saturated && operands.iter().all(|operand| self.is_quick(*operand));
                let id = self.node(APP, owner);
                let lo = self.kids.len() as u32;
                self.kids.extend(&operands);
                let node = &mut self.nodes[id as usize];
                node.a = callee;
                node.lo = lo;
                node.len = operands.len() as u32;
                node.q = q;
                Ok(id)
            }
            "let" | "seq" => {
                let a = self.compile(arg(&parts, 1)?, owner)?;
                let b = self.compile(arg(&parts, 2)?, owner)?;
                let id = self.node(if &*head == "let" { LET } else { SEQ }, owner);
                let node = &mut self.nodes[id as usize];
                node.a = a;
                node.b = b;
                Ok(id)
            }
            "letrec" => {
                let bindings = list_of(arg(&parts, 1)?)?;
                let mut lams = Vec::new();
                for binding in bindings.iter() {
                    let lam = self.compile(binding, owner)?;
                    if self.nodes[lam as usize].t != LAM {
                        return panic("core: letrec binds lambdas only".into());
                    }
                    lams.push(lam);
                }
                let body = self.compile(arg(&parts, 2)?, owner)?;
                let id = self.node(LETREC, owner);
                let lo = self.kids.len() as u32;
                self.kids.extend(&lams);
                let node = &mut self.nodes[id as usize];
                node.lo = lo;
                node.len = lams.len() as u32;
                node.b = body;
                Ok(id)
            }
            "if" => {
                let a = self.compile(arg(&parts, 1)?, owner)?;
                let b = self.compile(arg(&parts, 2)?, owner)?;
                let c = self.compile(arg(&parts, 3)?, owner)?;
                let id = self.node(IF, owner);
                let node = &mut self.nodes[id as usize];
                node.a = a;
                node.b = b;
                node.c = c;
                Ok(id)
            }
            "con" => {
                let ty = crate::text::string(&str_of(parts.get(1))?);
                let tag = int_of(parts.get(2))? as u32;
                let arity = int_of(parts.get(3))? as usize;
                let value = self.con_value(&ty, tag, arity);
                Ok(self.constant(value, owner))
            }
            "op" => {
                let ability = self
                    .symbols
                    .intern(&crate::text::string(&str_of(parts.get(1))?));
                let index = int_of(parts.get(2))? as u32;
                let arity = int_of(parts.get(3))? as usize;
                Ok(self.constant(
                    Value::OpFn(Rc::new(OpFn {
                        ability,
                        index,
                        arity,
                    })),
                    owner,
                ))
            }
            "prim" => {
                let name = crate::text::string(&str_of(parts.get(1))?);
                let prim = self
                    .prims
                    .get(name.as_str())
                    .cloned()
                    .ok_or_else(|| Fail::Panic(format!("core: unknown primitive {name}")))?;
                Ok(self.constant(Value::Prim(prim), owner))
            }
            "match" => {
                let scrutinee = self.compile(arg(&parts, 1)?, owner)?;
                let mut cases = Vec::new();
                for case in parts[2..].iter() {
                    let items = list_of(case)?;
                    let guarded = &*sym_of(items.first())? == "gcase";
                    let pat = self.compile_pattern(arg(&items, 1)?)?;
                    let (guard, body) = if guarded {
                        (
                            self.compile(arg(&items, 2)?, owner)?,
                            self.compile(arg(&items, 3)?, owner)?,
                        )
                    } else {
                        (NONE_ID, self.compile(arg(&items, 2)?, owner)?)
                    };
                    cases.push(Case { pat, guard, body });
                }
                let id = self.node(MATCH, owner);
                let lo = self.cases.len() as u32;
                self.cases.extend(&cases);
                let node = &mut self.nodes[id as usize];
                node.a = scrutinee;
                node.lo = lo;
                node.len = cases.len() as u32;
                Ok(id)
            }
            "handle" => {
                let mut ret = NONE_ID;
                let mut clauses = Vec::new();
                for clause in parts[2..].iter() {
                    let items = list_of(clause)?;
                    if &*sym_of(items.first())? == "ret" {
                        ret = self.compile(arg(&items, 1)?, owner)?;
                    } else {
                        let ability = self
                            .symbols
                            .intern(&crate::text::string(&str_of(items.get(1))?));
                        let index = int_of(items.get(2))? as u32;
                        let body = self.compile(arg(&items, 4)?, owner)?;
                        clauses.push(Clause {
                            ability,
                            index,
                            body,
                        });
                    }
                }
                let body = self.compile(arg(&parts, 1)?, owner)?;
                let id = self.node(HANDLE, owner);
                let lo = self.clauses.len() as u32;
                self.clauses.extend(&clauses);
                let node = &mut self.nodes[id as usize];
                node.a = body;
                node.c = ret;
                node.lo = lo;
                node.len = clauses.len() as u32;
                Ok(id)
            }
            _ => {
                let printed = crate::sexp::print(form);
                panic(format!(
                    "core: unknown term {}",
                    printed.chars().take(80).collect::<String>()
                ))
            }
        }
    }

    //
    // Globals.
    //

    fn resolve(&mut self, id: TermId) -> Result<u32, Fail> {
        let node = self.nodes[id as usize];
        if node.i != NONE_ID {
            return Ok(node.i);
        }
        let hash = self.hashes[node.c as usize].clone();
        let global = *self
            .global_index
            .get(&hash)
            .ok_or_else(|| Fail::Panic(format!("unknown definition {hash}")))?;
        self.nodes[id as usize].i = global;
        Ok(global)
    }

    /// A global's value if it needs no evaluation (functions are values at once).
    fn ready(&mut self, global: u32) -> Result<Option<Value>, Fail> {
        if let Some(value) = &self.globals[global as usize].value {
            return Ok(Some(value.clone()));
        }
        let term = match self.globals[global as usize].term {
            Some(term) => term,
            None => {
                let form = self.globals[global as usize].form.clone();
                let term = self.compile(&form, global)?;
                self.globals[global as usize].term = Some(term);
                term
            }
        };
        if self.nodes[term as usize].t == LAM {
            let value = Value::Closure(Rc::new(Closure {
                lam: term,
                env: None,
            }));
            self.globals[global as usize].value = Some(value.clone());
            return Ok(Some(value));
        }
        Ok(None)
    }

    fn quick(&mut self, id: TermId, env: &Env) -> Result<Quick, Fail> {
        let node = self.nodes[id as usize];
        match node.t {
            VAR => Ok(Quick::Value(lookup(env, node.i)?)),
            CONST => Ok(Quick::Value(self.consts[node.i as usize].clone())),
            REF => {
                let global = self.resolve(id)?;
                Ok(match self.ready(global)? {
                    Some(value) => Quick::Value(value),
                    None => Quick::Slow,
                })
            }
            APP if node.q => {
                let callee = self.consts[self.nodes[node.a as usize].i as usize].clone();
                let mut args = Vec::with_capacity(node.len as usize);
                for k in 0..node.len {
                    let operand = self.kids[(node.lo + k) as usize];
                    match self.quick(operand, env)? {
                        Quick::Value(value) => args.push(value),
                        Quick::Slow => return Ok(Quick::Slow),
                    }
                }
                match callee {
                    Value::Prim(prim) => Ok(Quick::Value((prim.func)(self, &args)?)),
                    Value::ConFn(con) => Ok(Quick::Value(crate::value::con(
                        con.ty,
                        con.tag,
                        Fields::from_vec(args),
                    ))),
                    _ => Ok(Quick::Slow),
                }
            }
            _ => Ok(Quick::Slow),
        }
    }

    /// Evaluates the global `hash` applied to `args`.
    pub fn call(&mut self, hash: &str, args: Vec<Value>) -> Result<Value, Fail> {
        let callee = self.ref_term(hash);
        if args.is_empty() {
            return self.run(callee, None);
        }
        let operands: Vec<u32> = args
            .into_iter()
            .map(|value| self.constant(value, NONE_ID))
            .collect();
        let id = self.node(APP, NONE_ID);
        let lo = self.kids.len() as u32;
        self.kids.extend(&operands);
        let node = &mut self.nodes[id as usize];
        node.a = callee;
        node.lo = lo;
        node.len = operands.len() as u32;
        self.run(id, None)
    }

    //
    // The machine.
    //

    /// Sets up the application of `func` to `args`; true when the result is in `run.value`.
    fn apply(&mut self, run: &mut Run, func: Value, args: Vec<Value>) -> Result<bool, Fail> {
        let mut func = func;
        let mut args = args;
        loop {
            match func {
                Value::Closure(closure) => {
                    let lam = self.nodes[closure.lam as usize];
                    let n = lam.i as usize;
                    if args.len() < n {
                        run.value = Value::Pap(Rc::new(Pap {
                            func: Value::Closure(closure),
                            args,
                        }));
                        return Ok(true);
                    }
                    let mut env = closure.env.clone();
                    for arg in args.iter().take(n) {
                        env = push(&env, arg.clone());
                    }
                    if args.len() > n {
                        run.stack.push(Frame::Rest {
                            term: closure.lam,
                            args: args[n..].to_vec(),
                        });
                    }
                    run.node = lam.a;
                    run.env = env;
                    return Ok(false);
                }
                Value::Pap(pap) => {
                    let mut all = pap.args.clone();
                    all.extend(args);
                    args = all;
                    func = pap.func.clone();
                }
                Value::Prim(prim) => {
                    if args.len() < prim.arity {
                        run.value = Value::Pap(Rc::new(Pap {
                            func: Value::Prim(prim),
                            args,
                        }));
                        return Ok(true);
                    }
                    let rest = (args.len() > prim.arity).then(|| args[prim.arity..].to_vec());
                    let own = &args[..prim.arity];
                    if let Some(control) = prim.control {
                        if let Some(rest) = rest {
                            run.stack.push(Frame::Rest {
                                term: run.start,
                                args: rest,
                            });
                        }
                        run.node = control(self, own)?;
                        run.env = None;
                        return Ok(false);
                    }
                    let result = (prim.func)(self, own)?;
                    match rest {
                        Some(rest) => {
                            func = result;
                            args = rest;
                        }
                        None => {
                            run.value = result;
                            return Ok(true);
                        }
                    }
                }
                Value::ConFn(con) => {
                    if args.len() < con.arity {
                        run.value = Value::Pap(Rc::new(Pap {
                            func: Value::ConFn(con),
                            args,
                        }));
                        return Ok(true);
                    }
                    if args.len() > con.arity {
                        return defect("constructor applied to too many arguments");
                    }
                    run.value = crate::value::con(con.ty, con.tag, Fields::from_vec(args));
                    return Ok(true);
                }
                Value::OpFn(op) => {
                    if args.len() < op.arity {
                        run.value = Value::Pap(Rc::new(Pap {
                            func: Value::OpFn(op),
                            args,
                        }));
                        return Ok(true);
                    }
                    if args.len() > op.arity {
                        run.stack.push(Frame::Rest {
                            term: run.start,
                            args: args[op.arity..].to_vec(),
                        });
                    }
                    let own = args[..op.arity].to_vec();
                    return self.perform(run, op.ability, op.index, own);
                }
                Value::Cont(frames) => {
                    if args.len() > 1 {
                        run.stack.push(Frame::Rest {
                            term: run.start,
                            args: args[1..].to_vec(),
                        });
                    }
                    run.stack.extend(frames.iter().cloned());
                    run.value = args.into_iter().next().unwrap_or_else(unit);
                    return Ok(true);
                }
                other => return defect(format!("cannot apply {}", self.show(&other))),
            }
        }
    }

    fn perform(
        &mut self,
        run: &mut Run,
        ability: Sym,
        index: u32,
        args: Vec<Value>,
    ) -> Result<bool, Fail> {
        if self.handle_request(run, ability, index, &args) {
            return Ok(false);
        }
        let name = self.symbols.name(ability).to_string();
        if self.host.suspends() {
            return Err(Fail::Suspend {
                ability: name,
                index,
                args,
            });
        }
        run.value = crate::host::dispatch(self, &name, index, &args)?;
        Ok(true)
    }

    fn handler_of(&self, run: &Run, ability: Sym, index: u32) -> Option<usize> {
        (0..run.stack.len())
            .rev()
            .find(|position| match &run.stack[*position] {
                Frame::Handle { term, .. } => self.clause(*term, ability, index).is_some(),
                _ => false,
            })
    }

    fn clause(&self, term: TermId, ability: Sym, index: u32) -> Option<Clause> {
        let node = self.nodes[term as usize];
        (node.lo..node.lo + node.len)
            .map(|k| self.clauses[k as usize])
            .find(|clause| clause.ability == ability && clause.index == index)
    }

    /// Transfers control to the innermost clause for the operation; false if none is installed.
    fn handle_request(&mut self, run: &mut Run, ability: Sym, index: u32, args: &[Value]) -> bool {
        let Some(position) = self.handler_of(run, ability, index) else {
            return false;
        };
        let Frame::Handle { term, env } = run.stack[position].clone() else {
            return false;
        };
        let Some(clause) = self.clause(term, ability, index) else {
            return false;
        };
        let captured = run.stack.split_off(position);
        let mut env = env;
        for arg in args {
            env = push(&env, arg.clone());
        }
        run.env = push(&env, Value::Cont(Rc::new(captured)));
        run.node = clause.body;
        true
    }

    fn bind(&self, pattern: u32, value: &Value, env: Env) -> Option<Env> {
        let pat = self.patterns[pattern as usize];
        match pat.k {
            P_ANY => Some(env),
            P_VAR => Some(push(&env, value.clone())),
            P_AS => {
                let env = push(&env, value.clone());
                self.bind(pat.p, value, env)
            }
            P_LIT => match (value, &self.consts[pat.p as usize]) {
                (Value::Int(x), Value::Int(y)) if x == y => Some(env),
                (Value::Text(x), Value::Text(y)) if x == y => Some(env),
                _ => None,
            },
            _ => {
                if let Value::Bool(flag) = value {
                    return (*flag == (pat.tag == 1)).then_some(env);
                }
                let Value::Con(con) = value else {
                    return None;
                };
                if con.tag != pat.tag || con.ty != pat.ty {
                    return None;
                }
                let mut out = env;
                for k in 0..pat.len {
                    let sub = self.pattern_kids[(pat.lo + k) as usize];
                    let field = con.fields.get(k as usize).cloned().unwrap_or_else(unit);
                    match self.patterns[sub as usize].k {
                        P_VAR => out = push(&out, field),
                        P_ANY => {}
                        _ => out = self.bind(sub, &field, out)?,
                    }
                }
                Some(out)
            }
        }
    }

    /// Chooses the first case from `from` whose pattern matches; sets up its guard or body.
    fn select(
        &mut self,
        run: &mut Run,
        term: TermId,
        scrutinee: Value,
        base: Env,
        from: u32,
    ) -> Result<(), Fail> {
        let node = self.nodes[term as usize];
        for k in from..node.len {
            let case = self.cases[(node.lo + k) as usize];
            if let Some(bound) = self.bind(case.pat, &scrutinee, base.clone()) {
                if case.guard != NONE_ID {
                    run.stack.push(Frame::Guard {
                        term,
                        env: base,
                        value: scrutinee,
                        index: k,
                        bound: bound.clone(),
                    });
                    run.node = case.guard;
                } else {
                    run.node = case.body;
                }
                run.env = bound;
                return Ok(());
            }
        }
        defect(format!("no match for {}", self.show(&scrutinee)))
    }

    fn operand(&self, node: &Node, k: u32) -> TermId {
        self.kids[(node.lo + k) as usize]
    }

    fn step(&mut self, run: &mut Run) -> Result<Option<Value>, Fail> {
        if run.evaluating {
            self.steps += 1;
            if self.steps > self.max_steps {
                let budget = self.max_steps;
                self.max_steps = u64::MAX;
                return Err(Fail::Budget(format!("step budget of {budget} exhausted")));
            }
            let id = run.node;
            let node = self.nodes[id as usize];
            match node.t {
                VAR => {
                    run.value = lookup(&run.env, node.i)?;
                    run.evaluating = false;
                }
                CONST => {
                    run.value = self.consts[node.i as usize].clone();
                    run.evaluating = false;
                }
                REF => {
                    let global = self.resolve(id)?;
                    if let Some((order, counts)) = &mut self.profile {
                        let count = counts.entry(global).or_insert(0);
                        if *count == 0 {
                            order.push(global);
                        }
                        *count += 1;
                    }
                    if let Some(trace) = &mut self.trace {
                        trace.push(global);
                        if trace.len() > 40 {
                            trace.remove(0);
                        }
                    }
                    if let Some(value) = self.ready(global)? {
                        run.value = value;
                        run.evaluating = false;
                        return Ok(None);
                    }
                    if run.stack.iter().any(
                        |frame| matches!(frame, Frame::Global { global: g, .. } if *g == global),
                    ) {
                        return defect(format!(
                            "definition {} depends on its own value",
                            self.hashes[node.c as usize]
                        ));
                    }
                    run.stack.push(Frame::Global { term: id, global });
                    run.node = self.globals[global as usize].term.unwrap_or(id);
                    run.env = None;
                }
                LAM => {
                    run.value = Value::Closure(Rc::new(Closure {
                        lam: id,
                        env: run.env.clone(),
                    }));
                    run.evaluating = false;
                }
                APP => {
                    // Fast path: the callee and every operand are quick, so no frame is needed.
                    let callee = self.nodes[node.a as usize];
                    if callee.t == VAR || callee.t == CONST || callee.t == REF || callee.q {
                        if let Quick::Value(func) = self.quick(node.a, &run.env.clone())? {
                            let mut args = Vec::with_capacity(node.len as usize);
                            let mut ok = true;
                            for k in 0..node.len {
                                let operand_id = self.operand(&node, k);
                                let operand = self.nodes[operand_id as usize];
                                let value = if operand.t == VAR {
                                    Quick::Value(lookup(&run.env, operand.i)?)
                                } else if operand.t == CONST {
                                    Quick::Value(self.consts[operand.i as usize].clone())
                                } else if self.is_quick(operand_id) {
                                    let env = run.env.clone();
                                    self.quick(operand_id, &env)?
                                } else {
                                    Quick::Slow
                                };
                                match value {
                                    Quick::Value(value) => args.push(value),
                                    Quick::Slow => {
                                        ok = false;
                                        break;
                                    }
                                }
                            }
                            if ok {
                                run.evaluating = !self.apply(run, func, args)?;
                                return Ok(None);
                            }
                        }
                    }
                    run.stack.push(Frame::App {
                        term: id,
                        env: run.env.clone(),
                        func: None,
                        args: Vec::new(),
                    });
                    run.node = node.a;
                }
                LET => {
                    if self.is_quick(node.a) {
                        let env = run.env.clone();
                        if let Quick::Value(value) = self.quick(node.a, &env)? {
                            run.env = push(&env, value);
                            run.node = node.b;
                            return Ok(None);
                        }
                    }
                    run.stack.push(Frame::Let {
                        term: id,
                        env: run.env.clone(),
                    });
                    run.node = node.a;
                }
                SEQ => {
                    run.stack.push(Frame::Seq {
                        term: id,
                        env: run.env.clone(),
                    });
                    run.node = node.a;
                }
                LETREC => {
                    let mut cells: Vec<Rc<EnvNode>> = Vec::new();
                    let mut env = run.env.clone();
                    for _ in 0..node.len {
                        let cell = Rc::new(EnvNode {
                            value: std::cell::OnceCell::new(),
                            next: env,
                        });
                        env = Some(cell.clone());
                        cells.push(cell);
                    }
                    for (k, cell) in cells.iter().enumerate() {
                        let lam = self.operand(&node, k as u32);
                        let _ = cell.value.set(Value::Closure(Rc::new(Closure {
                            lam,
                            env: env.clone(),
                        })));
                    }
                    run.env = env;
                    run.node = node.b;
                }
                IF => {
                    if self.is_quick(node.a) {
                        let env = run.env.clone();
                        if let Quick::Value(condition) = self.quick(node.a, &env)? {
                            run.node = if matches!(condition, Value::Bool(true)) {
                                node.b
                            } else {
                                node.c
                            };
                            return Ok(None);
                        }
                    }
                    run.stack.push(Frame::If {
                        term: id,
                        env: run.env.clone(),
                    });
                    run.node = node.a;
                }
                MATCH => {
                    if self.is_quick(node.a) {
                        let env = run.env.clone();
                        if let Quick::Value(scrutinee) = self.quick(node.a, &env)? {
                            self.select(run, id, scrutinee, env, 0)?;
                            return Ok(None);
                        }
                    }
                    run.stack.push(Frame::Match {
                        term: id,
                        env: run.env.clone(),
                    });
                    run.node = node.a;
                }
                HANDLE => {
                    run.stack.push(Frame::Handle {
                        term: id,
                        env: run.env.clone(),
                    });
                    run.node = node.a;
                }
                _ => return panic("core: unknown node".into()),
            }
            return Ok(None);
        }

        let Some(frame) = run.stack.pop() else {
            return Ok(Some(run.value.clone()));
        };
        match frame {
            Frame::App {
                term,
                env,
                mut func,
                mut args,
            } => {
                let value = std::mem::replace(&mut run.value, Value::Int(0));
                if func.is_none() {
                    func = Some(value);
                } else {
                    args.push(value);
                }
                let node = self.nodes[term as usize];
                if (args.len() as u32) < node.len {
                    run.node = self.operand(&node, args.len() as u32);
                    run.env = env.clone();
                    run.stack.push(Frame::App {
                        term,
                        env,
                        func,
                        args,
                    });
                    run.evaluating = true;
                } else {
                    let func = func.unwrap_or_else(unit);
                    run.evaluating = !self.apply(run, func, args)?;
                }
            }
            Frame::Let { term, env } => {
                run.env = push(&env, run.value.clone());
                run.node = self.nodes[term as usize].b;
                run.evaluating = true;
            }
            Frame::Seq { term, env } => {
                run.env = env;
                run.node = self.nodes[term as usize].b;
                run.evaluating = true;
            }
            Frame::If { term, env } => {
                let node = self.nodes[term as usize];
                run.env = env;
                run.node = if matches!(run.value, Value::Bool(true)) {
                    node.b
                } else {
                    node.c
                };
                run.evaluating = true;
            }
            Frame::Match { term, env } => {
                let value = run.value.clone();
                self.select(run, term, value, env, 0)?;
                run.evaluating = true;
            }
            Frame::Guard {
                term,
                env,
                value,
                index,
                bound,
            } => {
                if matches!(run.value, Value::Bool(true)) {
                    let node = self.nodes[term as usize];
                    run.env = bound;
                    run.node = self.cases[(node.lo + index) as usize].body;
                } else {
                    self.select(run, term, value, env, index + 1)?;
                }
                run.evaluating = true;
            }
            Frame::Handle { term, env } => {
                let ret = self.nodes[term as usize].c;
                if ret != NONE_ID {
                    run.env = push(&env, run.value.clone());
                    run.node = ret;
                    run.evaluating = true;
                }
            }
            Frame::Global { global, .. } => {
                self.globals[global as usize].value = Some(run.value.clone());
            }
            Frame::Rest { args, .. } => {
                let value = run.value.clone();
                run.evaluating = !self.apply(run, value, args)?;
            }
        }
        Ok(None)
    }

    /// The definitions a defect passed through, innermost first, down to the handling definition.
    fn stack_trace(&self, run: &Run, bottom: usize, boundary: u32) -> Vec<Rc<str>> {
        let mut owners: Vec<u32> = Vec::new();
        let mut add = |owner: u32| {
            if owner != NONE_ID
                && owner != boundary
                && owners.last() != Some(&owner)
                && owners.len() < TRACE_DEPTH
            {
                owners.push(owner);
            }
        };
        add(self.nodes[run.node as usize].owner);
        for position in (bottom..run.stack.len()).rev() {
            add(self.nodes[run.stack[position].term() as usize].owner);
        }
        owners
            .into_iter()
            .map(|owner| self.hash_of(owner))
            .collect()
    }

    pub fn run(&mut self, start: TermId, env: Env) -> Result<Value, Fail> {
        self.current = Some(Run {
            stack: Vec::new(),
            node: start,
            env,
            value: unit(),
            evaluating: true,
            start,
        });
        self.drive()
    }

    /// Continues a suspended run with the embedder's answer to its pending operation.
    pub fn resume(&mut self, value: Value) -> Result<Value, Fail> {
        match &mut self.current {
            Some(run) => {
                run.value = value;
                run.evaluating = false;
            }
            None => return panic("resume without a suspended run".into()),
        }
        self.drive()
    }

    fn drive(&mut self) -> Result<Value, Fail> {
        let Some(mut run) = self.current.take() else {
            return panic("no run to drive".into());
        };
        loop {
            match self.step(&mut run) {
                Ok(None) => {}
                Ok(Some(value)) => return Ok(value),
                Err(Fail::Defect(message)) | Err(Fail::Budget(message)) => {
                    // A defect becomes a `#Defect` request so a boundary handler can observe it.
                    let handler = self.handler_of(&run, DEFECT, 0);
                    let (bottom, boundary) = match handler {
                        Some(position) => (
                            position + 1,
                            self.nodes[run.stack[position].term() as usize].owner,
                        ),
                        None => (0, NONE_ID),
                    };
                    self.defect_trace = self.stack_trace(&run, bottom, boundary);
                    if self.handle_request(&mut run, DEFECT, 0, &[Value::Text(text(&message))]) {
                        run.evaluating = true;
                        continue;
                    }
                    return Err(Fail::Defect(message));
                }
                Err(suspend @ Fail::Suspend { .. }) => {
                    self.current = Some(run);
                    return Err(suspend);
                }
                Err(other) => return Err(other),
            }
        }
    }

    /// Recently referenced definitions (with `trace`), oldest first.
    pub fn recent(&self) -> Vec<Rc<str>> {
        self.trace
            .iter()
            .flatten()
            .map(|global| self.hash_of(*global))
            .collect()
    }

    /// Entries per definition (with `profile`), most first.
    pub fn profile_report(&self) -> Vec<(u64, Rc<str>)> {
        let Some((order, counts)) = &self.profile else {
            return Vec::new();
        };
        let mut rows: Vec<(u64, Rc<str>)> = order
            .iter()
            .map(|global| (counts[global], self.hash_of(*global)))
            .collect();
        rows.sort_by(|a, b| b.0.cmp(&a.0));
        rows
    }
}

fn list_of(form: &Sexp) -> Result<Rc<Vec<Sexp>>, Fail> {
    match form {
        Sexp::List(items) => Ok(items.clone()),
        other => panic(format!(
            "core: expected list, got {}",
            crate::sexp::print(other)
        )),
    }
}

fn arg(parts: &Rc<Vec<Sexp>>, index: usize) -> Result<&Sexp, Fail> {
    parts.get(index).ok_or_else(|| {
        Fail::Panic(format!(
            "core: missing field {index} of {}",
            crate::sexp::print(&Sexp::List(parts.clone()))
        ))
    })
}

fn sym_of(form: Option<&Sexp>) -> Result<Rc<str>, Fail> {
    match form {
        Some(Sexp::Sym(name)) => Ok(name.clone()),
        Some(other) => panic(format!(
            "core: expected symbol, got {}",
            crate::sexp::print(other)
        )),
        None => panic("core: expected symbol".into()),
    }
}

fn str_of(form: Option<&Sexp>) -> Result<Text, Fail> {
    match form {
        Some(Sexp::Str(value)) => Ok(value.clone()),
        Some(other) => panic(format!(
            "core: expected string, got {}",
            crate::sexp::print(other)
        )),
        None => panic("core: expected string".into()),
    }
}

fn int_of(form: Option<&Sexp>) -> Result<i32, Fail> {
    match form {
        Some(Sexp::Int(value)) => Ok(*value),
        Some(other) => panic(format!(
            "core: expected int, got {}",
            crate::sexp::print(other)
        )),
        None => panic("core: expected int".into()),
    }
}
