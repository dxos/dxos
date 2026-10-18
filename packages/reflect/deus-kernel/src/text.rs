//
// Copyright 2026 DXOS.org
//

//! DEUS `Text` has JavaScript string semantics (UTF-16 code units), so both kernels agree on
//! lengths, indices, slicing and ordering byte for byte.

use std::rc::Rc;

pub type Text = Rc<[u16]>;

pub fn text(value: &str) -> Text {
    value.encode_utf16().collect::<Vec<u16>>().into()
}

pub fn from_units(units: Vec<u16>) -> Text {
    units.into()
}

/// UTF-8 for the outside world; a lone surrogate becomes U+FFFD, as Node's encoder does.
pub fn string(value: &[u16]) -> String {
    String::from_utf16_lossy(value)
}

/// JavaScript `ToInt32` of a double.
pub fn to_int32(value: f64) -> i32 {
    if !value.is_finite() {
        return 0;
    }
    let modulus = 4294967296.0;
    let mut wrapped = value.trunc() % modulus;
    if wrapped < 0.0 {
        wrapped += modulus;
    }
    if wrapped >= 2147483648.0 {
        (wrapped - modulus) as i32
    } else {
        wrapped as i32
    }
}

/// `/^-?[0-9]+$/` followed by `Number(atom) | 0`.
pub fn parse_int(units: &[u16]) -> Option<i32> {
    let digits = if units.first() == Some(&(b'-' as u16)) {
        &units[1..]
    } else {
        units
    };
    if digits.is_empty()
        || !digits
            .iter()
            .all(|unit| (b'0' as u16..=b'9' as u16).contains(unit))
    {
        return None;
    }
    string(units).parse::<f64>().ok().map(to_int32)
}

/// `String.prototype.slice`.
pub fn slice(value: &[u16], start: i32, end: i32) -> Text {
    let len = value.len() as i64;
    let clamp = |index: i32| -> i64 {
        let index = index as i64;
        if index < 0 {
            (len + index).max(0)
        } else {
            index.min(len)
        }
    };
    let (from, to) = (clamp(start), clamp(end));
    if from >= to {
        return Rc::from(Vec::new());
    }
    value[from as usize..to as usize].into()
}

/// `String.prototype.indexOf` with a start position.
pub fn index_of(value: &[u16], needle: &[u16], from: i32) -> i32 {
    let len = value.len();
    let start = (from.max(0) as usize).min(len);
    if needle.is_empty() {
        return start as i32;
    }
    if needle.len() > len {
        return -1;
    }
    (start..=len - needle.len())
        .find(|&index| &value[index..index + needle.len()] == needle)
        .map_or(-1, |index| index as i32)
}

/// `String.prototype.split` with a string separator.
pub fn split(value: &[u16], separator: &[u16]) -> Vec<Text> {
    if separator.is_empty() {
        return value.iter().map(|unit| Rc::from(vec![*unit])).collect();
    }
    let mut parts = Vec::new();
    let mut start = 0;
    let mut index = 0;
    while index + separator.len() <= value.len() {
        if &value[index..index + separator.len()] == separator {
            parts.push(value[start..index].into());
            index += separator.len();
            start = index;
        } else {
            index += 1;
        }
    }
    parts.push(value[start..].into());
    parts
}

fn is_js_space(unit: u16) -> bool {
    matches!(
        unit,
        0x09..=0x0d | 0x20 | 0xa0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff
    )
}

/// `String.prototype.trim`.
pub fn trim(value: &[u16]) -> Text {
    let start = value
        .iter()
        .position(|unit| !is_js_space(*unit))
        .unwrap_or(value.len());
    let end = value
        .iter()
        .rposition(|unit| !is_js_space(*unit))
        .map_or(start, |index| index + 1);
    value[start..end.max(start)].into()
}

/// `JSON.stringify` of a string (well-formed: lone surrogates are escaped).
pub fn json(value: &[u16]) -> String {
    let mut out = String::from("\"");
    let mut index = 0;
    while index < value.len() {
        let unit = value[index];
        match unit {
            0x22 => out.push_str("\\\""),
            0x5c => out.push_str("\\\\"),
            0x08 => out.push_str("\\b"),
            0x0c => out.push_str("\\f"),
            0x0a => out.push_str("\\n"),
            0x0d => out.push_str("\\r"),
            0x09 => out.push_str("\\t"),
            0x00..=0x1f => out.push_str(&format!("\\u{unit:04x}")),
            0xd800..=0xdbff
                if index + 1 < value.len() && (0xdc00..=0xdfff).contains(&value[index + 1]) =>
            {
                out.push_str(&String::from_utf16_lossy(&value[index..index + 2]));
                index += 1;
            }
            0xd800..=0xdfff => out.push_str(&format!("\\u{unit:04x}")),
            _ => out.push_str(&String::from_utf16_lossy(&[unit])),
        }
        index += 1;
    }
    out.push('"');
    out
}
