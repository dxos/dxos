//
// Copyright 2026 DXOS.org
//

//! Semi-naive evaluation of one stratum, and its DRed maintenance under a change of premises.

use rustc_hash::FxHashSet;

use crate::facts::{Before, Dict, Facts, Id, Pattern, Triple, TripleSet, Union};
use crate::rules::{Atom, Literal, Rule, RuleSet, Slot, string_literal};

type Binding = Vec<Option<Id>>;

fn resolve(slot: &Slot, binding: &Binding) -> Option<Id> {
    match slot {
        Slot::Const(id) => Some(*id),
        Slot::Var(var) => binding[*var],
    }
}

fn pattern(atom: &Atom, binding: &Binding) -> Pattern {
    [
        resolve(&atom.0[0], binding),
        resolve(&atom.0[1], binding),
        resolve(&atom.0[2], binding),
    ]
}

/// Binds the atom's unbound variables to `triple`, pushing what it bound onto `trail`. False (and
/// nothing left bound) if the triple does not fit — a constant or an already-bound value differs.
fn unify(atom: &Atom, triple: &Triple, binding: &mut Binding, trail: &mut Vec<usize>) -> bool {
    let mark = trail.len();
    for (slot, value) in atom.0.iter().zip(triple) {
        let fits = match slot {
            Slot::Const(id) => id == value,
            Slot::Var(var) => match binding[*var] {
                Some(bound) => bound == *value,
                None => {
                    binding[*var] = Some(*value);
                    trail.push(*var);
                    true
                }
            },
        };
        if !fits {
            undo(binding, trail, mark);
            return false;
        }
    }
    true
}

fn undo(binding: &mut Binding, trail: &mut Vec<usize>, mark: usize) {
    for var in trail.drain(mark..) {
        binding[var] = None;
    }
}

/// How narrow a scan the atom is under the current binding. A subject or object bound by the join
/// is the narrowest key there is; a constant there is usually a class or a well-known IRI (`rdf:type
/// deus:Plugin` names hundreds of facts), and a constant predicate narrows least.
fn selectivity(atom: &Atom, binding: &Binding) -> usize {
    atom.0
        .iter()
        .enumerate()
        .map(|(position, slot)| match (slot, position) {
            (Slot::Var(var), 0 | 2) if binding[*var].is_some() => 4,
            (Slot::Const(_), 0 | 2) => 2,
            (Slot::Var(var), _) if binding[*var].is_some() => 2,
            (Slot::Const(_), _) => 1,
            _ => 0,
        })
        .sum()
}

struct Solver<'a> {
    dict: &'a Dict,
    view: &'a dyn Facts,
    stop: bool,
}

impl Solver<'_> {
    /// The next literal to evaluate: anything filter-like whose inputs are bound, else the positive
    /// atom with the most bound positions.
    fn pick(literals: &[&Literal], done: &[bool], binding: &Binding) -> Option<usize> {
        let mut best: Option<(usize, usize)> = None;
        for (index, literal) in literals.iter().enumerate() {
            if done[index] {
                continue;
            }
            match literal {
                Literal::Pos(atom) => {
                    let score = selectivity(atom, binding);
                    if best.is_none_or(|(_, best)| score > best) {
                        best = Some((index, score));
                    }
                }
                other => {
                    if other.inputs().iter().all(|var| binding[*var].is_some()) {
                        return Some(index);
                    }
                }
            }
        }
        best.map(|(index, _)| index)
    }

    fn solve(
        &mut self,
        literals: &[&Literal],
        done: &mut Vec<bool>,
        binding: &mut Binding,
        trail: &mut Vec<usize>,
        emit: &mut dyn FnMut(&Binding) -> bool,
    ) {
        if self.stop {
            return;
        }
        let Some(index) = Self::pick(literals, done, binding) else {
            if done.iter().all(|done| *done) && !emit(binding) {
                self.stop = true;
            }
            return;
        };
        done[index] = true;
        match literals[index] {
            Literal::Pos(atom) => {
                let query = pattern(atom, binding);
                let mut matches = Vec::new();
                self.view.scan(&query, &mut |triple| matches.push(triple));
                for triple in matches {
                    if self.stop {
                        break;
                    }
                    let mark = trail.len();
                    if unify(atom, &triple, binding, trail) {
                        self.solve(literals, done, binding, trail, emit);
                        undo(binding, trail, mark);
                    }
                }
            }
            Literal::Neg { atoms, .. } => {
                if !self.exists(atoms, binding, trail) {
                    self.solve(literals, done, binding, trail, emit);
                }
            }
            Literal::Matches { arg, regex, negate } => {
                let value = resolve(arg, binding).map(|id| self.dict.text(id));
                if value.is_some_and(|value| regex.is_match(&value) != *negate) {
                    self.solve(literals, done, binding, trail, emit);
                }
            }
            Literal::Concat { parts, out } => {
                let text: String = parts
                    .iter()
                    .filter_map(|part| resolve(part, binding))
                    .map(|id| self.dict.text(id))
                    .collect();
                let id = self.dict.intern(&string_literal(text));
                let mark = trail.len();
                let fits = match out {
                    Slot::Const(value) => *value == id,
                    Slot::Var(var) => match binding[*var] {
                        Some(bound) => bound == id,
                        None => {
                            binding[*var] = Some(id);
                            trail.push(*var);
                            true
                        }
                    },
                };
                if fits {
                    self.solve(literals, done, binding, trail, emit);
                }
                undo(binding, trail, mark);
            }
        }
        done[index] = false;
    }

    fn exists(&mut self, atoms: &[Atom], binding: &mut Binding, trail: &mut Vec<usize>) -> bool {
        let literals: Vec<Literal> = atoms.iter().cloned().map(Literal::Pos).collect();
        let refs: Vec<&Literal> = literals.iter().collect();
        let mut done = vec![false; refs.len()];
        let mut inner = Solver {
            dict: self.dict,
            view: self.view,
            stop: false,
        };
        let mut found = false;
        let mark = trail.len();
        inner.solve(&refs, &mut done, binding, trail, &mut |_| {
            found = true;
            false
        });
        undo(binding, trail, mark);
        found
    }
}

