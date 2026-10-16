//
// Copyright 2026 DXOS.org
//

//! Values as JSON, for embedders (a Cloudflare Worker, a browser): `Int` is a number, `Text` a
//! string, `Bool` a boolean, `Unit` null, a list an array, and any other constructor
//! `{"$": type, "tag": n, "fields": [...]}`. A DEUS function leaves as `{"$fn": n}`, a handle in the
//! embedding's [`Handles`] that comes back as the same function (`{"$fn": true}` where nothing keeps
//! handles); an embedder's function `{"$host": n}` comes in as one the program calls through the
//! `#Host` ability (see [`HOST`]). A user type crosses by its IRI when the image names it (`iris`: hash → IRI), and a builtin
//! (`#Option`) as `urn:deus:builtin:Option` (D68), so every identity an embedder sees is a URI.

use std::collections::HashMap;

use crate::text::{json, Text};
use crate::value::*;

/// The prefix of a builtin's IRI; the rest is its name without the `#`.
pub const BUILTIN: &str = "urn:deus:builtin:";

/// The IRI an embedder sees for a type or ability: the image's IRI, `urn:deus:builtin:<Name>` for a
/// builtin `#Name`, or the hash itself.
pub fn iri_of(hash: &str, iris: &HashMap<String, String>) -> String {
    match iris.get(hash) {
        Some(iri) => iri.clone(),
        None => match hash.strip_prefix('#') {
            Some(name) => format!("{BUILTIN}{name}"),
            None => hash.to_string(),
        },
    }
}

/// The identity an IRI from an embedder names; the inverse of [`iri_of`].
fn identity_of(name: &str, hashes: &HashMap<String, String>) -> String {
    match hashes.get(name) {
        Some(hash) => hash.clone(),
        None => match name.strip_prefix(BUILTIN) {
            Some(builtin) => format!("#{builtin}"),
            None => name.to_string(),
        },
    }
}

/// DEUS functions an embedder holds as `{"$fn": n}`: kept until it releases them, so a call can pass one
/// back or apply it (`deus_apply`).
#[derive(Default)]
pub struct Handles {
    values: HashMap<i32, Value>,
    next: i32,
}

impl Handles {
    /// Keeps `value` and returns its handle.
    pub fn keep(&mut self, value: Value) -> i32 {
        let handle = self.next;
        self.next = self.next.wrapping_add(1);
        self.values.insert(handle, value);
        handle
    }

    pub fn get(&self, handle: i32) -> Option<Value> {
        self.values.get(&handle).cloned()
    }

    pub fn release(&mut self, handle: i32) {
        self.values.remove(&handle);
    }

    /// Forgets every handle, when the functions' machine is replaced.
    pub fn clear(&mut self) {
        self.values.clear();
    }
}

/// Encodes a value; `symbols` names constructor types.
pub fn encode(value: &Value, symbols: &Symbols, iris: &HashMap<String, String>) -> String {
    encode_with(value, symbols, iris, None)
}

/// Encodes a value, keeping each function it holds in `handles`.
pub fn encode_with(
    value: &Value,
    symbols: &Symbols,
    iris: &HashMap<String, String>,
    mut handles: Option<&mut Handles>,
) -> String {
    let mut out = String::new();
    write(value, symbols, iris, &mut handles, &mut out);
    out
}

fn write(
    value: &Value,
    symbols: &Symbols,
    iris: &HashMap<String, String>,
    handles: &mut Option<&mut Handles>,
    out: &mut String,
) {
    match value {
        Value::Int(x) => out.push_str(&x.to_string()),
        Value::Bool(x) => out.push_str(if *x { "true" } else { "false" }),
        Value::Text(x) => out.push_str(&json(x)),
        Value::Con(con) if con.ty == UNIT => out.push_str("null"),
        Value::Con(con) if con.ty == LIST => {
            out.push('[');
            for (index, item) in list_to(value).iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write(item, symbols, iris, handles, out);
            }
            out.push(']');
        }
        Value::Con(con) => {
            let hash = symbols.name(con.ty);
            let name: Vec<u16> = iri_of(hash, iris).encode_utf16().collect();
            out.push_str(&format!(
                "{{\"$\":{},\"tag\":{},\"fields\":[",
                json(&name),
                con.tag
            ));
            for (index, field) in con.fields.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write(field, symbols, iris, handles, out);
            }
            out.push_str("]}");
        }
        // Only a function is kept as a handle; a `Ref` cell, a table or an array leaves as an opaque value.
        Value::Closure(_) | Value::Prim(_) | Value::ConFn(_) | Value::OpFn(_) | Value::Pap(_) => {
            match handles {
                Some(handles) => {
                    out.push_str(&format!("{{\"$fn\":{}}}", handles.keep(value.clone())))
                }
                None => out.push_str("{\"$fn\":true}"),
            }
        }
        _ => out.push_str("{\"$fn\":true}"),
    }
}

