//
// Copyright 2026 DXOS.org
//

//! Canonical Core S-expressions: the reader and printer, matching `src/kernel/sexp.ts`.

use std::rc::Rc;

use crate::text::{from_units, string, to_int32, Text};

#[derive(Clone, Debug)]
pub enum Sexp {
    Int(i32),
    Sym(Rc<str>),
    Str(Text),
    List(Rc<Vec<Sexp>>),
}

impl Sexp {
    pub fn list(items: Vec<Sexp>) -> Sexp {
        Sexp::List(Rc::new(items))
    }

    pub fn sym(name: &str) -> Sexp {
        Sexp::Sym(Rc::from(name))
    }
}

fn is_space(unit: u16) -> bool {
    matches!(unit, 32 | 10 | 9 | 13)
}

/// Parses every top-level form.
pub fn read_all(text: &[u16]) -> Result<Vec<Sexp>, String> {
    let mut forms = Vec::new();
    let mut stack: Vec<Vec<Sexp>> = Vec::new();
    let mut pos = 0;
    let len = text.len();
    let push =
        |stack: &mut Vec<Vec<Sexp>>, forms: &mut Vec<Sexp>, value: Sexp| match stack.last_mut() {
            Some(top) => top.push(value),
            None => forms.push(value),
        };
    while pos < len {
        let code = text[pos];
        if is_space(code) {
            pos += 1;
        } else if code == 59 {
            while pos < len && text[pos] != 10 {
                pos += 1;
            }
        } else if code == 40 {
            stack.push(Vec::new());
            pos += 1;
        } else if code == 41 {
            let list = stack
                .pop()
                .ok_or_else(|| format!("sexp: unbalanced ')' at {pos}"))?;
            push(&mut stack, &mut forms, Sexp::list(list));
            pos += 1;
        } else if code == 34 {
            pos += 1;
            let mut out: Vec<u16> = Vec::new();
            loop {
                if pos >= len {
                    return Err("sexp: unterminated string".into());
                }
                let unit = text[pos];
                if unit == 34 {
                    pos += 1;
                    break;
                }
                if unit == 92 {
                    let escape = text.get(pos + 1).copied();
                    pos += 2;
                    match escape {
                        Some(110) => out.push(10),
                        Some(116) => out.push(9),
                        Some(114) => out.push(13),
                        Some(117) => {
                            let end = (pos + 4).min(len);
                            let hex = string(&text[pos.min(len)..end]);
                            // `parseInt` of a malformed escape is NaN, which `fromCharCode` makes 0.
                            out.push(u16::from_str_radix(&hex, 16).unwrap_or(0));
                            pos += 4;
                        }
                        Some(other) => out.push(other),
                        None => {}
                    }
                } else {
                    out.push(unit);
                    pos += 1;
                }
            }
            push(&mut stack, &mut forms, Sexp::Str(from_units(out)));
        } else {
            let start = pos;
            while pos < len && !(is_space(text[pos]) || text[pos] == 40 || text[pos] == 41) {
                pos += 1;
            }
            let atom = &text[start..pos];
            let digits = if atom.first() == Some(&45) {
                &atom[1..]
            } else {
                atom
            };
            let value = if !digits.is_empty() && digits.iter().all(|unit| (48..=57).contains(unit))
            {
                Sexp::Int(to_int32(string(atom).parse::<f64>().unwrap_or(0.0)))
            } else {
                Sexp::Sym(Rc::from(string(atom)))
            };
            push(&mut stack, &mut forms, value);
        }
    }
    if !stack.is_empty() {
        return Err("sexp: unbalanced (".into());
    }
    Ok(forms)
}

/// Prints a form canonically.
pub fn print(form: &Sexp) -> String {
    let mut out = String::new();
    write(form, &mut out);
    out
}

fn write(form: &Sexp, out: &mut String) {
    match form {
        Sexp::Int(value) => out.push_str(&value.to_string()),
        Sexp::Sym(name) => out.push_str(name),
        Sexp::Str(value) => out.push_str(&quote_units(value)),
        Sexp::List(items) => {
            out.push('(');
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push(' ');
                }
                write(item, out);
            }
            out.push(')');
        }
    }
}

/// A string literal escaped canonically; surrogate pairs pass through whole.
fn quote_units(value: &[u16]) -> String {
    let mut out = String::from("\"");
    let mut plain: Vec<u16> = Vec::new();
    let flush = |plain: &mut Vec<u16>, out: &mut String| {
        out.push_str(&string(plain));
        plain.clear();
    };
    for unit in value {
        let escaped = match *unit {
            34 => Some("\\\"".to_string()),
            92 => Some("\\\\".to_string()),
            10 => Some("\\n".to_string()),
            9 => Some("\\t".to_string()),
            13 => Some("\\r".to_string()),
            code if code < 32 || code == 127 => Some(format!("\\u{code:04x}")),
            _ => None,
        };
        match escaped {
            Some(text) => {
                flush(&mut plain, &mut out);
                out.push_str(&text);
            }
            None => plain.push(*unit),
        }
    }
    flush(&mut plain, &mut out);
    out.push('"');
    out
}
