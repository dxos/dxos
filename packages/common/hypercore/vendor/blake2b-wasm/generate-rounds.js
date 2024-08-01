var sigma = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3]
]

function G (r, i, a, b, c, d) {
  return `
    ;; G(${r}, ${i})

    ;; ${a} = ${a} + ${b} + $m${sigma[r][2 * i + 0]}
    (set_local ${a} (i64.add (get_local ${a}) (i64.add (get_local ${b}) (get_local $m${sigma[r][2 * i + 0]}))))

    ;; ${d} = rotr64(${d} ^ ${a}, 32)
    (set_local ${d} (i64.rotr (i64.xor (get_local ${d}) (get_local ${a})) (i64.const 32)))

    ;; ${c} = ${c} + ${d}
    (set_local ${c} (i64.add (get_local ${c}) (get_local ${d})))

    ;; ${b} = rotr64(${b} ^ ${c}, 24)
    (set_local ${b} (i64.rotr (i64.xor (get_local ${b}) (get_local ${c})) (i64.const 24)))

    ;; ${a} = ${a} + ${b} + $m${sigma[r][2 * i + 1]}
    (set_local ${a} (i64.add (get_local ${a}) (i64.add (get_local ${b}) (get_local $m${sigma[r][2 * i + 1]}))))

    ;; ${d} = rotr64(${d} ^ ${a}, 16)
    (set_local ${d} (i64.rotr (i64.xor (get_local ${d}) (get_local ${a})) (i64.const 16)))

    ;; ${c} = ${c} + ${d}
    (set_local ${c} (i64.add (get_local ${c}) (get_local ${d})))

    ;; ${b} = rotr64(${b} ^ ${c}, 63)
    (set_local ${b} (i64.rotr (i64.xor (get_local ${b}) (get_local ${c})) (i64.const 63)))`
}

function ROUND (r) {
  return `
    ;; ROUND(${r})
    ${G(r, 0, '$v0', '$v4', '$v8', '$v12')}
    ${G(r, 1, '$v1', '$v5', '$v9', '$v13')}
    ${G(r, 2, '$v2', '$v6', '$v10', '$v14')}
    ${G(r, 3, '$v3', '$v7', '$v11', '$v15')}
    ${G(r, 4, '$v0', '$v5', '$v10', '$v15')}
    ${G(r, 5, '$v1', '$v6', '$v11', '$v12')}
    ${G(r, 6, '$v2', '$v7', '$v8', '$v13')}
    ${G(r, 7, '$v3', '$v4', '$v9', '$v14')}
  `
}

console.log(
  ROUND(0),
  ROUND(1),
  ROUND(2),
  ROUND(3),
  ROUND(4),
  ROUND(5),
  ROUND(6),
  ROUND(7),
  ROUND(8),
  ROUND(9),
  ROUND(10),
  ROUND(11)
)
