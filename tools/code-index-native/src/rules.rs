//
// Copyright 2026 DXOS.org
//

//! Compiles the N3 subset `rules/*.n3` uses into Datalog rules over interned triples.
//!
//! Supported (see `design/NATIVE-BACKEND.md`):
//! - forward rules `{ body } => { head }`, and backward rules `{ head } <= { body }`, which are never
//!   materialized: a body atom whose predicate one of them concludes is proved on demand (as EYE
//!   does), so a backward head may name variables only its caller binds;
//! - ground triples at the top level: premises of this file alone, never part of its output;
//! - lists, as builtin arguments and as the terms of backward rules;
//! - `log:collectAllIn` (a `?list list:length 0` over it is scoped negation), `log:notIncludes`,
//!   `log:notEqualTo`, `log:uri`, `list:in`, `list:length`, `list:first`, `string:matches`,
//!   `string:notMatches` (a constant pattern or one read from the data), `string:concatenation`,
//!   `string:scrape`, `string:startsWith`, `string:endsWith` and `string:contains`.
//!
//! Anything else is rejected with the rule it occurs in.

use std::collections::BTreeMap;

use oxigraph::model::{BlankNode, GraphName, Literal as RdfLiteral, NamedNode, Term};
use oxttl::n3::{N3Parser, N3Quad, N3Term};
use regex::Regex;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::facts::{Dict, Id, TripleSet};

const LOG: &str = "http://www.w3.org/2000/10/swap/log#";
const STRING: &str = "http://www.w3.org/2000/10/swap/string#";
const LIST: &str = "http://www.w3.org/2000/10/swap/list#";
const RDF_FIRST: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
const RDF_REST: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
const RDF_NIL: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

/// What a backward rule's `<=` is rewritten to before parsing: the N3 parser reads `{ h } <= { b }`
/// as `{ b } => { h }`, and the two must stay apart.
const IMPLIED_BY: &str = "urn:code-index:impliedBy";

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
    /// A list term, by its index in the rule's `lists`.
    List(usize),
}

#[derive(Clone, Debug)]
pub struct Atom(pub [Slot; 3]);

