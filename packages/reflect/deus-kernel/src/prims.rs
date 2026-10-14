//
// Copyright 2026 DXOS.org
//

//! The primitive table, matching `src/kernel/prims.ts` name for name and result for result.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use sha2::{Digest, Sha256};

use crate::machine::{Machine, TermId};
use crate::sexp::{print, read_all, Sexp};
use crate::text::{self, from_units, string, Text};
use crate::value::*;

fn int(machine: &Machine, value: &Value) -> Result<i32, Fail> {
    match value {
        Value::Int(x) => Ok(*x),
        other => defect(format!("expected Int, got {}", machine.show(other))),
    }
}

fn txt(machine: &Machine, value: &Value) -> Result<Text, Fail> {
    match value {
        Value::Text(x) => Ok(x.clone()),
        other => defect(format!("expected Text, got {}", machine.show(other))),
    }
}

fn texts(machine: &Machine, list: &Value) -> Result<Vec<Text>, Fail> {
    list_to(list)
        .iter()
        .map(|item| txt(machine, item))
        .collect()
}

fn join(parts: &[Text], separator: &[u16]) -> Text {
    let mut out: Vec<u16> = Vec::new();
    for (index, part) in parts.iter().enumerate() {
        if index > 0 {
            out.extend_from_slice(separator);
        }
        out.extend_from_slice(part);
    }
    from_units(out)
}

fn is_nil(value: &Value) -> bool {
    matches!(value, Value::Con(con) if con.ty == LIST && con.tag == 0 && con.fields.is_empty())
}

fn append(a: &Value, b: &Value) -> Value {
    if let (Value::Text(x), Value::Text(y)) = (a, b) {
        let mut out = x.to_vec();
        out.extend_from_slice(y);
        return Value::Text(from_units(out));
    }
    if is_nil(b) {
        return a.clone();
    }
    let mut out = b.clone();
    for item in list_to(a).into_iter().rev() {
        out = con(LIST, 1, smallvec::smallvec![item, out]);
    }
    out
}

fn bool_of(value: bool) -> Result<Value, Fail> {
    Ok(Value::Bool(value))
}

fn ordered(machine: &Machine, a: &Value, b: &Value, test: fn(i32) -> bool) -> Result<Value, Fail> {
    let _ = machine;
    match (a, b) {
        (Value::Int(x), Value::Int(y)) => bool_of(test(if x < y {
            -1
        } else if x > y {
            1
        } else {
            0
        })),
        _ => bool_of(test(compare(a, b)?)),
    }
}

fn key(machine: &Machine, value: &Value) -> Result<Key, Fail> {
    match value {
        Value::Int(x) => Ok(Key::Int(*x)),
        Value::Text(x) => Ok(Key::Text(x.clone())),
        other => defect(format!(
            "hash map keys are Text or Int, got {}",
            machine.show(other)
        )),
    }
}

fn key_value(key: Key) -> Value {
    match key {
        Key::Int(x) => Value::Int(x),
        Key::Text(x) => Value::Text(x),
    }
}

fn table(machine: &Machine, value: &Value, mutable: bool) -> Result<Rc<RefCell<Table>>, Fail> {
    match value {
        Value::Table(table) if table.borrow().mutable == mutable => Ok(table.clone()),
        other => defect(format!(
            "expected {}, got {}",
            if mutable { "MutMap" } else { "Dict" },
            machine.show(other)
        )),
    }
}

/// The array in `value` and `index` checked against its bounds.
fn array(
    machine: &Machine,
    value: &Value,
    index: &Value,
    name: &str,
) -> Result<(Rc<RefCell<Vec<Value>>>, usize), Fail> {
    let i = int(machine, index)?;
    match value {
        Value::Array(items) => {
            let len = items.borrow().len();
            if i < 0 || i as usize >= len {
                defect(format!("{name}: index {i} out of bounds 0 .. {len}"))
            } else {
                Ok((items.clone(), i as usize))
            }
        }
        other => defect(format!("expected Array, got {}", machine.show(other))),
    }
}

fn optional(value: Option<Value>) -> Value {
    value.map_or_else(none, some)
}

