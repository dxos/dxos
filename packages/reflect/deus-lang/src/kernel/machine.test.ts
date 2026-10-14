//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { runImage } from './run.ts';

/** Runs a hand-written Core image and returns what it printed. */
const run = (image: string) => {
  let stdout = '';
  let stderr = '';
  const { code } = runImage(image, {
    args: [],
    stdout: (chunk) => {
      stdout += chunk;
    },
    stderr: (chunk) => {
      stderr += chunk;
    },
  });
  return { code, stdout, stderr };
};

const print = (term: string) => `(app (op "#IO" 0 1) (app (prim "show") ${term}))`;

describe('kernel', () => {
  test('recursion and arithmetic wrap at 32 bits', ({ expect }) => {
    const { stdout } = run(`
      (def "fact" (lam (if (app (prim "le") (var 0) (int 1)) (int 1) (app (prim "Int.mul") (var 0) (app (ref "fact") (app (prim "Int.sub") (var 0) (int 1)))))))
      (def "main" (lam (seq ${print('(app (ref "fact") (int 10))')} ${print('(app (prim "Int.add") (int 2147483647) (int 1))')})))
      (main "main")`);
    expect(stdout).toBe('3628800-2147483648');
  });

  test('tail calls run in constant stack', ({ expect }) => {
    const { stdout } = run(`
      (def "loop" (lam (lam (if (app (prim "eq") (var 1) (int 0)) (var 0) (app (ref "loop") (app (prim "Int.sub") (var 1) (int 1)) (app (prim "Int.add") (var 0) (int 1)))))))
      (def "main" (lam ${print('(app (ref "loop") (int 1000000) (int 0))')}))
      (main "main")`);
    expect(stdout).toBe('1000000');
  });

  test('a deep handler resumes its continuation more than once', ({ expect }) => {
    const { stdout } = run(`
      (def "flip" (app (op "Choice" 0 1) (con "#Unit" 0 0)))
      (def "prog" (lam (let (app (op "Choice" 0 1) (con "#Unit" 0 0)) (let (app (op "Choice" 0 1) (con "#Unit" 0 0)) (app (con "#Pair" 0 2) (var 1) (var 0))))))
      (def "all" (handle (app (ref "prog") (con "#Unit" 0 0))
        (ret (app (con "#List" 1 2) (var 0) (con "#List" 0 0)))
        (on "Choice" 0 1 (app (prim "append") (app (var 0) (con "#Bool" 1 0)) (app (var 0) (con "#Bool" 0 0))))))
      (def "main" (lam ${print('(ref "all")')}))
      (main "main")`);
    expect(stdout).toBe('[(true, true), (true, false), (false, true), (false, false)]');
  });

  test('a defect reaches a #Defect handler and is not resumed', ({ expect }) => {
    const { stdout, code } = run(`
      (def "main" (lam ${print('(handle (app (prim "Int.div") (int 1) (int 0)) (on "#Defect" 0 1 (app (prim "append") (text "caught: ") (var 1))))')}))
      (main "main")`);
    expect(code).toBe(0);
    expect(stdout).toBe('"caught: division by zero"');
  });

  test('an unhandled defect exits 70; a broken image panics with 71', ({ expect }) => {
    expect(run('(def "main" (lam (match (int 1) (case (pint 2) (int 0))))) (main "main")').code).toBe(70);
    expect(run('(def "main" (lam (ref "missing"))) (main "main")').code).toBe(71);
    expect(run('(def "main" (lam (int 0)))').code).toBe(71);
    expect(run('(def "main" (lam (bogus))) (main "main")').code).toBe(71);
    expect(run('(def "main"').code).toBe(71);
  });

  test('an unhandled defect lists the definitions on the stack, innermost first', ({ expect }) => {
    const { stderr, code } = run(`
      (def "inner" (lam (app (prim "Int.div") (int 1) (var 0))))
      (def "outer" (lam (app (prim "Int.add") (app (ref "inner") (var 0)) (int 1))))
      (def "main" (lam ${print('(app (ref "outer") (int 0))')}))
      (main "main")`);
    expect(code).toBe(70);
    expect(stderr).toBe('defect: division by zero\n  at #inner\n  at #outer\n  at #main\n');
  });

  test('compiled code that performs an operation is replayed without repeating its writes', ({ expect }) => {
    const { stdout } = run(`
      (def "bump" (lam (seq (app (prim "Ref.set") (var 0) (app (prim "Int.add") (app (prim "Ref.get") (var 0)) (int 1))) (app (op "Ask" 0 1) (con "#Unit" 0 0)))))
      (def "main" (lam (let (app (prim "Ref.new") (int 0))
        (seq ${print('(handle (app (ref "bump") (var 0)) (on "Ask" 0 1 (app (var 0) (int 5))))')} ${print('(app (prim "Ref.get") (var 0))')}))))
      (main "main")`);
    expect(stdout).toBe('51');
  });

  test('a compiled self tail call that swaps its arguments', ({ expect }) => {
    const { stdout } = run(`
      (def "swap" (lam (lam (lam (if (app (prim "eq") (var 0) (int 0)) (app (con "#Pair" 0 2) (var 2) (var 1)) (app (ref "swap") (var 1) (var 2) (app (prim "Int.sub") (var 0) (int 1))))))))
      (def "main" (lam ${print('(app (ref "swap") (int 1) (int 2) (int 3))')}))
      (main "main")`);
    expect(stdout).toBe('(2, 1)');
  });

  test('a global whose evaluation was aborted is evaluated again, not reported as a cycle', ({ expect }) => {
    const caught = '(handle (ref "bad") (on "#Defect" 0 1 (var 1)))';
    const { stdout } = run(`
      (def "bad" (app (prim "Int.div") (int 1) (int 0)))
      (def "main" (lam (seq ${print(caught)} ${print(caught)})))
      (main "main")`);
    expect(stdout).toBe('"division by zero""division by zero"');
  });
});