fn heads(rule: &Rule, binding: &Binding, out: &mut Vec<Triple>) {
    for atom in &rule.head {
        let [Some(s), Some(p), Some(o)] = pattern(atom, binding) else {
            continue;
        };
        out.push([s, p, o]);
    }
}

/// How a rule evaluation is started.
enum Seed<'a> {
    /// Every literal is evaluated against the view.
    None,
    /// The positive literal at `index` is bound to a delta triple and skipped.
    Pos(usize, &'a Triple),
    /// A delta triple matching one atom of the negation at `index` binds that negation's outer
    /// variables; the negation itself is still evaluated.
    Neg(usize, usize, &'a Triple),
    /// A head atom is unified with a fact, to ask whether that fact still has a derivation.
    Head(usize, &'a Triple),
}

/// Evaluates `rule` from `seed`; `emit` returns false to stop at the first solution.
fn run(
    rule: &Rule,
    seed: Seed<'_>,
    view: &dyn Facts,
    dict: &Dict,
    emit: &mut dyn FnMut(&Binding) -> bool,
) {
    let mut binding: Binding = vec![None; rule.vars];
    let mut trail = Vec::new();
    let literals: Vec<&Literal> = rule.body.iter().collect();
    let mut done = vec![false; literals.len()];
    match seed {
        Seed::None => {}
        Seed::Pos(index, triple) => {
            let Literal::Pos(atom) = literals[index] else {
                return;
            };
            if !unify(atom, triple, &mut binding, &mut trail) {
                return;
            }
            done[index] = true;
        }
        Seed::Neg(index, atom_index, triple) => {
            let Literal::Neg { atoms, outer } = literals[index] else {
                return;
            };
            let mut local = vec![None; rule.vars];
            if !unify(&atoms[atom_index], triple, &mut local, &mut Vec::new()) {
                return;
            }
            for var in outer {
                binding[*var] = local[*var];
            }
        }
        Seed::Head(index, triple) => {
            if !unify(&rule.head[index], triple, &mut binding, &mut trail) {
                return;
            }
        }
    }
    let mut solver = Solver {
        dict,
        view,
        stop: false,
    };
    solver.solve(&literals, &mut done, &mut binding, &mut trail, emit);
}

/// Everything derivable in one step from `delta` triples: each positive literal a triple fits seeds
/// an evaluation of the rest of its rule against `view`.
fn step(rules: &RuleSet, delta: &[Triple], view: &dyn Facts, dict: &Dict, out: &mut Vec<Triple>) {
    for triple in delta {
        for rule in &rules.rules {
            for (index, literal) in rule.body.iter().enumerate() {
                if let Literal::Pos(atom) = literal
                    && crate::facts::matches(&pattern(atom, &vec![None; rule.vars]), triple)
                {
                    run(rule, Seed::Pos(index, triple), view, dict, &mut |binding| {
                        heads(rule, binding, out);
                        true
                    });
                }
            }
        }
    }
}

/// Conclusions whose negations a delta triple can flip, evaluated against `view`.
fn negation_step(
    rules: &RuleSet,
    delta: &[Triple],
    view: &dyn Facts,
    dict: &Dict,
    out: &mut Vec<Triple>,
) {
    for triple in delta {
        for rule in &rules.rules {
            for (index, literal) in rule.body.iter().enumerate() {
                if let Literal::Neg { atoms, .. } = literal {
                    for (atom_index, atom) in atoms.iter().enumerate() {
                        if crate::facts::matches(&pattern(atom, &vec![None; rule.vars]), triple) {
                            run(
                                rule,
                                Seed::Neg(index, atom_index, triple),
                                view,
                                dict,
                                &mut |binding| {
                                    heads(rule, binding, out);
                                    true
                                },
                            );
                        }
                    }
                }
            }
        }
    }
}

fn has_negation(rules: &RuleSet) -> bool {
    rules.rules.iter().any(|rule| {
        rule.body
            .iter()
            .any(|literal| matches!(literal, Literal::Neg { .. }))
    })
}

/// Inserts `frontier` and everything it entails into `derived`, to a fixpoint. Returns what was new.
fn saturate(
    rules: &RuleSet,
    premises: &dyn Facts,
    derived: &mut TripleSet,
    mut frontier: Vec<Triple>,
    dict: &Dict,
) -> Vec<Triple> {
    let mut added = Vec::new();
    frontier.retain(|triple| derived.insert(*triple));
    added.extend_from_slice(&frontier);
    while !frontier.is_empty() {
        let mut next = Vec::new();
        {
            let view = Union {
                premises,
                derived,
                excluded: None,
            };
            step(rules, &frontier, &view, dict, &mut next);
        }
        next.retain(|triple| derived.insert(*triple));
        added.extend_from_slice(&next);
        frontier = next;
    }
    added
}

/// The stratum's materialisation over `premises`, computed from nothing.
pub fn full(rules: &RuleSet, premises: &dyn Facts, dict: &Dict) -> TripleSet {
    let mut derived = TripleSet::default();
    let mut first = Vec::new();
    {
        let empty = TripleSet::default();
        let view = Union {
            premises,
            derived: &empty,
            excluded: None,
        };
        for rule in &rules.rules {
            run(rule, Seed::None, &view, dict, &mut |binding| {
                heads(rule, binding, &mut first);
                true
            });
        }
    }
    saturate(rules, premises, &mut derived, first, dict);
    derived
}

#[derive(Default, Debug)]
pub struct Change {
    pub added: Vec<Triple>,
    pub removed: Vec<Triple>,
}

/// DRed: updates `derived` (the materialisation over the premises *before* the change) to the
/// materialisation over `premises`, which `plus`/`minus` describe relative to before.
pub fn maintain(
    rules: &RuleSet,
    premises: &dyn Facts,
    plus: &TripleSet,
    minus: &TripleSet,
    derived: &mut TripleSet,
    dict: &Dict,
) -> Change {
    let negates = has_negation(rules);
    let plus_list: Vec<Triple> = plus.iter().copied().collect();
    let minus_list: Vec<Triple> = minus.iter().copied().collect();

    // 1. Overdelete: everything with a derivation through a removed premise (or through a premise
    //    whose arrival falsifies a negation), against the state before the change.
    let mut deleted = TripleSet::default();
    {
        let before = Before {
            after: premises,
            plus,
            minus,
        };
        let view = Union {
            premises: &before,
            derived,
            excluded: None,
        };
        let mut candidates = Vec::new();
        step(rules, &minus_list, &view, dict, &mut candidates);
        if negates {
            negation_step(rules, &plus_list, &view, dict, &mut candidates);
        }
        let mut frontier: Vec<Triple> = candidates
            .into_iter()
            .filter(|triple| derived.contains(triple) && deleted.insert(*triple))
            .collect();
        while !frontier.is_empty() {
            let mut next = Vec::new();
            step(rules, &frontier, &view, dict, &mut next);
            frontier = next
                .into_iter()
                .filter(|triple| derived.contains(triple) && deleted.insert(*triple))
                .collect();
        }
    }

    // 2. Rederive: an overdeleted fact survives if it still has a one-step derivation from what is left.
    let mut rederived = Vec::new();
    {
        let view = Union {
            premises,
            derived,
            excluded: Some(&deleted),
        };
        for triple in deleted.iter() {
            let mut found = false;
            'rules: for rule in &rules.rules {
                for index in 0..rule.head.len() {
                    run(rule, Seed::Head(index, triple), &view, dict, &mut |_| {
                        found = true;
                        false
                    });
                    if found {
                        break 'rules;
                    }
                }
            }
            if found {
                rederived.push(*triple);
            }
        }
    }

    // 3. Insert: the new premises, the rederived facts, and what a vanished negated fact unblocks.
    for triple in deleted.iter() {
        derived.remove(triple);
    }
    let mut frontier = Vec::new();
    {
        let view = Union {
            premises,
            derived,
            excluded: None,
        };
        step(rules, &plus_list, &view, dict, &mut frontier);
        if negates {
            negation_step(rules, &minus_list, &view, dict, &mut frontier);
        }
    }
    frontier.extend(rederived);
    let inserted: FxHashSet<Triple> = saturate(rules, premises, derived, frontier, dict)
        .into_iter()
        .collect();

    Change {
        added: inserted
            .iter()
            .filter(|triple| !deleted.contains(triple))
            .copied()
            .collect(),
        removed: deleted
            .iter()
            .filter(|triple| !inserted.contains(*triple))
            .copied()
            .collect(),
    }
}
