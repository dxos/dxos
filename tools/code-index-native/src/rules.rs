//
// Copyright 2026 DXOS.org
//

//! Compiles the N3 subset `rules/*.n3` uses into Datalog rules over interned triples.
//!
//! Supported (see `design/NATIVE-BACKEND.md`): `{ body } => { head }` with triple patterns,
//! `string:matches` / `string:notMatches`, `string:concatenation` over a list, and scoped negation
//! written as `(?x { pattern } ?list) log:collectAllIn ?scope. ?list list:length 0.` Anything else
//! is rejected with the rule it occurs in.

use std::collections::BTreeMap;

use oxigraph::model::{BlankNode, GraphName, Literal as RdfLiteral, NamedNode, Term};
use oxttl::n3::{N3Parser, N3Quad, N3Term};
use regex::Regex;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::facts::{Dict, Id};

const LOG: &str = "http://www.w3.org/2000/10/swap/log#";
const STRING: &str = "http://www.w3.org/2000/10/swap/string#";
const LIST: &str = "http://www.w3.org/2000/10/swap/list#";
const RDF_FIRST: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
const RDF_REST: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
const RDF_NIL: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

#[derive(Debug)]
pub struct RuleError(pub String);

impl std::fmt::Display for RuleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for RuleError {}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Slot {
    Var(usize),
    Const(Id),
}

#[derive(Clone, Debug)]
pub struct Atom(pub [Slot; 3]);

#[derive(Clone, Debug)]
pub enum Literal {
    Pos(Atom),
    /// No binding of the conjunction exists, given the variables bound outside it (`outer`).
    Neg {
        atoms: Vec<Atom>,
        outer: Vec<usize>,
    },
    Matches {
        arg: Slot,
        regex: Regex,
        negate: bool,
    },
    Concat {
        parts: Vec<Slot>,
        out: Slot,
    },
}

#[derive(Clone, Debug)]
pub struct Rule {
    pub index: usize,
    pub body: Vec<Literal>,
    pub head: Vec<Atom>,
    pub vars: usize,
}

/// One rule file: a stratum.
#[derive(Clone, Debug)]
pub struct RuleSet {
    pub rules: Vec<Rule>,
    /// The constant predicates any rule matches on; `None` when some body leaves one unbound.
    pub predicates: Option<FxHashSet<Id>>,
}

impl Atom {
    pub fn vars(&self) -> impl Iterator<Item = usize> + '_ {
        self.0.iter().filter_map(|slot| match slot {
            Slot::Var(var) => Some(*var),
            Slot::Const(_) => None,
        })
    }
}

impl Literal {
    /// Variables the literal needs bound before it can be evaluated (positive atoms need none).
    pub fn inputs(&self) -> Vec<usize> {
        let slot_vars = |slots: &[Slot]| {
            slots
                .iter()
                .filter_map(|slot| match slot {
                    Slot::Var(var) => Some(*var),
                    Slot::Const(_) => None,
                })
                .collect::<Vec<_>>()
        };
        match self {
            Literal::Pos(_) => Vec::new(),
            Literal::Neg { outer, .. } => outer.clone(),
            Literal::Matches { arg, .. } => slot_vars(&[*arg]),
            Literal::Concat { parts, .. } => slot_vars(parts),
        }
    }
}

struct Formulas {
    by_graph: FxHashMap<BlankNode, Vec<N3Quad>>,
    lists: FxHashMap<BlankNode, Vec<N3Term>>,
}

impl Formulas {
    fn list(&self, term: &N3Term) -> Option<Vec<N3Term>> {
        match term {
            N3Term::BlankNode(node) => self.lists.get(node).cloned(),
            N3Term::NamedNode(node) if node.as_str() == RDF_NIL => Some(Vec::new()),
            _ => None,
        }
    }
}

fn named(term: &N3Term) -> Option<&str> {
    match term {
        N3Term::NamedNode(node) => Some(node.as_str()),
        _ => None,
    }
}

