import { Stream } from "./stream"

describe('Stream', () => {
  test('can consume a stream that immediately closes', async () => {
    const stream = new Stream(({ next, close }) => {
      next('foo')
      next('bar')
      next('baz')
      close()
    })

    expect(await Stream.consume(stream)).toEqual([
      { data: 'foo' },
      { data: 'bar' },
      { data: 'baz' },
      { closed: true },
    ])
  })

  test('can consume a stream that produces items over time', async () => {
    const stream = new Stream(({ next, close }) => {
      setImmediate(async () => {
        await sleep(5)
        next('foo')
        await sleep(5)
        next('bar')
        await sleep(5)
        next('baz')
        await sleep(5)
        close()
      })
    })

    expect(await Stream.consume(stream)).toEqual([
      { data: 'foo' },
      { data: 'bar' },
      { data: 'baz' },
      { closed: true },
    ])
  })

  test('close error is buffered', async () => {
    const stream = new Stream(({ close }) => {
      close(new Error('test'))
    })

    expect(await Stream.consume(stream)).toEqual([
      { closed: true, error: new Error('test') },
    ])
  })
})

// To not introduce a dependency on @dxos/async.
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
