let Arweave = require("arweave")
const { repeat } = require("ramda")
const readline = require("readline")
const { stdin: input, stdout: output } = require("process")
const rl = readline.createInterface({ input, output })
const fs = require("fs")
const path = require("path")
const { WarpFactory, LoggerFactory } = require("warp-contracts")
const ArLocal = require("arlocal").default

async function addFunds(arweave, wallet) {
  const walletAddress = await arweave.wallets.getAddress(wallet)
  await arweave.api.get(`/mint/${walletAddress}/1000000000000000`)
}

let arweave, contract, arweave_wallet
let off
let len = 0
let init = false

async function main() {
  LoggerFactory.INST.logLevel("error")
  arweave = Arweave.init({
    host: "localhost",
    port: 1820,
    protocol: "http",
  })
  const arlocal = new ArLocal(1820, false)
  await arlocal.start()
  arweave_wallet = await arweave.wallets.generate()
  await addFunds(arweave, arweave_wallet)
  const warp = WarpFactory.forLocal(1820)
  const contractSrc = fs.readFileSync(
    path.join(__dirname, "../dist/contract.js"),
    "utf8"
  )
  let initialState = {
    verify: [],
  }
  const tx = await warp.createContract.deploy({
    wallet: arweave_wallet,
    initState: JSON.stringify(initialState),
    src: contractSrc,
  })
  await arweave.api.get("mine")
  contract = WarpFactory.forLocal(1820)
    .contract(tx.contractTxId)
    .connect(arweave_wallet)
  const walletAddress = await arweave.wallets.getAddress(arweave_wallet)

  console.log()
  console.log(`Arweave Wallet: ` + walletAddress)
  console.log()
  console.log(`New test instance deployed`)

  fs.writeFileSync(
    path.resolve(__dirname, "../browser/lib/contractTxId.json"),
    JSON.stringify({ contractTxId: tx.contractTxId })
  )
  off = setInterval(async () => {
    await read()
  }, 1000)

  waitForCommand()
}

async function read(prompt = true) {
  const data = (await contract.readState()).cachedValue.state.verify
  if (data.length === len) return
  len = data.length
  console.log()
  if (prompt) console.log()

  console.log(
    " Message            | PublicKey          | Signature          | Valid in NodeJS    | Valid in Contract  | Signed Environment "
  )
  console.log(
    " ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ "
  )
  const pad = txt => {
    return txt.slice(0.18) + repeat(" ", 18 - txt.slice(0, 18).length).join("")
  }
  for (let v of data) {
    const enc = new TextEncoder()
    const encoded = enc.encode(v.message)
    const valid = await arweave.crypto.verify(
      v.pubKey,
      encoded,
      Buffer.from(v.signature, "hex")
    )
    console.log(
      ` ${pad(v.message)} | ${pad(
        v.pubKey.slice(0, 5) + "..." + v.pubKey.slice(-5)
      )} | ${pad(
        v.signature.slice(0, 5) + "..." + v.signature.slice(-5)
      )} | ${pad(JSON.stringify(valid))} | ${pad(JSON.stringify(v.valid))} | ${
        v.src
      } `
    )
  }
  if (prompt) {
    console.log()
    process.stdout.write("> Message to Sign: ")
  }
}

function waitForCommand() {
  console.log()
  rl.question("> Message to Sign: ", async message => {
    const signature = (
      await arweave.crypto.sign(arweave_wallet, message)
    ).toString("hex")
    await contract.writeInteraction({
      pubKey: arweave_wallet.n,
      message,
      signature,
      src: "NodeJS",
    })
    try {
      off()
    } catch (e) {}
    off = setInterval(async () => {
      await read()
    }, 1000)
    await read(false)
    waitForCommand()
  })
}

main()
