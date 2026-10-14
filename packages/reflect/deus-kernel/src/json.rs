//
// Copyright 2026 DXOS.org
//

//! Values as JSON, for embedders (a Cloudflare Worker, a browser): `Int` is a number, `Text` a
//! string, `Bool` a boolean, `Unit` null, a list an array, and any other constructor
//! `{"$": type, "tag": n, "fields": [...]}`. Functions cross as `{"$fn": true}` and cannot come
//! back. A user type crosses by its IRI when the image names it (`iris`: hash → IRI).

use std::collections::HashMap;

use crate::text::{json, Text};
use crate::value::*;

/// Encodes a value; `symbols` names constructor types.
pub fn encode(value: &Value, symbols: &Symbols, iris: &HashMap<String, String>) -> String {
    let mut out = String::new();
    write(value, symbols, iris, &mut out);
    out
}

fn write(value: &Value, symbols: &Symbols, iris: &HashMap<String, String>, out: &mut String) {
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
                write(item, symbols, iris, out);
            }
            out.push(']');
        }
        Value::Con(con) => {
            let hash = symbols.name(con.ty);
            let name: Vec<u16> = iris
                .get(hash)
                .map_or(hash, |iri| iri.as_str())
                .encode_utf16()
                .collect();
            out.push_str(&format!(
                "{{\"$\":{},\"tag\":{},\"fields\":[",
                json(&name),
                con.tag
            ));
            for (index, field) in con.fields.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write(field, symbols, iris, out);
            }
            out.push_str("]}");
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
) -> Result<Value, String> {
    Ok(match json {
        Json::Null => unit(),
        Json::Bool(x) => Value::Bool(*x),
        Json::Number(x) => Value::Int(crate::text::to_int32(*x)),
        Json::Text(x) => Value::Text(Text::from(x.as_slice())),
        Json::Array(items) => list_from(
            items
                .iter()
                .map(|item| to_value(item, symbols, hashes))
                .collect::<Result<_, _>>()?,
        ),
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
                    .map(|item| to_value(item, symbols, hashes))
                    .collect::<Result<Fields, _>>()?,
                _ => Fields::new(),
            };
            let name = String::from_utf16_lossy(name);
            let ty = symbols.intern(
                hashes
                    .get(&name)
                    .map_or(name.as_str(), |hash| hash.as_str()),
            );
            if ty == BOOL {
                Value::Bool(tag == 1)
            } else {
                con(ty, tag, values)
            }
        }
    })
}

/// Decodes a value.
pub fn decode(
    text: &str,
    symbols: &mut Symbols,
    iris: &HashMap<String, String>,
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
    to_value(&json, symbols, &hashes)
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