/// Collects `rdf:first`/`rdf:rest` chains in every formula into lists keyed by their head node.
fn collect_lists(quads: &[N3Quad]) -> FxHashMap<BlankNode, Vec<N3Term>> {
    let mut first = FxHashMap::default();
    let mut rest = FxHashMap::default();
    for quad in quads {
        if let N3Term::BlankNode(node) = &quad.subject {
            match named(&quad.predicate) {
                Some(RDF_FIRST) => {
                    first.insert(node.clone(), quad.object.clone());
                }
                Some(RDF_REST) => {
                    rest.insert(node.clone(), quad.object.clone());
                }
                _ => {}
            }
        }
    }
    let mut lists = FxHashMap::default();
    for head in first.keys() {
        let mut items = Vec::new();
        let mut cursor = N3Term::BlankNode(head.clone());
        while let N3Term::BlankNode(node) = &cursor {
            let (Some(item), Some(next)) = (first.get(node), rest.get(node)) else {
                break;
            };
            items.push(item.clone());
            cursor = next.clone();
        }
        lists.insert(head.clone(), items);
    }
    lists
}

fn is_list_structure(quad: &N3Quad, formulas: &Formulas) -> bool {
    matches!(named(&quad.predicate), Some(RDF_FIRST | RDF_REST))
        && matches!(&quad.subject, N3Term::BlankNode(node) if formulas.lists.contains_key(node))
}

struct Compiler<'a> {
    dict: &'a Dict,
    vars: BTreeMap<String, usize>,
    index: usize,
}

impl Compiler<'_> {
    fn error(&self, message: impl std::fmt::Display) -> RuleError {
        RuleError(format!("rule {}: {message}", self.index + 1))
    }

    fn var(&mut self, name: String) -> Slot {
        let next = self.vars.len();
        Slot::Var(*self.vars.entry(name).or_insert(next))
    }

    fn slot(&mut self, term: &N3Term) -> Result<Slot, RuleError> {
        Ok(match term {
            N3Term::Variable(variable) => self.var(format!("?{}", variable.as_str())),
            // A blank node in a body is an existential, i.e. an anonymous variable.
            N3Term::BlankNode(node) => self.var(format!("_:{}", node.as_str())),
            N3Term::NamedNode(node) => {
                Slot::Const(self.dict.intern(&Term::NamedNode(node.clone())))
            }
            N3Term::Literal(literal) => {
                Slot::Const(self.dict.intern(&Term::Literal(literal.clone())))
            }
            #[allow(unreachable_patterns)]
            _ => return Err(self.error("quoted triples are not supported")),
        })
    }

    fn atom(&mut self, quad: &N3Quad) -> Result<Atom, RuleError> {
        Ok(Atom([
            self.slot(&quad.subject)?,
            self.slot(&quad.predicate)?,
            self.slot(&quad.object)?,
        ]))
    }

    fn constant_text(&self, term: &N3Term) -> Option<String> {
        match term {
            N3Term::Literal(literal) => Some(literal.value().to_owned()),
            _ => None,
        }
    }

    fn body(&mut self, quads: &[N3Quad], formulas: &Formulas) -> Result<Vec<Literal>, RuleError> {
        let mut literals = Vec::new();
        // `?list list:length 0` triples, consumed by the `log:collectAllIn` that produced the list.
        let mut empty_lists = FxHashSet::default();
        for quad in quads {
            if named(&quad.predicate) == Some(&format!("{LIST}length")) {
                let zero =
                    matches!(&quad.object, N3Term::Literal(literal) if literal.value() == "0");
                match (&quad.subject, zero) {
                    (N3Term::Variable(variable), true) => {
                        empty_lists.insert(variable.as_str().to_owned());
                    }
                    _ => {
                        return Err(
                            self.error("list:length is only supported as `?list list:length 0`")
                        );
                    }
                }
            }
        }
        let mut consumed = FxHashSet::default();
        for quad in quads {
            if is_list_structure(quad, formulas) {
                continue;
            }
            let predicate = named(&quad.predicate).unwrap_or_default().to_owned();
            if predicate == format!("{LIST}length") {
                continue;
            }
            if predicate == format!("{STRING}matches") || predicate == format!("{STRING}notMatches")
            {
                let pattern = self
                    .constant_text(&quad.object)
                    .ok_or_else(|| self.error("string:matches needs a literal pattern"))?;
                let regex = Regex::new(&pattern)
                    .map_err(|error| self.error(format!("bad regex: {error}")))?;
                literals.push(Literal::Matches {
                    arg: self.slot(&quad.subject)?,
                    regex,
                    negate: predicate.ends_with("notMatches"),
                });
            } else if predicate == format!("{STRING}concatenation") {
                let parts = formulas
                    .list(&quad.subject)
                    .ok_or_else(|| self.error("string:concatenation needs a list subject"))?;
                let parts = parts
                    .iter()
                    .map(|part| self.slot(part))
                    .collect::<Result<Vec<_>, _>>()?;
                literals.push(Literal::Concat {
                    parts,
                    out: self.slot(&quad.object)?,
                });
            } else if predicate == format!("{LOG}collectAllIn") {
                let items = formulas
                    .list(&quad.subject)
                    .filter(|items| items.len() == 3)
                    .ok_or_else(|| {
                        self.error("log:collectAllIn needs a (template formula list) subject")
                    })?;
                let N3Term::Variable(list) = &items[2] else {
                    return Err(self.error("log:collectAllIn must collect into a variable"));
                };
                if !empty_lists.contains(list.as_str()) {
                    return Err(self.error(
                        "log:collectAllIn is only supported as negation (`?list list:length 0`)",
                    ));
                }
                consumed.insert(list.as_str().to_owned());
                let N3Term::BlankNode(formula) = &items[1] else {
                    return Err(self.error("log:collectAllIn needs a formula"));
                };
                let pattern = formulas.by_graph.get(formula).cloned().unwrap_or_default();
                let atoms = pattern
                    .iter()
                    .filter(|quad| !is_list_structure(quad, formulas))
                    .map(|quad| self.atom(quad))
                    .collect::<Result<Vec<_>, _>>()?;
                if atoms.is_empty() {
                    return Err(self.error("a negated formula must contain at least one triple"));
                }
                literals.push(Literal::Neg {
                    atoms,
                    outer: Vec::new(),
                });
            } else if predicate.starts_with(LOG)
                || predicate.starts_with(STRING)
                || predicate.starts_with(LIST)
            {
                return Err(self.error(format!("unsupported builtin <{predicate}>")));
            } else {
                literals.push(Literal::Pos(self.atom(quad)?));
            }
        }
        if let Some(list) = empty_lists.iter().find(|list| !consumed.contains(*list)) {
            return Err(self.error(format!(
                "?{list} list:length 0 without a log:collectAllIn producing it"
            )));
        }
        Ok(literals)
    }
}