/// A data value back as Core, so the DEUS printer can show it with names; functions are opaque.
fn quote_value(machine: &Machine, value: &Value) -> Sexp {
    match value {
        Value::Int(x) => Sexp::list(vec![Sexp::sym("int"), Sexp::Int(*x)]),
        Value::Text(x) => Sexp::list(vec![Sexp::sym("text"), Sexp::Str(x.clone())]),
        Value::Bool(x) => Sexp::list(vec![
            Sexp::sym("con"),
            Sexp::Str(text::text("#Bool")),
            Sexp::Int(*x as i32),
            Sexp::Int(0),
        ]),
        Value::Con(con) => {
            let head = Sexp::list(vec![
                Sexp::sym("con"),
                Sexp::Str(text::text(machine.symbols.name(con.ty))),
                Sexp::Int(con.tag as i32),
                Sexp::Int(con.fields.len() as i32),
            ]);
            if con.fields.is_empty() {
                head
            } else {
                let mut items = vec![Sexp::sym("app"), head];
                items.extend(con.fields.iter().map(|field| quote_value(machine, field)));
                Sexp::list(items)
            }
        }
        _ => Sexp::list(vec![Sexp::sym("prim"), Sexp::Str(text::text("<function>"))]),
    }
}

fn code_run(machine: &mut Machine, args: &[Value]) -> Result<TermId, Fail> {
    let hash = string(&txt(machine, &args[0])?);
    Ok(machine.run_ref(&hash))
}

macro_rules! prims {
    ($($name:literal, $arity:literal, |$machine:ident, $args:ident| $body:expr;)*) => {
        pub fn create() -> HashMap<&'static str, Rc<Prim>> {
            let mut table: HashMap<&'static str, Rc<Prim>> = HashMap::new();
            $({
                #[allow(unused_variables)]
                fn prim($machine: &mut Machine, $args: &[Value]) -> Result<Value, Fail> {
                    $body
                }
                table.insert($name, Rc::new(Prim { name: $name, arity: $arity, func: prim, control: None }));
            })*
            fn never(_machine: &mut Machine, _args: &[Value]) -> Result<Value, Fail> {
                Ok(nil())
            }
            table.insert("Code.run", Rc::new(Prim { name: "Code.run", arity: 1, func: never, control: Some(code_run) }));
            table
        }
    };
}

