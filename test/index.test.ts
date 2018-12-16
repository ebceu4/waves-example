import { address, base58encode, concat, publicKey, base58decode, sha256 } from 'waves-crypto'
import { randomBytes } from 'crypto'
import { deployContract } from '../src/makeContract'
import { transfer, data } from 'waves-transactions'
import { broadcastAndWait } from '../src/api'

const player1Seed = '72edd7aa46d441908a7a9874d067b61b37f01fb4d54d46b5aa70362e19d7c0da'
const player1Address = address(player1Seed, 'T') //'3N3HaozS4UgUkFGjcdJ9bWmBPciDXrAv7pL'

const player2Seed = 'a8f30217d9b9422b9265d148231f2359b918b176491446949c9154a129b6de2e'
const player2Address = address(player2Seed, 'T') //3MqWK1M697uP71n2ebeusFGBxYf2fbckgTz

const createGame = async (playerAddress: string, playerSeed: string, secretNumber: number) => {
  const salt = randomBytes(31)
  const c = concat([secretNumber], salt)
  console.log(c)
  const sha = sha256(c)
  console.log(sha)
  const secretHash = base58encode(sha)
  const secret = concat([secretNumber], salt)
  const contractSeed = randomBytes(32).toString('hex')
  const contractAddress = address(contractSeed, 'T')
  const contractPublicKey = publicKey(contractSeed)

  const transferTx = transfer({ recipient: contractAddress, amount: 100000000 }, playerSeed)
  await broadcastAndWait(transferTx, 1000 * 60 * 2)
  console.log('Transfer from player 1 completed')
  await deployContract(playerAddress, secretHash, contractSeed)
  console.log('Contract deployed, contract: ' + contractAddress)

  return { contractAddress, contractPublicKey, secret }
}

jest.setTimeout(1000 * 60 * 10)

// it("moneyback denied as game started", async () => {
//   const { contractAddress, contractPublicKey } = await createGame(player1Address, player1Seed, 1)

//   const moneyBackTx = transfer({ amount: 100000000 / 2, recipient: player1Address, senderPublicKey: contractPublicKey })

//   try {
//     await broadcastAndWait(moneyBackTx)
//   } catch (error) {
//     expect(error.response.data.message).toEqual('Transaction is not allowed by account-script')
//   }

// })

it("sunny day", async () => {
  const { contractAddress, contractPublicKey, secret } = await createGame(player1Address, player1Seed, 67)

  const player2Payment = transfer({ recipient: contractAddress, amount: 100000000 }, player2Seed)

  const paymentId = (await broadcastAndWait(player2Payment)).id

  console.log('Player 2 payment completed')

  const dataTx = data({
    data: [
      { key: 'payment', value: base58decode(paymentId) },
      { key: 'guess', value: [67] },
    ],
    fee: 500000,
    senderPublicKey: contractPublicKey
  })

  try {
    await broadcastAndWait(dataTx)
  } catch (error) {
    console.log(error)
  }


  console.log('Player 2 guess done')

  const payoutTx = transfer({
    recipient: player2Address,
    amount: 198500000 - 500000,
    senderPublicKey: contractPublicKey,
    fee: 500000
  })

  payoutTx.proofs = [base58encode(secret)]

  try {
    await broadcastAndWait(payoutTx)
  } catch (error) {
    console.log(JSON.stringify(error.response.data))
  }

  console.log('Payout completed')


})

