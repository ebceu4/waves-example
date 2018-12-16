import { compile } from '@waves/ride-js'
import { broadcastAndWait } from './api'
import { setScript } from 'waves-transactions'
import { chainId } from './globals'

export const deployContract = async (creator: string, secretHash: string, contractSeed: string): Promise<string> => {
  const compiledContract = Buffer.from(compile(`

  let me = tx.sender
  let creator = addressFromString("${creator}")
  let secretHash = base58'${secretHash}'
  let wave = 100000000
 
match (tx) {
  case t:DataTransaction =>

  if !isDefined(getBinary(me, "payment")) then

      let paymentTx = transactionById(extract(getBinary(t.data, "payment")))
      
      let isPaymentValid = match (paymentTx) {
          case p:TransferTransaction => 
          p.amount == 1*wave &&
          p.recipient == me &&
          sigVerify(p.bodyBytes, p.proofs[0], p.senderPublicKey)

          case _ => false
      }

      let guess = extract(getBinary(t.data, "guess"))
      
      isPaymentValid && size(guess) == 1

  else
      false

  case payout:TransferTransaction => 
      let secret = take(payout.proofs[0],1)
      let isValid = sha256(payout.proofs[0]) == secretHash
      let guesser = match (transactionById(extract(getBinary(me, "payment")))) {
          case p1:TransferTransaction => p1.sender
          case _ => addressFromString("") 
      }
      let winner = if (secret == extract(getBinary(me, "guess"))) then guesser else creator
 
      

      isValid && payout.recipient == winner
      
  case _ => false

}



  
  
  `).result!).toString('base64')

  const setScriptTx = setScript({ chainId, script: compiledContract }, contractSeed)
  const r = await broadcastAndWait(setScriptTx, 1000 * 60 * 1)
  return r.id
}




