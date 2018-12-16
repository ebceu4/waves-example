import axios from 'axios'
import { TTx as Tx } from 'waves-transactions/transactions'
import { baseUri } from './globals'

type CancellablePromise = Promise<{}> & { cancel: () => void }

export const delay = (timeout: number): CancellablePromise => {
  const t: any = {}
  const p = new Promise((resolve, _) => {
    t.resolve = resolve
    t.id = setTimeout(() => resolve(), timeout)
  }) as any
  (<any>p).cancel = () => { t.resolve(); clearTimeout(t.id) }
  return p
}

export const waitForTx = async (txId: string, timeout: number): Promise<Tx> => {
  const promise = (): any => axios.get(`transactions/info/${txId}`, { baseURL: baseUri })
    .catch(_ => delay(1000).then(__ => promise()))

  const t = delay(timeout)
  const r = await Promise.race([t.then(x => Promise.reject('timeout')), promise().then((x: any) => x.data as Tx)]) as Tx
  t.cancel()
  return r
}

export const broadcast = async (tx: Tx) =>
  await axios.post(baseUri + 'transactions/broadcast', tx, { headers: { 'Content-Type': 'application/json' } })
    .then(x => x.data)

export const broadcastAndWait = async (tx: Tx, timeout: number = 1000 * 60 * 2) => {
  const r = await broadcast(tx)
  return await waitForTx(r.id, timeout)
}