#[derive(Clone, Debug)]
pub enum Literal {
    /// Matched against the facts.
    Pos(Atom),
    /// Matched against the facts and proved by the backward rules concluding its predicate.
    Call(Atom),
    /// No solution of `body` exists, given the variables bound outside it (`outer`).
    Neg {
        body: Vec<Literal>,
        outer: Vec<usize>,
    },
    /// `out` is the list of `template` over every solution of `body`.
    Collect {
        template: Slot,
        body: Vec<Literal>,
        outer: Vec<usize>,
        out: usize,
    },
    /// A constant pattern is compiled once; one read from the data when it is bound.
    Matches {
        arg: Slot,
        pattern: Slot,
        regex: Option<Regex>,
        negate: bool,
    },
    Concat {
        parts: Vec<Slot>,
        out: Slot,
    },
    /// `item list:in list`: a membership test, or each member in turn when `item` is unbound.
    In {
        item: Slot,
        list: Slot,
    },
    Length {
        list: Slot,
        length: Slot,
    },
    First {
        list: Slot,
        item: Slot,
    },
    /// `node log:uri text`: an IRI's text.
    Uri {
        node: Slot,
        text: Slot,
    },
    /// `(text regex) string:scrape out`: the first capture group of the first match. A constant
    /// pattern is compiled once; one built by the body is compiled when it is bound.
    Scrape {
        text: Slot,
        pattern: Slot,
        regex: Option<Regex>,
        out: Slot,
    },
    /// A test over two bound terms: the string tests compare lexical forms, `NotEqual` terms.
    Compare {
        left: Slot,
        right: Slot,
        op: Compare,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Compare {
    StartsWith,
    EndsWith,
    Contains,
    NotEqual,
}

#[derive(Clone, Debug)]
pub struct Rule {
    pub index: usize,
    pub body: Vec<Literal>,
    pub head: Vec<Atom>,
    pub vars: usize,
    pub lists: Vec<Vec<Slot>>,
}

/// One rule file: a stratum.
#[derive(Clone, Debug, Default)]
pub struct RuleSet {
    pub rules: Vec<Rule>,
    /// Backward rules by the predicate they conclude.
    pub backward: FxHashMap<Id, Vec<Rule>>,
    /// The file's own ground facts.
    pub axioms: TripleSet,
    /// Whether DRed can maintain the stratum: it proves nothing on demand and aggregates nothing,
    /// so every conclusion's dependence on a premise is visible in a forward rule's body.
    pub maintainable: bool,
    /// The forward rules (by position) in an order where each group follows every group concluding
    /// what it reads, directly or through the backward rules it calls; a cyclic group runs to a fixpoint.
    pub groups: Vec<Group>,
    /// The backward predicates whose proofs read nothing the file concludes forward, so a proof
    /// holds for the whole evaluation.
    pub stable: FxHashSet<Id>,
    /// Every predicate a body reads; `None` when one leaves it unbound.
    pub predicates: Option<FxHashSet<Id>>,
}

#[derive(Clone, Debug)]
pub struct Group {
    pub rules: Vec<usize>,
    pub cyclic: bool,
}

impl Rule {
    /// Variables in a slot, through lists.
    pub fn slot_vars(&self, slot: &Slot, out: &mut Vec<usize>) {
        match slot {
            Slot::Var(var) => out.push(*var),
            Slot::Const(_) => {}
            Slot::List(index) => {
                for item in &self.lists[*index] {
                    self.slot_vars(item, out);
                }
            }
        }
    }

    pub fn atom_vars(&self, atom: &Atom) -> Vec<usize> {
        let mut vars = Vec::new();
        for slot in &atom.0 {
            self.slot_vars(slot, &mut vars);
        }
        vars
    }

    fn vars_of(&self, slots: &[&Slot]) -> Vec<usize> {
        let mut vars = Vec::new();
        for slot in slots {
            self.slot_vars(slot, &mut vars);
        }
        vars
    }

    /// Variables the literal needs bound before it can be evaluated.
    pub fn inputs(&self, literal: &Literal) -> Vec<usize> {
        match literal {
            Literal::Pos(_) | Literal::Call(_) => Vec::new(),
            Literal::Neg { outer, .. } | Literal::Collect { outer, .. } => outer.clone(),
            Literal::Matches { arg, pattern, .. } => self.vars_of(&[arg, pattern]),
            Literal::Concat { parts, .. } => self.vars_of(&parts.iter().collect::<Vec<_>>()),
            Literal::In { list, .. }
            | Literal::Length { list, .. }
            | Literal::First { list, .. } => self.vars_of(&[list]),
            Literal::Uri { node, .. } => self.vars_of(&[node]),
            Literal::Scrape { text, pattern, .. } => self.vars_of(&[text, pattern]),
            Literal::Compare { left, right, .. } => self.vars_of(&[left, right]),
        }
    }

    /// Variables a literal binds once evaluated.
    pub fn outputs(&self, literal: &Literal) -> Vec<usize> {
        match literal {
            Literal::Pos(atom) | Literal::Call(atom) => self.atom_vars(atom),
            Literal::Collect { out, .. } => vec![*out],
            Literal::Concat { out, .. } | Literal::Scrape { out, .. } => self.vars_of(&[out]),
            Literal::In { item, .. } | Literal::First { item, .. } => self.vars_of(&[item]),
            Literal::Length { length, .. } => self.vars_of(&[length]),
            Literal::Uri { text, .. } => self.vars_of(&[text]),
            _ => Vec::new(),
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

    fn formula(&self, term: &N3Term) -> Option<Vec<N3Quad>> {
        match term {
            N3Term::BlankNode(node) => self.by_graph.get(node).cloned(),
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

/// Rewrites each `<=` token outside comments, strings and IRIs to [`IMPLIED_BY`].
fn mark_backward(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut index = 0;
    while index < chars.len() {
        let char = chars[index];
        match char {
            '#' => {
                while index < chars.len() && chars[index] != '\n' {
                    out.push(chars[index]);
                    index += 1;
                }
                continue;
            }
            '"' | '\'' => {
                let long =
                    chars.get(index + 1) == Some(&char) && chars.get(index + 2) == Some(&char);
                let quote = if long { 3 } else { 1 };
                out.extend(&chars[index..index + quote]);
                index += quote;
                while index < chars.len() {
                    if chars[index] == '\\' {
                        out.extend(chars.get(index..index + 2).unwrap_or(&chars[index..]));
                        index += 2;
                        continue;
                    }
                    if chars[index] == char
                        && (!long
                            || (chars.get(index + 1) == Some(&char)
                                && chars.get(index + 2) == Some(&char)))
                    {
                        out.extend(&chars[index..index + quote]);
                        index += quote;
                        break;
                    }
                    out.push(chars[index]);
                    index += 1;
                }
                continue;
            }
            '<' if chars.get(index + 1) == Some(&'=') => {
                out.push_str(&format!(" <{IMPLIED_BY}> "));
                index += 2;
                continue;
            }
            '<' => {
                while index < chars.len() && chars[index] != '>' {
                    out.push(chars[index]);
                    index += 1;
                }
            }
            _ => {}
        }
        if index < chars.len() {
            out.push(chars[index]);
            index += 1;
        }
    }
    out
}

struct Compiler<'a> {
    dict: &'a Dict,
    formulas: &'a Formulas,
    vars: BTreeMap<String, usize>,
    lists: Vec<Vec<Slot>>,
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
        if let Some(items) = self.formulas.list(term) {
            let items = items
                .iter()
                .map(|item| self.slot(item))
                .collect::<Result<Vec<_>, _>>()?;
            self.lists.push(items);
            return Ok(Slot::List(self.lists.len() - 1));
        }
        Ok(match term {
            N3Term::Variable(variable) => self.var(format!("?{}", variable.as_str())),
            N3Term::BlankNode(node) if self.formulas.by_graph.contains_key(node) => {
                return Err(self.error("a formula is not a term here"));
            }
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

    fn regex(&self, term: &N3Term) -> Result<Regex, RuleError> {
        let pattern = self
            .constant_text(term)
            .ok_or_else(|| self.error("a regex must be a literal"))?;
        Regex::new(&pattern).map_err(|error| self.error(format!("bad regex: {error}")))
    }

    fn pair(&mut self, term: &N3Term, builtin: &str) -> Result<[N3Term; 2], RuleError> {
        let items = self
            .formulas
            .list(term)
            .filter(|items| items.len() == 2)
            .ok_or_else(|| self.error(format!("{builtin} needs a two-item list subject")))?;
        Ok([items[0].clone(), items[1].clone()])
    }

    fn body(&mut self, quads: &[N3Quad]) -> Result<Vec<Literal>, RuleError> {
        let mut literals = Vec::new();
        for quad in quads {
            if is_list_structure(quad, self.formulas) {
                continue;
            }
            let predicate = named(&quad.predicate).unwrap_or_default().to_owned();
            let literal = match predicate.as_str() {
                p if p == format!("{STRING}matches") || p == format!("{STRING}notMatches") => {
                    Literal::Matches {
                        regex: match quad.object {
                            N3Term::Literal(_) => Some(self.regex(&quad.object)?),
                            _ => None,
                        },
                        pattern: self.slot(&quad.object)?,
                        arg: self.slot(&quad.subject)?,
                        negate: p.ends_with("notMatches"),
                    }
                }
                p if p == format!("{STRING}concatenation") => {
                    let parts = self
                        .formulas
                        .list(&quad.subject)
                        .ok_or_else(|| self.error("string:concatenation needs a list subject"))?;
                    Literal::Concat {
                        parts: parts
                            .iter()
                            .map(|part| self.slot(part))
                            .collect::<Result<Vec<_>, _>>()?,
                        out: self.slot(&quad.object)?,
                    }
                }
                p if p == format!("{STRING}scrape") => {
                    let [text, pattern] = self.pair(&quad.subject, "string:scrape")?;
                    Literal::Scrape {
                        text: self.slot(&text)?,
                        regex: match pattern {
                            N3Term::Literal(_) => Some(self.regex(&pattern)?),
                            _ => None,
                        },
                        pattern: self.slot(&pattern)?,
                        out: self.slot(&quad.object)?,
                    }
                }
                p if [
                    format!("{STRING}startsWith"),
                    format!("{STRING}endsWith"),
                    format!("{STRING}contains"),
                    format!("{LOG}notEqualTo"),
                ]
                .contains(&p.to_owned()) =>
                {
                    Literal::Compare {
                        left: self.slot(&quad.subject)?,
                        right: self.slot(&quad.object)?,
                        op: match p.rsplit(['#', '/']).next() {
                            Some("startsWith") => Compare::StartsWith,
                            Some("endsWith") => Compare::EndsWith,
                            Some("contains") => Compare::Contains,
                            _ => Compare::NotEqual,
                        },
                    }
                }
                p if p == format!("{LIST}in") => Literal::In {
                    item: self.slot(&quad.subject)?,
                    list: self.slot(&quad.object)?,
                },
                p if p == format!("{LIST}length") => Literal::Length {
                    list: self.slot(&quad.subject)?,
                    length: self.slot(&quad.object)?,
                },
                p if p == format!("{LIST}first") => Literal::First {
                    list: self.slot(&quad.subject)?,
                    item: self.slot(&quad.object)?,
                },
                p if p == format!("{LOG}uri") => Literal::Uri {
                    node: self.slot(&quad.subject)?,
                    text: self.slot(&quad.object)?,
                },
                p if p == format!("{LOG}notIncludes") => {
                    let formula = self
                        .formulas
                        .formula(&quad.object)
                        .ok_or_else(|| self.error("log:notIncludes needs a formula object"))?;
                    let body = self.body(&formula)?;
                    if body.is_empty() {
                        return Err(
                            self.error("a negated formula must contain at least one triple")
                        );
                    }
                    Literal::Neg {
                        body,
                        outer: Vec::new(),
                    }
                }
                p if p == format!("{LOG}collectAllIn") => {
                    let items = self
                        .formulas
                        .list(&quad.subject)
                        .filter(|items| items.len() == 3)
                        .ok_or_else(|| {
                            self.error("log:collectAllIn needs a (template formula list) subject")
                        })?;
                    let N3Term::Variable(list) = &items[2] else {
                        return Err(self.error("log:collectAllIn must collect into a variable"));
                    };
                    let formula = self
                        .formulas
                        .formula(&items[1])
                        .ok_or_else(|| self.error("log:collectAllIn needs a formula"))?;
                    let body = self.body(&formula)?;
                    if body.is_empty() {
                        return Err(
                            self.error("a collected formula must contain at least one triple")
                        );
                    }
                    let Slot::Var(out) = self.var(format!("?{}", list.as_str())) else {
                        unreachable!("a variable compiles to a variable slot");
                    };
                    Literal::Collect {
                        template: self.slot(&items[0])?,
                        body,
                        outer: Vec::new(),
                        out,
                    }
                }
                p if p.starts_with(LOG) || p.starts_with(STRING) || p.starts_with(LIST) => {
                    return Err(self.error(format!("unsupported builtin <{p}>")));
                }
                _ => Literal::Pos(self.atom(quad)?),
            };
            literals.push(literal);
        }
        Ok(literals)
    }
}

/// `(?x { … } ?l) log:collectAllIn ?s. ?l list:length 0`, with `?l` used nowhere else, is negation:
/// rewritten so DRed can maintain it.
fn negations(rule: &mut Rule, zero: Id) {
    fn count(rule: &Rule, literals: &[Literal], uses: &mut FxHashMap<usize, usize>) {
        for literal in literals {
            let mut vars = rule.inputs(literal);
            vars.extend(rule.outputs(literal));
            if let Literal::Collect { template, .. } = literal {
                rule.slot_vars(template, &mut vars);
            }
            vars.sort_unstable();
            vars.dedup();
            for var in vars {
                *uses.entry(var).or_default() += 1;
            }
            if let Literal::Neg { body, .. } | Literal::Collect { body, .. } = literal {
                count(rule, body, uses);
            }
        }
    }
    fn rewrite(literals: &mut Vec<Literal>, uses: &FxHashMap<usize, usize>, zero: Id) {
        let empty: FxHashSet<usize> = literals
            .iter()
            .filter_map(|literal| match literal {
                Literal::Length {
                    list: Slot::Var(list),
                    length: Slot::Const(length),
                } if *length == zero && uses.get(list) == Some(&2) => Some(*list),
                _ => None,
            })
            .collect();
        let mut rewritten = Vec::with_capacity(literals.len());
        for literal in literals.drain(..) {
            match literal {
                Literal::Length {
                    list: Slot::Var(list),
                    ..
                } if empty.contains(&list) => {}
                Literal::Collect {
                    body, outer, out, ..
                } if empty.contains(&out) => {
                    rewritten.push(Literal::Neg { body, outer });
                }
                other => rewritten.push(other),
            }
        }
        *literals = rewritten;
        for literal in literals.iter_mut() {
            if let Literal::Neg { body, .. } | Literal::Collect { body, .. } = literal {
                rewrite(body, uses, zero);
            }
        }
    }
    let mut uses: FxHashMap<usize, usize> = FxHashMap::default();
    for atom in &rule.head {
        for var in rule.atom_vars(atom) {
            *uses.entry(var).or_default() += 1;
        }
    }
    count(rule, &rule.body, &mut uses);
    rewrite(&mut rule.body, &uses, zero);
}

/// A negation's or collection's outer variables are the ones it shares with the rest of the rule;
/// the others are local to it (the `?namespace` in `(?namespace { ?namespace deus:namespaceOf ?module } ?l)`).
fn bind_outer(rule: &mut Rule) {
    fn vars_in(rule: &Rule, literal: &Literal, out: &mut FxHashSet<usize>) {
        out.extend(rule.inputs(literal));
        out.extend(rule.outputs(literal));
        if let Literal::Collect { template, .. } = literal {
            let mut vars = Vec::new();
            rule.slot_vars(template, &mut vars);
            out.extend(vars);
        }
        if let Literal::Neg { body, .. } | Literal::Collect { body, .. } = literal {
            for inner in body {
                vars_in(rule, inner, out);
            }
        }
    }
    fn walk(
        rule: &Rule,
        literals: &[Literal],
        context: &FxHashSet<usize>,
        outers: &mut Vec<Vec<usize>>,
    ) {
        for (index, literal) in literals.iter().enumerate() {
            if let Literal::Neg { body, .. } | Literal::Collect { body, .. } = literal {
                // What the formula can see: the enclosing context and its siblings.
                let mut visible = context.clone();
                for (other, sibling) in literals.iter().enumerate() {
                    if other != index {
                        vars_in(rule, sibling, &mut visible);
                    }
                }
                let mut inside = FxHashSet::default();
                for inner in body {
                    vars_in(rule, inner, &mut inside);
                }
                let mut outer: Vec<usize> = inside.intersection(&visible).copied().collect();
                outer.sort_unstable();
                outers.push(outer);
                walk(rule, body, &visible, outers);
            }
        }
    }
    fn assign(literals: &mut [Literal], outers: &mut std::vec::IntoIter<Vec<usize>>) {
        for literal in literals.iter_mut() {
            if let Literal::Neg { body, outer } | Literal::Collect { body, outer, .. } = literal {
                *outer = outers.next().unwrap_or_default();
                assign(body, outers);
            }
        }
    }
    let mut context = FxHashSet::default();
    for atom in &rule.head {
        context.extend(rule.atom_vars(atom));
    }
    let mut outers = Vec::new();
    walk(rule, &rule.body, &context, &mut outers);
    let mut outers = outers.into_iter();
    assign(&mut rule.body, &mut outers);
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
            let ready = rule.inputs(literal).iter().all(|var| bound.contains(var));
            if ready {
                bound.extend(rule.outputs(literal));
            }
            !ready
        });
        if pending.len() == before {
            break;
        }
    }
    if let Some(literal) = pending.first() {
        let missing = rule
            .inputs(literal)
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
        if let Some(var) = rule
            .atom_vars(atom)
            .into_iter()
            .find(|var| !bound.contains(var))
        {
            return Err(RuleError(format!(
                "rule {}: head variable {} is not bound by the body",
                rule.index + 1,
                name(var)
            )));
        }
    }
    Ok(())
}

/// Turns each positive atom whose predicate a backward rule concludes into a call.
fn calls(literals: &mut [Literal], backward: &FxHashSet<Id>) {
    for literal in literals.iter_mut() {
        match literal {
            Literal::Pos(atom) if matches!(atom.0[1], Slot::Const(id) if backward.contains(&id)) => {
                *literal = Literal::Call(atom.clone());
            }
            Literal::Neg { body, .. } | Literal::Collect { body, .. } => calls(body, backward),
            _ => {}
        }
    }
}

/// The predicates a body reads, through the backward rules it calls.
fn reads(
    literals: &[Literal],
    backward: &FxHashMap<Id, Vec<Rule>>,
    seen: &mut FxHashSet<Id>,
    out: &mut FxHashSet<[Option<Id>; 3]>,
) {
    for literal in literals {
        match literal {
            Literal::Pos(atom) | Literal::Call(atom) => {
                out.insert(constants(atom));
                let predicate = constants(atom)[1];
                if let (Literal::Call(_), Some(id)) = (literal, predicate)
                    && seen.insert(id)
                {
                    for rule in backward.get(&id).into_iter().flatten() {
                        reads(&rule.body, backward, seen, out);
                    }
                }
            }
            Literal::Neg { body, .. } | Literal::Collect { body, .. } => {
                reads(body, backward, seen, out)
            }
            _ => {}
        }
    }
}

/// An atom's constant positions; a variable or list matches anything.
fn constants(atom: &Atom) -> [Option<Id>; 3] {
    atom.0.map(|slot| match slot {
        Slot::Const(id) => Some(id),
        _ => None,
    })
}

/// The forward rules grouped into strongly connected components of "reads what the other concludes",
/// dependencies first (Tarjan's algorithm emits a component after everything it reaches).
fn order(rules: &[Rule], backward: &FxHashMap<Id, Vec<Rule>>) -> Vec<Group> {
    let reads_of: Vec<FxHashSet<[Option<Id>; 3]>> = rules
        .iter()
        .map(|rule| {
            let mut read = FxHashSet::default();
            reads(&rule.body, backward, &mut FxHashSet::default(), &mut read);
            read
        })
        .collect();
    let feeds = |from: usize, to: usize| {
        rules[from]
            .head
            .iter()
            .map(constants)
            .any(|head| reads_of[to].iter().any(|atom| unifiable(&head, atom)))
    };
    let edges: Vec<Vec<usize>> = (0..rules.len())
        .map(|to| (0..rules.len()).filter(|from| feeds(*from, to)).collect())
        .collect();

    struct Tarjan<'a> {
        edges: &'a [Vec<usize>],
        index: Vec<Option<usize>>,
        low: Vec<usize>,
        stack: Vec<usize>,
        on_stack: Vec<bool>,
        next: usize,
        groups: Vec<Group>,
    }
    impl Tarjan<'_> {
        fn visit(&mut self, node: usize) {
            self.index[node] = Some(self.next);
            self.low[node] = self.next;
            self.next += 1;
            self.stack.push(node);
            self.on_stack[node] = true;
            for &other in &self.edges[node] {
                match self.index[other] {
                    None => {
                        self.visit(other);
                        self.low[node] = self.low[node].min(self.low[other]);
                    }
                    Some(index) if self.on_stack[other] => {
                        self.low[node] = self.low[node].min(index);
                    }
                    _ => {}
                }
            }
            if Some(self.low[node]) == self.index[node] {
                let mut members = Vec::new();
                while let Some(member) = self.stack.pop() {
                    self.on_stack[member] = false;
                    members.push(member);
                    if member == node {
                        break;
                    }
                }
                members.sort_unstable();
                let cyclic = members.len() > 1 || self.edges[node].contains(&node);
                self.groups.push(Group {
                    rules: members,
                    cyclic,
                });
            }
        }
    }
    let mut tarjan = Tarjan {
        edges: &edges,
        index: vec![None; rules.len()],
        low: vec![0; rules.len()],
        stack: Vec::new(),
        on_stack: vec![false; rules.len()],
        next: 0,
        groups: Vec::new(),
    };
    for node in 0..rules.len() {
        if tarjan.index[node].is_none() {
            tarjan.visit(node);
        }
    }
    tarjan.groups
}

/// Whether two constant patterns can describe the same triple.
fn unifiable(left: &[Option<Id>; 3], right: &[Option<Id>; 3]) -> bool {
    left.iter()
        .zip(right)
        .all(|(a, b)| a.is_none() || b.is_none() || a == b)
}

/// Negations and collections, through the backward rules a body calls.
fn aggregates(literals: &[Literal], out: &mut Vec<Vec<Literal>>) {
    for literal in literals {
        if let Literal::Neg { body, .. } | Literal::Collect { body, .. } = literal {
            out.push(body.clone());
            aggregates(body, out);
        }
    }
}

fn has(literals: &[Literal], test: &dyn Fn(&Literal) -> bool) -> bool {
    literals.iter().any(|literal| {
        test(literal)
            || matches!(literal, Literal::Neg { body, .. } | Literal::Collect { body, .. } if has(body, test))
    })
}

/// Parses one rule file.
pub fn compile(text: &str, dict: &Dict) -> Result<RuleSet, RuleError> {
    let marked = mark_backward(text);
    let quads = N3Parser::new()
        .for_slice(&marked)
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
    let zero = dict.intern(&integer_literal(0));
    let mut forward = Vec::new();
    let mut backward_rules = Vec::new();
    let mut axioms = TripleSet::default();
    for quad in top
        .iter()
        .filter(|quad| !is_list_structure(quad, &formulas))
    {
        let index = forward.len() + backward_rules.len();
        let is_backward = named(&quad.predicate) == Some(IMPLIED_BY);
        if !is_backward && named(&quad.predicate) != Some(implies.as_str()) {
            let constant = |term: &N3Term| match term {
                N3Term::NamedNode(node) => Some(dict.intern(&Term::NamedNode(node.clone()))),
                N3Term::Literal(literal) => Some(dict.intern(&Term::Literal(literal.clone()))),
                _ => None,
            };
            let (Some(s), Some(p), Some(o)) = (
                constant(&quad.subject),
                constant(&quad.predicate),
                constant(&quad.object),
            ) else {
                return Err(RuleError(format!(
                    "only rules and ground facts are supported at the top level, found: {quad}"
                )));
            };
            axioms.insert([s, p, o]);
            continue;
        }
        let (head, body) = if is_backward {
            (&quad.subject, &quad.object)
        } else {
            (&quad.object, &quad.subject)
        };
        let (N3Term::BlankNode(head), N3Term::BlankNode(body)) = (head, body) else {
            return Err(RuleError(format!(
                "a rule needs a formula on both sides: {quad}"
            )));
        };
        let mut compiler = Compiler {
            dict,
            formulas: &formulas,
            vars: BTreeMap::new(),
            lists: Vec::new(),
            index,
        };
        let body_quads = formulas.by_graph.get(body).cloned().unwrap_or_default();
        let literals = compiler.body(&body_quads)?;
        let mut head_atoms = Vec::new();
        for quad in formulas.by_graph.get(head).cloned().unwrap_or_default() {
            if is_list_structure(&quad, &formulas) {
                continue;
            }
            if !is_backward
                && (matches!(quad.subject, N3Term::BlankNode(_))
                    || matches!(quad.object, N3Term::BlankNode(_)))
            {
                return Err(compiler.error("blank nodes and lists in a head are not supported"));
            }
            head_atoms.push(compiler.atom(&quad)?);
        }
        if is_backward && (head_atoms.len() != 1 || !matches!(head_atoms[0].0[1], Slot::Const(_))) {
            return Err(
                compiler.error("a backward rule concludes one triple with a constant predicate")
            );
        }
        let mut rule = Rule {
            index,
            body: literals,
            head: head_atoms,
            vars: compiler.vars.len(),
            lists: compiler.lists,
        };
        negations(&mut rule, zero);
        bind_outer(&mut rule);
        if is_backward {
            backward_rules.push(rule);
        } else {
            check_safe(&rule, &compiler.vars)?;
            forward.push(rule);
        }
    }

    let concluded_backward: FxHashSet<Id> = backward_rules
        .iter()
        .filter_map(|rule| match rule.head[0].0[1] {
            Slot::Const(id) => Some(id),
            _ => None,
        })
        .collect();
    for rule in forward.iter_mut().chain(backward_rules.iter_mut()) {
        calls(&mut rule.body, &concluded_backward);
    }
    let mut backward: FxHashMap<Id, Vec<Rule>> = FxHashMap::default();
    for rule in backward_rules {
        if let Slot::Const(id) = rule.head[0].0[1] {
            backward.entry(id).or_default().push(rule);
        }
    }

    let maintainable = backward.is_empty()
        && !forward.iter().any(|rule| {
            has(&rule.body, &|literal| {
                matches!(literal, Literal::Collect { .. })
            })
        });

    // Stratification, which DRed's handling of negation relies on: a negated formula must not read
    // a triple the same file could conclude forward. A stratum DRed does not maintain is evaluated
    // in rounds, as EYE evaluates it, and is not held to this.
    let heads: Vec<[Option<Id>; 3]> = forward
        .iter()
        .flat_map(|rule| rule.head.iter().map(constants))
        .collect();
    for rule in forward.iter().filter(|_| maintainable) {
        let mut formulas = Vec::new();
        aggregates(&rule.body, &mut formulas);
        for formula in formulas {
            let mut read = FxHashSet::default();
            reads(&formula, &backward, &mut FxHashSet::default(), &mut read);
            let clash = heads
                .iter()
                .any(|head| read.iter().any(|atom| unifiable(head, atom)));
            if clash {
                return Err(RuleError(format!(
                    "rule {}: negates a predicate the same file concludes (not stratifiable)",
                    rule.index + 1
                )));
            }
        }
    }

    let groups = order(&forward, &backward);
    let mut read = FxHashSet::default();
    for rule in forward.iter().chain(backward.values().flatten()) {
        reads(
            &rule.body,
            &FxHashMap::default(),
            &mut FxHashSet::default(),
            &mut read,
        );
    }
    let predicates = read
        .iter()
        .map(|atom| atom[1])
        .collect::<Option<FxHashSet<Id>>>();
    let stable = backward
        .keys()
        .copied()
        .filter(|predicate| {
            let mut read = FxHashSet::default();
            let mut seen = FxHashSet::default();
            seen.insert(*predicate);
            for rule in &backward[predicate] {
                reads(&rule.body, &backward, &mut seen, &mut read);
            }
            !heads
                .iter()
                .any(|head| read.iter().any(|atom| unifiable(head, atom)))
        })
        .collect();
    Ok(RuleSet {
        rules: forward,
        backward,
        axioms,
        maintainable,
        groups,
        stable,
        predicates,
    })
}

/// A plain `xsd:string` literal, as the string builtins produce.
pub fn string_literal(value: String) -> Term {
    Term::Literal(RdfLiteral::new_simple_literal(value))
}

/// An `xsd:integer` literal, as `list:length` produces.
pub fn integer_literal(value: usize) -> Term {
    Term::Literal(RdfLiteral::from(i64::try_from(value).unwrap_or(i64::MAX)))
}

#[allow(dead_code)]
pub fn iri(value: &str) -> Term {
    Term::NamedNode(NamedNode::new_unchecked(value))
}