/// A negation's outer variables are the ones it shares with the rest of the body; the others are
/// local to it (the `?namespace` in `(?namespace { ?namespace deus:namespaceOf ?module } ?l)`).
fn bind_outer(literals: &mut [Literal]) {
    let elsewhere = |skip: usize, literals: &[Literal]| -> FxHashSet<usize> {
        let mut vars = FxHashSet::default();
        for (index, literal) in literals.iter().enumerate() {
            if index != skip {
                vars.extend(outputs(literal));
                vars.extend(literal.inputs());
            }
        }
        vars
    };
    for index in 0..literals.len() {
        if let Literal::Neg { atoms, .. } = &literals[index] {
            let shared = elsewhere(index, literals);
            let mut outer: Vec<usize> = atoms
                .iter()
                .flat_map(Atom::vars)
                .filter(|var| shared.contains(var))
                .collect();
            outer.sort_unstable();
            outer.dedup();
            if let Literal::Neg { outer: slot, .. } = &mut literals[index] {
                *slot = outer;
            }
        }
    }
}

/// Variables a literal binds once evaluated.
fn outputs(literal: &Literal) -> Vec<usize> {
    match literal {
        Literal::Pos(atom) => atom.vars().collect(),
        Literal::Concat {
            out: Slot::Var(var),
            ..
        } => vec![*var],
        _ => Vec::new(),
    }
}

/// Checks the body can be evaluated in some order with every builtin's inputs bound, and that every
/// head variable is bound by the body.
fn check_safe(rule: &Rule, names: &BTreeMap<String, usize>) -> Result<(), RuleError> {
    let name = |var: usize| {
        names
            .iter()
            .find(|(_, index)| **index == var)
            .map(|(name, _)| name.clone())
            .unwrap_or_default()
    };
    let mut bound = FxHashSet::default();
    let mut pending: Vec<&Literal> = rule.body.iter().collect();
    loop {
        let before = pending.len();
        pending.retain(|literal| {
            let ready = literal.inputs().iter().all(|var| bound.contains(var));
            if ready {
                bound.extend(outputs(literal));
            }
            !ready
        });
        if pending.len() == before {
            break;
        }
    }
    if let Some(literal) = pending.first() {
        let missing = literal
            .inputs()
            .into_iter()
            .find(|var| !bound.contains(var))
            .map(name);
        return Err(RuleError(format!(
            "rule {}: builtin input {} is never bound",
            rule.index + 1,
            missing.unwrap_or_default()
        )));
    }
    for atom in &rule.head {
        if let Some(var) = atom.vars().find(|var| !bound.contains(var)) {
            return Err(RuleError(format!(
                "rule {}: head variable {} is not bound by the body",
                rule.index + 1,
                name(var)
            )));
        }
    }
    Ok(())
}