/// Parsed JSON, before it becomes a value.
enum Json {
    Null,
    Bool(bool),
    Number(f64),
    Text(Vec<u16>),
    Array(Vec<Json>),
    Object(Vec<(Vec<u16>, Json)>),
}

struct Reader<'a> {
    units: &'a [u16],
    pos: usize,
}

impl Reader<'_> {
    fn skip(&mut self) {
        while self.pos < self.units.len()
            && matches!(self.units[self.pos], 0x20 | 0x0a | 0x0d | 0x09)
        {
            self.pos += 1;
        }
    }

    fn peek(&mut self) -> Option<u16> {
        self.skip();
        self.units.get(self.pos).copied()
    }

    fn expect(&mut self, unit: u8) -> Result<(), String> {
        if self.peek() == Some(unit as u16) {
            self.pos += 1;
            Ok(())
        } else {
            Err(format!("json: expected '{}' at {}", unit as char, self.pos))
        }
    }

    fn literal(&mut self, word: &str, value: Json) -> Result<Json, String> {
        let units: Vec<u16> = word.encode_utf16().collect();
        if self.units[self.pos..].starts_with(&units) {
            self.pos += units.len();
            Ok(value)
        } else {
            Err(format!("json: unexpected token at {}", self.pos))
        }
    }

    fn string(&mut self) -> Result<Vec<u16>, String> {
        self.expect(b'"')?;
        let mut out = Vec::new();
        loop {
            let unit = *self
                .units
                .get(self.pos)
                .ok_or("json: unterminated string")?;
            self.pos += 1;
            match unit {
                0x22 => return Ok(out),
                0x5c => {
                    let escape = *self
                        .units
                        .get(self.pos)
                        .ok_or("json: unterminated escape")?;
                    self.pos += 1;
                    match escape {
                        0x6e => out.push(0x0a),
                        0x74 => out.push(0x09),
                        0x72 => out.push(0x0d),
                        0x62 => out.push(0x08),
                        0x66 => out.push(0x0c),
                        0x75 => {
                            let hex = String::from_utf16_lossy(
                                self.units
                                    .get(self.pos..self.pos + 4)
                                    .ok_or("json: short \\u escape")?,
                            );
                            out.push(
                                u16::from_str_radix(&hex, 16)
                                    .map_err(|_| "json: bad \\u escape")?,
                            );
                            self.pos += 4;
                        }
                        other => out.push(other),
                    }
                }
                other => out.push(other),
            }
        }
    }

    fn value(&mut self) -> Result<Json, String> {
        match self.peek().ok_or("json: unexpected end")? {
            0x6e => self.literal("null", Json::Null),
            0x74 => self.literal("true", Json::Bool(true)),
            0x66 => self.literal("false", Json::Bool(false)),
            0x22 => Ok(Json::Text(self.string()?)),
            0x5b => {
                self.pos += 1;
                let mut items = Vec::new();
                if self.peek() == Some(0x5d) {
                    self.pos += 1;
                    return Ok(Json::Array(items));
                }
                loop {
                    items.push(self.value()?);
                    match self.peek() {
                        Some(0x2c) => self.pos += 1,
                        Some(0x5d) => {
                            self.pos += 1;
                            return Ok(Json::Array(items));
                        }
                        _ => return Err(format!("json: expected ',' or ']' at {}", self.pos)),
                    }
                }
            }
            0x7b => {
                self.pos += 1;
                let mut fields = Vec::new();
                if self.peek() == Some(0x7d) {
                    self.pos += 1;
                    return Ok(Json::Object(fields));
                }
                loop {
                    self.skip();
                    let key = self.string()?;
                    self.expect(b':')?;
                    fields.push((key, self.value()?));
                    match self.peek() {
                        Some(0x2c) => self.pos += 1,
                        Some(0x7d) => {
                            self.pos += 1;
                            return Ok(Json::Object(fields));
                        }
                        _ => return Err(format!("json: expected ',' or '}}' at {}", self.pos)),
                    }
                }
            }
            _ => {
                let start = self.pos;
                while self.pos < self.units.len()
                    && matches!(
                        self.units[self.pos],
                        0x2d | 0x2b | 0x2e | 0x30..=0x39 | 0x65 | 0x45
                    )
                {
                    self.pos += 1;
                }
                String::from_utf16_lossy(&self.units[start..self.pos])
                    .parse::<f64>()
                    .map(Json::Number)
                    .map_err(|_| format!("json: bad number at {start}"))
            }
        }
    }
}

