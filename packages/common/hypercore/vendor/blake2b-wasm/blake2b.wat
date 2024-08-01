(module
  ;; 0-64 reserved for param block
  (memory (export "memory") 10 1000)

  (func (export "blake2b_init") (param $ptr i32) (param $outlen i32)
    ;; setup param block (expect memory to be cleared)

    ;; b array: 0-128
    (i64.store offset=0 (get_local $ptr) (i64.const 0))
    (i64.store offset=8 (get_local $ptr) (i64.const 0))
    (i64.store offset=16 (get_local $ptr) (i64.const 0))
    (i64.store offset=24 (get_local $ptr) (i64.const 0))
    (i64.store offset=32 (get_local $ptr) (i64.const 0))
    (i64.store offset=40 (get_local $ptr) (i64.const 0))
    (i64.store offset=48 (get_local $ptr) (i64.const 0))
    (i64.store offset=56 (get_local $ptr) (i64.const 0))
    (i64.store offset=64 (get_local $ptr) (i64.const 0))
    (i64.store offset=72 (get_local $ptr) (i64.const 0))
    (i64.store offset=80 (get_local $ptr) (i64.const 0))
    (i64.store offset=88 (get_local $ptr) (i64.const 0))
    (i64.store offset=96 (get_local $ptr) (i64.const 0))
    (i64.store offset=104 (get_local $ptr) (i64.const 0))
    (i64.store offset=112 (get_local $ptr) (i64.const 0))
    (i64.store offset=120 (get_local $ptr) (i64.const 0))

    ;; h array: 128-192, (8 * i64)
    ;; TODO: support xor against param block and stuff, for now just xor against length

    (i64.store offset=128 (get_local $ptr) (i64.xor (i64.const 0x6a09e667f3bcc908) (i64.load (i32.const 0))))
    (i64.store offset=136 (get_local $ptr) (i64.xor (i64.const 0xbb67ae8584caa73b) (i64.load (i32.const 8))))
    (i64.store offset=144 (get_local $ptr) (i64.xor (i64.const 0x3c6ef372fe94f82b) (i64.load (i32.const 16))))
    (i64.store offset=152 (get_local $ptr) (i64.xor (i64.const 0xa54ff53a5f1d36f1) (i64.load (i32.const 24))))
    (i64.store offset=160 (get_local $ptr) (i64.xor (i64.const 0x510e527fade682d1) (i64.load (i32.const 32))))
    (i64.store offset=168 (get_local $ptr) (i64.xor (i64.const 0x9b05688c2b3e6c1f) (i64.load (i32.const 40))))
    (i64.store offset=176 (get_local $ptr) (i64.xor (i64.const 0x1f83d9abfb41bd6b) (i64.load (i32.const 48))))
    (i64.store offset=184 (get_local $ptr) (i64.xor (i64.const 0x5be0cd19137e2179) (i64.load (i32.const 56))))

    ;; t int.64: 192-200
    (i64.store offset=192 (get_local $ptr) (i64.const 0))

    ;; c int.64: 200-208
    (i64.store offset=200 (get_local $ptr) (i64.const 0))

    ;; f int.64: 208-216
    (i64.store offset=208 (get_local $ptr) (i64.const 0))
  )

  (func (export "blake2b_update") (param $ctx i32) (param $input i32) (param $input_end i32)
    (local $t i32)
    (local $c i32)
    (local $i i32)

    ;; load ctx.t, ctx.c
    (set_local $t (i32.add (get_local $ctx) (i32.const 192)))
    (set_local $c (i32.add (get_local $ctx) (i32.const 200)))

    ;; i = ctx.c
    (set_local $i (i32.wrap/i64 (i64.load (get_local $c))))

    (block $end
      (loop $start
        (br_if $end (i32.eq (get_local $input) (get_local $input_end)))

        (if (i32.eq (get_local $i) (i32.const 128))
          (then
            (i64.store (get_local $t) (i64.add (i64.load (get_local $t)) (i64.extend_u/i32 (get_local $i))))
            (set_local $i (i32.const 0))

            (call $blake2b_compress (get_local $ctx))
          )
        )

        (i32.store8 (i32.add (get_local $ctx) (get_local $i)) (i32.load8_u (get_local $input)))
        (set_local $i (i32.add (get_local $i) (i32.const 1)))
        (set_local $input (i32.add (get_local $input) (i32.const 1)))

        (br $start)
      )
    )

    (i64.store (get_local $c) (i64.extend_u/i32 (get_local $i)))
  )

  (func (export "blake2b_final") (param $ctx i32)
    (local $t i32)
    (local $c i32)
    (local $i i32)

    ;; load ctx.t, ctx.c
    (set_local $t (i32.add (get_local $ctx) (i32.const 192)))
    (set_local $c (i32.add (get_local $ctx) (i32.const 200)))

    ;; ctx.t += ctx.c
    (i64.store (get_local $t) (i64.add (i64.load (get_local $t)) (i64.load (get_local $c))))

    ;; set ctx.f to last_block
    (i64.store offset=208 (get_local $ctx) (i64.const 0xffffffffffffffff))

    ;; i = ctx.c
    (set_local $i (i32.wrap/i64 (i64.load (get_local $c))))

    ;; zero out remaining, i..128
    (block $end
      (loop $start
        (br_if $end (i32.eq (get_local $i) (i32.const 128)))
        (i32.store8 (i32.add (get_local $ctx) (get_local $i)) (i32.const 0))
        (set_local $i (i32.add (get_local $i) (i32.const 1)))
        (br $start)
      )
    )

    ;; ctx.c = i (for good meassure)
    (i64.store (get_local $c) (i64.extend_u/i32 (get_local $i)))

    (call $blake2b_compress (get_local $ctx))
  )

  (func $blake2b_compress (export "blake2b_compress") (param $ctx i32)
    (local $v0 i64)
    (local $v1 i64)
    (local $v2 i64)
    (local $v3 i64)
    (local $v4 i64)
    (local $v5 i64)
    (local $v6 i64)
    (local $v7 i64)
    (local $v8 i64)
    (local $v9 i64)
    (local $v10 i64)
    (local $v11 i64)
    (local $v12 i64)
    (local $v13 i64)
    (local $v14 i64)
    (local $v15 i64)

    (local $m0 i64)
    (local $m1 i64)
    (local $m2 i64)
    (local $m3 i64)
    (local $m4 i64)
    (local $m5 i64)
    (local $m6 i64)
    (local $m7 i64)
    (local $m8 i64)
    (local $m9 i64)
    (local $m10 i64)
    (local $m11 i64)
    (local $m12 i64)
    (local $m13 i64)
    (local $m14 i64)
    (local $m15 i64)

    (local $h0 i32)
    (local $h1 i32)
    (local $h2 i32)
    (local $h3 i32)
    (local $h4 i32)
    (local $h5 i32)
    (local $h6 i32)
    (local $h7 i32)
    (local $h8 i32)

    ;; set h ptrs
    (set_local $h0 (i32.add (get_local $ctx) (i32.const 128)))
    (set_local $h1 (i32.add (get_local $ctx) (i32.const 136)))
    (set_local $h2 (i32.add (get_local $ctx) (i32.const 144)))
    (set_local $h3 (i32.add (get_local $ctx) (i32.const 152)))
    (set_local $h4 (i32.add (get_local $ctx) (i32.const 160)))
    (set_local $h5 (i32.add (get_local $ctx) (i32.const 168)))
    (set_local $h6 (i32.add (get_local $ctx) (i32.const 176)))
    (set_local $h7 (i32.add (get_local $ctx) (i32.const 184)))

    ;; set v[0-8] to ctx.h[0-8]
    (set_local $v0 (i64.load (get_local $h0)))
    (set_local $v1 (i64.load (get_local $h1)))
    (set_local $v2 (i64.load (get_local $h2)))
    (set_local $v3 (i64.load (get_local $h3)))
    (set_local $v4 (i64.load (get_local $h4)))
    (set_local $v5 (i64.load (get_local $h5)))
    (set_local $v6 (i64.load (get_local $h6)))
    (set_local $v7 (i64.load (get_local $h7)))

    ;; set v[8-16] to init vectors
    (set_local $v8 (i64.const 0x6a09e667f3bcc908))
    (set_local $v9 (i64.const 0xbb67ae8584caa73b))
    (set_local $v10 (i64.const 0x3c6ef372fe94f82b))
    (set_local $v11 (i64.const 0xa54ff53a5f1d36f1))
    (set_local $v12 (i64.const 0x510e527fade682d1))
    (set_local $v13 (i64.const 0x9b05688c2b3e6c1f))
    (set_local $v14 (i64.const 0x1f83d9abfb41bd6b))
    (set_local $v15 (i64.const 0x5be0cd19137e2179))

    ;; set m[0-16] to ctx[0-128]
    (set_local $m0 (i64.load offset=0 (get_local $ctx)))
    (set_local $m1 (i64.load offset=8 (get_local $ctx)))
    (set_local $m2 (i64.load offset=16 (get_local $ctx)))
    (set_local $m3 (i64.load offset=24 (get_local $ctx)))
    (set_local $m4 (i64.load offset=32 (get_local $ctx)))
    (set_local $m5 (i64.load offset=40 (get_local $ctx)))
    (set_local $m6 (i64.load offset=48 (get_local $ctx)))
    (set_local $m7 (i64.load offset=56 (get_local $ctx)))
    (set_local $m8 (i64.load offset=64 (get_local $ctx)))
    (set_local $m9 (i64.load offset=72 (get_local $ctx)))
    (set_local $m10 (i64.load offset=80 (get_local $ctx)))
    (set_local $m11 (i64.load offset=88 (get_local $ctx)))
    (set_local $m12 (i64.load offset=96 (get_local $ctx)))
    (set_local $m13 (i64.load offset=104 (get_local $ctx)))
    (set_local $m14 (i64.load offset=112 (get_local $ctx)))
    (set_local $m15 (i64.load offset=120 (get_local $ctx)))

    ;; v12 = v12 ^ ctx.t
    (set_local $v12
      (i64.xor
        (get_local $v12)
        (i64.load offset=192 (get_local $ctx))
      )
    )

    ;; v14 = v14 ^ ctx.f
    (set_local $v14
      (i64.xor
        (get_local $v14)
        (i64.load  offset=208 (get_local $ctx))
      )
    )

    ;; ROUNDS GENERATED BY `node generate-rounds.js`

    ;; ROUND(0)

    ;; G(0, 0)

    ;; $v0 = $v0 + $v4 + $m0
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m0))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m1
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m1))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(0, 1)

    ;; $v1 = $v1 + $v5 + $m2
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m2))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m3
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m3))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(0, 2)

    ;; $v2 = $v2 + $v6 + $m4
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m4))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m5
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(0, 3)

    ;; $v3 = $v3 + $v7 + $m6
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m7
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m7))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(0, 4)

    ;; $v0 = $v0 + $v5 + $m8
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m8))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m9
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m9))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(0, 5)

    ;; $v1 = $v1 + $v6 + $m10
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m11
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m11))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(0, 6)

    ;; $v2 = $v2 + $v7 + $m12
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m12))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m13
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m13))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(0, 7)

    ;; $v3 = $v3 + $v4 + $m14
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m14))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m15
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m15))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(1)

    ;; G(1, 0)

    ;; $v0 = $v0 + $v4 + $m14
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m14))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m10
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(1, 1)

    ;; $v1 = $v1 + $v5 + $m4
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m4))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m8
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m8))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(1, 2)

    ;; $v2 = $v2 + $v6 + $m9
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m9))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m15
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m15))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(1, 3)

    ;; $v3 = $v3 + $v7 + $m13
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m13))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m6
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(1, 4)

    ;; $v0 = $v0 + $v5 + $m1
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m1))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m12
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m12))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(1, 5)

    ;; $v1 = $v1 + $v6 + $m0
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m0))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m2
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m2))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(1, 6)

    ;; $v2 = $v2 + $v7 + $m11
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m11))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m7
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m7))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(1, 7)

    ;; $v3 = $v3 + $v4 + $m5
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m3
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m3))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(2)

    ;; G(2, 0)

    ;; $v0 = $v0 + $v4 + $m11
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m11))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m8
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m8))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(2, 1)

    ;; $v1 = $v1 + $v5 + $m12
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m12))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m0
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m0))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(2, 2)

    ;; $v2 = $v2 + $v6 + $m5
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m2
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m2))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(2, 3)

    ;; $v3 = $v3 + $v7 + $m15
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m15))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m13
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m13))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(2, 4)

    ;; $v0 = $v0 + $v5 + $m10
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m10))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m14
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m14))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(2, 5)

    ;; $v1 = $v1 + $v6 + $m3
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m3))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m6
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m6))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(2, 6)

    ;; $v2 = $v2 + $v7 + $m7
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m7))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m1
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m1))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(2, 7)

    ;; $v3 = $v3 + $v4 + $m9
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m9))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m4
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m4))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(3)

    ;; G(3, 0)

    ;; $v0 = $v0 + $v4 + $m7
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m7))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m9
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m9))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(3, 1)

    ;; $v1 = $v1 + $v5 + $m3
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m3))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m1
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m1))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(3, 2)

    ;; $v2 = $v2 + $v6 + $m13
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m13))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m12
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m12))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(3, 3)

    ;; $v3 = $v3 + $v7 + $m11
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m11))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m14
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m14))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(3, 4)

    ;; $v0 = $v0 + $v5 + $m2
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m2))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m6
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m6))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(3, 5)

    ;; $v1 = $v1 + $v6 + $m5
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m5))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m10
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(3, 6)

    ;; $v2 = $v2 + $v7 + $m4
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m4))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m0
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m0))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(3, 7)

    ;; $v3 = $v3 + $v4 + $m15
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m15))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m8
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m8))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(4)

    ;; G(4, 0)

    ;; $v0 = $v0 + $v4 + $m9
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m9))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m0
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m0))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(4, 1)

    ;; $v1 = $v1 + $v5 + $m5
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m5))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m7
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m7))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(4, 2)

    ;; $v2 = $v2 + $v6 + $m2
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m2))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m4
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m4))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(4, 3)

    ;; $v3 = $v3 + $v7 + $m10
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m10))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m15
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m15))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(4, 4)

    ;; $v0 = $v0 + $v5 + $m14
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m14))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m1
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m1))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(4, 5)

    ;; $v1 = $v1 + $v6 + $m11
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m11))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m12
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m12))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(4, 6)

    ;; $v2 = $v2 + $v7 + $m6
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m8
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m8))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(4, 7)

    ;; $v3 = $v3 + $v4 + $m3
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m3))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m13
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m13))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(5)

    ;; G(5, 0)

    ;; $v0 = $v0 + $v4 + $m2
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m2))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m12
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m12))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(5, 1)

    ;; $v1 = $v1 + $v5 + $m6
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m6))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m10
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m10))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(5, 2)

    ;; $v2 = $v2 + $v6 + $m0
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m0))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m11
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m11))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(5, 3)

    ;; $v3 = $v3 + $v7 + $m8
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m8))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m3
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m3))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(5, 4)

    ;; $v0 = $v0 + $v5 + $m4
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m4))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m13
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m13))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(5, 5)

    ;; $v1 = $v1 + $v6 + $m7
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m7))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m5
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m5))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(5, 6)

    ;; $v2 = $v2 + $v7 + $m15
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m15))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m14
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m14))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(5, 7)

    ;; $v3 = $v3 + $v4 + $m1
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m1))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m9
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m9))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(6)

    ;; G(6, 0)

    ;; $v0 = $v0 + $v4 + $m12
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m12))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m5
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m5))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(6, 1)

    ;; $v1 = $v1 + $v5 + $m1
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m1))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m15
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m15))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(6, 2)

    ;; $v2 = $v2 + $v6 + $m14
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m14))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m13
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m13))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(6, 3)

    ;; $v3 = $v3 + $v7 + $m4
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m4))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m10
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m10))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(6, 4)

    ;; $v0 = $v0 + $v5 + $m0
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m0))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m7
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m7))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(6, 5)

    ;; $v1 = $v1 + $v6 + $m6
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m6))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m3
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m3))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(6, 6)

    ;; $v2 = $v2 + $v7 + $m9
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m9))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m2
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m2))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(6, 7)

    ;; $v3 = $v3 + $v4 + $m8
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m8))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m11
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m11))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(7)

    ;; G(7, 0)

    ;; $v0 = $v0 + $v4 + $m13
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m13))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m11
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m11))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(7, 1)

    ;; $v1 = $v1 + $v5 + $m7
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m7))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m14
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m14))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(7, 2)

    ;; $v2 = $v2 + $v6 + $m12
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m12))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m1
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m1))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(7, 3)

    ;; $v3 = $v3 + $v7 + $m3
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m3))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m9
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m9))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(7, 4)

    ;; $v0 = $v0 + $v5 + $m5
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m5))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m0
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m0))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(7, 5)

    ;; $v1 = $v1 + $v6 + $m15
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m15))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m4
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m4))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(7, 6)

    ;; $v2 = $v2 + $v7 + $m8
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m8))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m6
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(7, 7)

    ;; $v3 = $v3 + $v4 + $m2
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m2))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m10
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m10))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(8)

    ;; G(8, 0)

    ;; $v0 = $v0 + $v4 + $m6
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m6))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m15
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m15))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(8, 1)

    ;; $v1 = $v1 + $v5 + $m14
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m14))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m9
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m9))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(8, 2)

    ;; $v2 = $v2 + $v6 + $m11
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m11))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m3
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m3))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(8, 3)

    ;; $v3 = $v3 + $v7 + $m0
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m0))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m8
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m8))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(8, 4)

    ;; $v0 = $v0 + $v5 + $m12
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m12))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m2
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m2))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(8, 5)

    ;; $v1 = $v1 + $v6 + $m13
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m13))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m7
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m7))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(8, 6)

    ;; $v2 = $v2 + $v7 + $m1
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m1))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m4
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m4))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(8, 7)

    ;; $v3 = $v3 + $v4 + $m10
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m10))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m5
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(9)

    ;; G(9, 0)

    ;; $v0 = $v0 + $v4 + $m10
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m2
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m2))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(9, 1)

    ;; $v1 = $v1 + $v5 + $m8
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m8))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m4
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m4))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(9, 2)

    ;; $v2 = $v2 + $v6 + $m7
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m7))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m6
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m6))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(9, 3)

    ;; $v3 = $v3 + $v7 + $m1
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m1))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m5
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m5))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(9, 4)

    ;; $v0 = $v0 + $v5 + $m15
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m15))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m11
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m11))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(9, 5)

    ;; $v1 = $v1 + $v6 + $m9
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m9))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m14
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m14))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(9, 6)

    ;; $v2 = $v2 + $v7 + $m3
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m3))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m12
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m12))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(9, 7)

    ;; $v3 = $v3 + $v4 + $m13
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m13))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m0
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m0))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(10)

    ;; G(10, 0)

    ;; $v0 = $v0 + $v4 + $m0
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m0))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m1
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m1))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(10, 1)

    ;; $v1 = $v1 + $v5 + $m2
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m2))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m3
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m3))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(10, 2)

    ;; $v2 = $v2 + $v6 + $m4
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m4))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m5
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(10, 3)

    ;; $v3 = $v3 + $v7 + $m6
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m7
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m7))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(10, 4)

    ;; $v0 = $v0 + $v5 + $m8
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m8))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m9
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m9))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(10, 5)

    ;; $v1 = $v1 + $v6 + $m10
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m11
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m11))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(10, 6)

    ;; $v2 = $v2 + $v7 + $m12
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m12))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m13
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m13))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(10, 7)

    ;; $v3 = $v3 + $v4 + $m14
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m14))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m15
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m15))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; ROUND(11)

    ;; G(11, 0)

    ;; $v0 = $v0 + $v4 + $m14
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m14))))

    ;; $v12 = rotr64($v12 ^ $v0, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 32)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 24)))

    ;; $v0 = $v0 + $v4 + $m10
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v4) (get_local $m10))))

    ;; $v12 = rotr64($v12 ^ $v0, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v0)) (i64.const 16)))

    ;; $v8 = $v8 + $v12
    (set_local $v8 (i64.add (get_local $v8) (get_local $v12)))

    ;; $v4 = rotr64($v4 ^ $v8, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v8)) (i64.const 63)))

    ;; G(11, 1)

    ;; $v1 = $v1 + $v5 + $m4
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m4))))

    ;; $v13 = rotr64($v13 ^ $v1, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 32)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 24)))

    ;; $v1 = $v1 + $v5 + $m8
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v5) (get_local $m8))))

    ;; $v13 = rotr64($v13 ^ $v1, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v1)) (i64.const 16)))

    ;; $v9 = $v9 + $v13
    (set_local $v9 (i64.add (get_local $v9) (get_local $v13)))

    ;; $v5 = rotr64($v5 ^ $v9, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v9)) (i64.const 63)))

    ;; G(11, 2)

    ;; $v2 = $v2 + $v6 + $m9
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m9))))

    ;; $v14 = rotr64($v14 ^ $v2, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 32)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 24)))

    ;; $v2 = $v2 + $v6 + $m15
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v6) (get_local $m15))))

    ;; $v14 = rotr64($v14 ^ $v2, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v2)) (i64.const 16)))

    ;; $v10 = $v10 + $v14
    (set_local $v10 (i64.add (get_local $v10) (get_local $v14)))

    ;; $v6 = rotr64($v6 ^ $v10, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v10)) (i64.const 63)))

    ;; G(11, 3)

    ;; $v3 = $v3 + $v7 + $m13
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m13))))

    ;; $v15 = rotr64($v15 ^ $v3, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 32)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 24)))

    ;; $v3 = $v3 + $v7 + $m6
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v7) (get_local $m6))))

    ;; $v15 = rotr64($v15 ^ $v3, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v3)) (i64.const 16)))

    ;; $v11 = $v11 + $v15
    (set_local $v11 (i64.add (get_local $v11) (get_local $v15)))

    ;; $v7 = rotr64($v7 ^ $v11, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v11)) (i64.const 63)))

    ;; G(11, 4)

    ;; $v0 = $v0 + $v5 + $m1
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m1))))

    ;; $v15 = rotr64($v15 ^ $v0, 32)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 32)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 24)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 24)))

    ;; $v0 = $v0 + $v5 + $m12
    (set_local $v0 (i64.add (get_local $v0) (i64.add (get_local $v5) (get_local $m12))))

    ;; $v15 = rotr64($v15 ^ $v0, 16)
    (set_local $v15 (i64.rotr (i64.xor (get_local $v15) (get_local $v0)) (i64.const 16)))

    ;; $v10 = $v10 + $v15
    (set_local $v10 (i64.add (get_local $v10) (get_local $v15)))

    ;; $v5 = rotr64($v5 ^ $v10, 63)
    (set_local $v5 (i64.rotr (i64.xor (get_local $v5) (get_local $v10)) (i64.const 63)))

    ;; G(11, 5)

    ;; $v1 = $v1 + $v6 + $m0
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m0))))

    ;; $v12 = rotr64($v12 ^ $v1, 32)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 32)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 24)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 24)))

    ;; $v1 = $v1 + $v6 + $m2
    (set_local $v1 (i64.add (get_local $v1) (i64.add (get_local $v6) (get_local $m2))))

    ;; $v12 = rotr64($v12 ^ $v1, 16)
    (set_local $v12 (i64.rotr (i64.xor (get_local $v12) (get_local $v1)) (i64.const 16)))

    ;; $v11 = $v11 + $v12
    (set_local $v11 (i64.add (get_local $v11) (get_local $v12)))

    ;; $v6 = rotr64($v6 ^ $v11, 63)
    (set_local $v6 (i64.rotr (i64.xor (get_local $v6) (get_local $v11)) (i64.const 63)))

    ;; G(11, 6)

    ;; $v2 = $v2 + $v7 + $m11
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m11))))

    ;; $v13 = rotr64($v13 ^ $v2, 32)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 32)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 24)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 24)))

    ;; $v2 = $v2 + $v7 + $m7
    (set_local $v2 (i64.add (get_local $v2) (i64.add (get_local $v7) (get_local $m7))))

    ;; $v13 = rotr64($v13 ^ $v2, 16)
    (set_local $v13 (i64.rotr (i64.xor (get_local $v13) (get_local $v2)) (i64.const 16)))

    ;; $v8 = $v8 + $v13
    (set_local $v8 (i64.add (get_local $v8) (get_local $v13)))

    ;; $v7 = rotr64($v7 ^ $v8, 63)
    (set_local $v7 (i64.rotr (i64.xor (get_local $v7) (get_local $v8)) (i64.const 63)))

    ;; G(11, 7)

    ;; $v3 = $v3 + $v4 + $m5
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m5))))

    ;; $v14 = rotr64($v14 ^ $v3, 32)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 32)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 24)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 24)))

    ;; $v3 = $v3 + $v4 + $m3
    (set_local $v3 (i64.add (get_local $v3) (i64.add (get_local $v4) (get_local $m3))))

    ;; $v14 = rotr64($v14 ^ $v3, 16)
    (set_local $v14 (i64.rotr (i64.xor (get_local $v14) (get_local $v3)) (i64.const 16)))

    ;; $v9 = $v9 + $v14
    (set_local $v9 (i64.add (get_local $v9) (get_local $v14)))

    ;; $v4 = rotr64($v4 ^ $v9, 63)
    (set_local $v4 (i64.rotr (i64.xor (get_local $v4) (get_local $v9)) (i64.const 63)))

    ;; END OF GENERATED CODE

    (i64.store (get_local $h0)
      (i64.xor
        (i64.load (get_local $h0))
        (i64.xor
          (get_local $v0)
          (get_local $v8)
        )
      )
    )

    (i64.store (get_local $h1)
      (i64.xor
        (i64.load (get_local $h1))
        (i64.xor
          (get_local $v1)
          (get_local $v9)
        )
      )
    )

    (i64.store (get_local $h2)
      (i64.xor
        (i64.load (get_local $h2))
        (i64.xor
          (get_local $v2)
          (get_local $v10)
        )
      )
    )

    (i64.store (get_local $h3)
      (i64.xor
        (i64.load (get_local $h3))
        (i64.xor
          (get_local $v3)
          (get_local $v11)
        )
      )
    )

    (i64.store (get_local $h4)
      (i64.xor
        (i64.load (get_local $h4))
        (i64.xor
          (get_local $v4)
          (get_local $v12)
        )
      )
    )

    (i64.store (get_local $h5)
      (i64.xor
        (i64.load (get_local $h5))
        (i64.xor
          (get_local $v5)
          (get_local $v13)
        )
      )
    )

    (i64.store (get_local $h6)
      (i64.xor
        (i64.load (get_local $h6))
        (i64.xor
          (get_local $v6)
          (get_local $v14)
        )
      )
    )

    (i64.store (get_local $h7)
      (i64.xor
        (i64.load (get_local $h7))
        (i64.xor
          (get_local $v7)
          (get_local $v15)
        )
      )
    )
  )
)