/// Parses one rule file.
pub fn compile(text: &str, dict: &Dict) -> Result<RuleSet, RuleError> {
    let quads = N3Parser::new()
        .for_slice(text)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| RuleError(format!("N3 syntax error: {error}")))?;
    let mut by_graph: FxHashMap<BlankNode, Vec<N3Quad>> = FxHashMap::default();
    let mut top = Vec::new();
    for quad in &quads {
        match &quad.graph_name {
            GraphName::BlankNode(node) => {
                by_graph.entry(node.clone()).or_default().push(quad.clone())
            }
            GraphName::DefaultGraph => top.push(quad.clone()),
            GraphName::NamedNode(_) => {
                return Err(RuleError("unexpected named graph in a rule file".into()));
            }
        }
    }
    let formulas = Formulas {
        by_graph,
        lists: collect_lists(&quads),
    };

    let implies = format!("{LOG}implies");
    let mut rules = Vec::new();
    for quad in &top {
        if is_list_structure(quad, &formulas) {
            continue;
        }
        if named(&quad.predicate) != Some(implies.as_str()) {
            return Err(RuleError(format!(
                "only rules are supported at the top level, found: {quad}"
            )));
        }
        let (N3Term::BlankNode(body), N3Term::BlankNode(head)) = (&quad.subject, &quad.object)
        else {
            return Err(RuleError(format!(
                "a rule needs a formula on both sides: {quad}"
            )));
        };
        let mut compiler = Compiler {
            dict,
            vars: BTreeMap::new(),
            index: rules.len(),
        };
        let body_quads = formulas.by_graph.get(body).cloned().unwrap_or_default();
        let mut literals = compiler.body(&body_quads, &formulas)?;
        bind_outer(&mut literals);
        let mut head_atoms = Vec::new();
        for quad in formulas.by_graph.get(head).cloned().unwrap_or_default() {
            if matches!(quad.subject, N3Term::BlankNode(_))
                || matches!(quad.object, N3Term::BlankNode(_))
            {
                return Err(compiler.error("blank nodes and lists in a head are not supported"));
            }
            head_atoms.push(compiler.atom(&quad)?);
        }
        let rule = Rule {
            index: rules.len(),
            body: literals,
            head: head_atoms,
            vars: compiler.vars.len(),
        };
        check_safe(&rule, &compiler.vars)?;
        rules.push(rule);
    }

    let mut predicates = Some(FxHashSet::default());
    for rule in &rules {
        for literal in &rule.body {
            let atoms: Vec<&Atom> = match literal {
                Literal::Pos(atom) => vec![atom],
                Literal::Neg { atoms, .. } => atoms.iter().collect(),
                _ => Vec::new(),
            };
            for atom in atoms {
                match (atom.0[1], predicates.as_mut()) {
                    (Slot::Const(id), Some(set)) => {
                        set.insert(id);
                    }
                    (Slot::Var(_), _) => predicates = None,
                    _ => {}
                }
            }
        }
    }

    // Stratification: a negated predicate must not be concluded by the same file.
    let heads: Vec<Slot> = rules
        .iter()
        .flat_map(|rule| rule.head.iter().map(|atom| atom.0[1]))
        .collect();
    for rule in &rules {
        for literal in &rule.body {
            if let Literal::Neg { atoms, .. } = literal {
                for atom in atoms {
                    let clash = heads.iter().any(|head| match (head, atom.0[1]) {
                        (Slot::Var(_), _) | (_, Slot::Var(_)) => true,
                        (Slot::Const(a), Slot::Const(b)) => *a == b,
                    });
                    if clash {
                        return Err(RuleError(format!(
                            "rule {}: negates a predicate the same file concludes (not stratifiable)",
                            rule.index + 1
                        )));
                    }
                }
            }
        }
    }
    Ok(RuleSet { rules, predicates })
}

/// A plain `xsd:string` literal, as `string:concatenation` produces.
pub fn string_literal(value: String) -> Term {
    Term::Literal(RdfLiteral::new_simple_literal(value))
}

#[allow(dead_code)]
pub fn iri(value: &str) -> Term {
    Term::NamedNode(NamedNode::new_unchecked(value))
}