prims! {
    "Int.add", 2, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_add(int(m, &a[1])?)));
    "Int.sub", 2, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_sub(int(m, &a[1])?)));
    "Int.mul", 2, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_mul(int(m, &a[1])?)));
    "Int.div", 2, |m, a| {
        let (x, y) = (int(m, &a[0])?, int(m, &a[1])?);
        if y == 0 { return defect("division by zero"); }
        Ok(Value::Int(x.wrapping_div(y)))
    };
    "Int.mod", 2, |m, a| {
        let (x, y) = (int(m, &a[0])?, int(m, &a[1])?);
        if y == 0 { return defect("division by zero"); }
        Ok(Value::Int(x.wrapping_rem(y)))
    };
    "Int.neg", 1, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_neg()));
    "Int.and", 2, |m, a| Ok(Value::Int(int(m, &a[0])? & int(m, &a[1])?));
    "Int.or", 2, |m, a| Ok(Value::Int(int(m, &a[0])? | int(m, &a[1])?));
    "Int.xor", 2, |m, a| Ok(Value::Int(int(m, &a[0])? ^ int(m, &a[1])?));
    "Int.shl", 2, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_shl(int(m, &a[1])? as u32)));
    "Int.shr", 2, |m, a| Ok(Value::Int(int(m, &a[0])?.wrapping_shr(int(m, &a[1])? as u32)));
    "Int.ushr", 2, |m, a| Ok(Value::Int(((int(m, &a[0])? as u32).wrapping_shr(int(m, &a[1])? as u32)) as i32));
    "Int.toText", 1, |m, a| Ok(Value::Text(text::text(&int(m, &a[0])?.to_string())));
    "Int.fromText", 1, |m, a| Ok(optional(text::parse_int(&txt(m, &a[0])?).map(Value::Int)));

    "eq", 2, |m, a| bool_of(equal(&a[0], &a[1]));
    "neq", 2, |m, a| bool_of(!equal(&a[0], &a[1]));
    "compare", 2, |m, a| Ok(Value::Int(compare(&a[0], &a[1])?));
    "lt", 2, |m, a| ordered(m, &a[0], &a[1], |c| c < 0);
    "le", 2, |m, a| ordered(m, &a[0], &a[1], |c| c <= 0);
    "gt", 2, |m, a| ordered(m, &a[0], &a[1], |c| c > 0);
    "ge", 2, |m, a| ordered(m, &a[0], &a[1], |c| c >= 0);
    "append", 2, |m, a| Ok(append(&a[0], &a[1]));
    "implies", 2, |m, a| bool_of(!matches!(a[0], Value::Bool(true)) || matches!(a[1], Value::Bool(true)));

    "Text.length", 1, |m, a| Ok(Value::Int(txt(m, &a[0])?.len() as i32));
    "Text.code", 2, |m, a| {
        let (value, index) = (txt(m, &a[0])?, int(m, &a[1])?);
        Ok(Value::Int(if index >= 0 && (index as usize) < value.len() { value[index as usize] as i32 } else { -1 }))
    };
    "Text.slice", 3, |m, a| Ok(Value::Text(text::slice(&txt(m, &a[0])?, int(m, &a[1])?, int(m, &a[2])?)));
    "Text.fromCode", 1, |m, a| Ok(Value::Text(from_units(vec![int(m, &a[0])? as u16])));
    "Text.concat", 1, |m, a| Ok(Value::Text(join(&texts(m, &a[0])?, &[])));
    "Text.join", 2, |m, a| {
        let separator = txt(m, &a[0])?;
        Ok(Value::Text(join(&texts(m, &a[1])?, &separator)))
    };
    "Text.split", 2, |m, a| {
        let (value, separator) = (txt(m, &a[0])?, txt(m, &a[1])?);
        Ok(list_from(text::split(&value, &separator).into_iter().map(Value::Text).collect()))
    };
    "Text.indexOf", 3, |m, a| Ok(Value::Int(text::index_of(&txt(m, &a[0])?, &txt(m, &a[1])?, int(m, &a[2])?)));
    "Text.trim", 1, |m, a| Ok(Value::Text(text::trim(&txt(m, &a[0])?)));
    "Text.sha256", 1, |m, a| {
        let digest = Sha256::digest(string(&txt(m, &a[0])?).as_bytes());
        Ok(Value::Text(text::text(&digest.iter().map(|byte| format!("{byte:02x}")).collect::<String>())))
    };
    "Text.fromCodes", 1, |m, a| {
        // Code units, except that a code above U+FFFF becomes its surrogate pair (D76).
        let mut units: Vec<u16> = Vec::new();
        for code in list_to(&a[0]).iter() {
            let value = int(m, code)?;
            if !(0..=0x10ffff).contains(&value) {
                return defect(format!("Text.fromCodes: {value} is not a code point"));
            }
            if value > 0xffff {
                let offset = (value - 0x10000) as u32;
                units.push(0xd800 + (offset >> 10) as u16);
                units.push(0xdc00 + (offset & 0x3ff) as u16);
            } else {
                units.push(value as u16);
            }
        }
        Ok(Value::Text(from_units(units)))
    };
    "Text.utf8", 1, |m, a| Ok(list_from(string(&txt(m, &a[0])?).bytes().map(|byte| Value::Int(byte as i32)).collect()));

    "Ref.new", 1, |m, a| Ok(Value::Cell(Rc::new(RefCell::new(a[0].clone()))));
    "Ref.get", 1, |m, a| match &a[0] {
        Value::Cell(cell) => Ok(cell.borrow().clone()),
        other => defect(format!("expected Ref, got {}", m.show(other))),
    };
    "Ref.set", 2, |m, a| match &a[0] {
        Value::Cell(cell) => {
            *cell.borrow_mut() = a[1].clone();
            Ok(unit())
        }
        other => defect(format!("expected Ref, got {}", m.show(other))),
    };

    "Array.make", 2, |m, a| {
        let n = int(m, &a[0])?;
        if n < 0 {
            return defect(format!("Array.make: negative length {n}"));
        }
        Ok(Value::Array(Rc::new(RefCell::new(vec![a[1].clone(); n as usize]))))
    };
    "Array.length", 1, |m, a| match &a[0] {
        Value::Array(items) => Ok(Value::Int(items.borrow().len() as i32)),
        other => defect(format!("expected Array, got {}", m.show(other))),
    };
    "Array.get", 2, |m, a| {
        let (items, i) = array(m, &a[0], &a[1], "Array.get")?;
        let value = items.borrow()[i].clone();
        Ok(value)
    };
    "Array.set", 3, |m, a| {
        let (items, i) = array(m, &a[0], &a[1], "Array.set")?;
        items.borrow_mut()[i] = a[2].clone();
        Ok(unit())
    };

    "Dict.fromList", 1, |m, a| {
        let mut out = Table::new(false);
        for item in list_to(&a[0]) {
            if let Value::Con(entry) = &item {
                if entry.fields.len() == 2 {
                    out.set(key(m, &entry.fields[0])?, entry.fields[1].clone());
                }
            }
        }
        Ok(Value::Table(Rc::new(RefCell::new(out))))
    };
    "Dict.lookup", 2, |m, a| {
        let k = key(m, &a[0])?;
        Ok(optional(table(m, &a[1], false)?.borrow().get(&k).cloned()))
    };
    "Dict.contains", 2, |m, a| {
        let k = key(m, &a[0])?;
        bool_of(table(m, &a[1], false)?.borrow().has(&k))
    };
    "Dict.size", 1, |m, a| Ok(Value::Int(table(m, &a[0], false)?.borrow().size() as i32));
    "Dict.keys", 1, |m, a| Ok(list_from(table(m, &a[0], false)?.borrow().keys().into_iter().map(key_value).collect()));

    "MutMap.new", 1, |m, a| Ok(Value::Table(Rc::new(RefCell::new(Table::new(true)))));
    "MutMap.get", 2, |m, a| {
        let k = key(m, &a[1])?;
        Ok(optional(table(m, &a[0], true)?.borrow().get(&k).cloned()))
    };
    "MutMap.has", 2, |m, a| {
        let k = key(m, &a[1])?;
        bool_of(table(m, &a[0], true)?.borrow().has(&k))
    };
    "MutMap.set", 3, |m, a| {
        let target = table(m, &a[0], true)?;
        let k = key(m, &a[1])?;
        target.borrow_mut().set(k, a[2].clone());
        Ok(unit())
    };
    "MutMap.delete", 2, |m, a| {
        let target = table(m, &a[0], true)?;
        let k = key(m, &a[1])?;
        target.borrow_mut().delete(&k);
        Ok(unit())
    };
    "MutMap.size", 1, |m, a| Ok(Value::Int(table(m, &a[0], true)?.borrow().size() as i32));
    "MutMap.keys", 1, |m, a| Ok(list_from(table(m, &a[0], true)?.borrow().keys().into_iter().map(key_value).collect()));

    "show", 1, |m, a| Ok(Value::Text(text::text(&m.show(&a[0]))));
    "trace", 2, |m, a| {
        let label = string(&txt(m, &a[0])?);
        let shown = m.show(&a[1]);
        m.host.eprint(&format!("trace {label}: {shown}\n"));
        Ok(a[1].clone())
    };
    "defect", 1, |m, a| defect(string(&txt(m, &a[0])?));

    "Code.load", 1, |m, a| {
        let forms = read_all(&txt(m, &a[0])?).map_err(|err| Fail::Panic(format!("Code.load: {err}")))?;
        m.load(&forms)?;
        Ok(unit())
    };
    "Code.quote", 1, |m, a| Ok(Value::Text(text::text(&print(&quote_value(m, &a[0])))));
    "Code.has", 1, |m, a| bool_of(m.has(&string(&txt(m, &a[0])?)));
    "Code.steps", 1, |m, a| Ok(Value::Int(m.steps as i32));
    "Code.cost", 1, |m, a| Ok(Value::Int(m.measure(&a[0])? as i32));
    "Code.defectTrace", 1, |m, a| Ok(list_from(m.defect_trace.iter().map(|hash| Value::Text(text::text(hash))).collect()));
}