fn field<'a>(fields: &'a [(Vec<u16>, Json)], name: &str) -> Option<&'a Json> {
    let key: Vec<u16> = name.encode_utf16().collect();
    fields
        .iter()
        .find(|(k, _)| *k == key)
        .map(|(_, value)| value)
}

fn to_value(
    json: &Json,
    symbols: &mut Symbols,
    hashes: &HashMap<String, String>,
    handles: Option<&Handles>,
) -> Result<Value, String> {
    Ok(match json {
        Json::Null => unit(),
        Json::Bool(x) => Value::Bool(*x),
        Json::Number(x) => Value::Int(crate::text::to_int32(*x)),
        Json::Text(x) => Value::Text(Text::from(x.as_slice())),
        Json::Array(items) => list_from(
            items
                .iter()
                .map(|item| to_value(item, symbols, hashes, handles))
                .collect::<Result<_, _>>()?,
        ),
        Json::Object(fields) if field(fields, "$host").is_some() => {
            let Some(Json::Number(handle)) = field(fields, "$host") else {
                return Err("json: \"$host\" needs a number".into());
            };
            host_function(crate::text::to_int32(*handle), symbols)
        }
        Json::Object(fields) if field(fields, "$fn").is_some() => {
            let Some(Json::Number(handle)) = field(fields, "$fn") else {
                return Err("json: \"$fn\" needs a number".into());
            };
            let handle = crate::text::to_int32(*handle);
            handles
                .and_then(|handles| handles.get(handle))
                .ok_or_else(|| {
                    format!("json: no function {handle}: released, or made by another instance")
                })?
        }
        Json::Object(fields) => {
            let Some(Json::Text(name)) = field(fields, "$") else {
                return Err("json: an object needs \"$\" (its constructor's type)".into());
            };
            let tag = match field(fields, "tag") {
                Some(Json::Number(tag)) => *tag as u32,
                _ => 0,
            };
            let values = match field(fields, "fields") {
                Some(Json::Array(items)) => items
                    .iter()
                    .map(|item| to_value(item, symbols, hashes, handles))
                    .collect::<Result<Fields, _>>()?,
                _ => Fields::new(),
            };
            let name = String::from_utf16_lossy(name);
            let ty = symbols.intern(&identity_of(&name, hashes));
            if ty == BOOL {
                Value::Bool(tag == 1)
            } else {
                con(ty, tag, values)
            }
        }
    })
}

/// The ability through which a program calls a function its embedder passed in.
pub const HOST: &str = "#Host";

/// The embedder's function `handle`: applied to `x`, it performs operation 0 of `#Host` with `[handle, x]`,
/// which no program handles, so the run suspends and the embedder answers with the function's result.
fn host_function(handle: i32, symbols: &mut Symbols) -> Value {
    let call = Value::OpFn(std::rc::Rc::new(OpFn {
        ability: symbols.intern(HOST),
        index: 0,
        arity: 2,
    }));
    Value::Pap(std::rc::Rc::new(Pap {
        func: call,
        args: [Value::Int(handle)].into_iter().collect(),
    }))
}

/// Decodes a value.
pub fn decode(
    text: &str,
    symbols: &mut Symbols,
    iris: &HashMap<String, String>,
) -> Result<Value, String> {
    decode_with(text, symbols, iris, None)
}

/// Decodes a value; `{"$fn": n}` is the function `handles` keeps as `n`.
pub fn decode_with(
    text: &str,
    symbols: &mut Symbols,
    iris: &HashMap<String, String>,
    handles: Option<&Handles>,
) -> Result<Value, String> {
    let hashes: HashMap<String, String> = iris
        .iter()
        .map(|(hash, iri)| (iri.clone(), hash.clone()))
        .collect();
    let units: Vec<u16> = text.encode_utf16().collect();
    let mut reader = Reader {
        units: &units,
        pos: 0,
    };
    let json = reader.value()?;
    if reader.peek().is_some() {
        return Err(format!("json: trailing input at {}", reader.pos));
    }
    to_value(&json, symbols, &hashes, handles)
}

/// A JSON object field `"name":<raw>`; the raw part is already JSON.
pub fn entry(name: &str, raw: &str) -> String {
    let key: Vec<u16> = name.encode_utf16().collect();
    format!("{}:{}", json(&key), raw)
}

/// A JSON string from Rust text.
pub fn string(value: &str) -> String {
    let units: Vec<u16> = value.encode_utf16().collect();
    json(&units)
}
