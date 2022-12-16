const fs = require("fs")
const path = require("path")
const { expect } = require("chai")
const ArLocal = require("arlocal").default
let Arweave = require("arweave")
const { WarpFactory, LoggerFactory } = require("warp-contracts")
async function addFunds(arweave, wallet) {
  const walletAddress = await arweave.wallets.getAddress(wallet)
  await arweave.api.get(`/mint/${walletAddress}/1000000000000000`)
}

describe("WeaveDB", function () {
  let wallet,
    walletAddress,
    wallet2,
    db,
    intmaxSrcTxId,
    arweave_wallet,
    arlocal,
    arweave,
    contract,
    warp
  this.timeout(0)

  before(async () => {
    arweave = Arweave.init({
      host: "localhost",
      port: 1820,
      protocol: "http",
    })
    arlocal = new ArLocal(1820, false)
    LoggerFactory.INST.logLevel("error")
    await arlocal.start()
  })

  after(async () => await arlocal.stop())

  beforeEach(async () => {
    arweave_wallet ||= await arweave.wallets.generate()
    await addFunds(arweave, arweave_wallet)
    warp = WarpFactory.forLocal(1820)
    const contractSrc = fs.readFileSync(
      path.join(__dirname, "../dist/contract.js"),
      "utf8"
    )
    let initialState = {
      verify: [],
    }
    contract = await warp.createContract.deploy({
      wallet: arweave_wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
    })
    await arweave.api.get("mine")
    contract = warp.contract(contract.contractTxId).connect(arweave_wallet)
  })

  it("should verify signatures", async () => {
    const wallet = await arweave.wallets.generate()
    const message = "test"
    const signature = (
      await arweave.wallets.crypto.sign(wallet, message)
    ).toString("hex")
    await contract.writeInteraction({
      pubKey: wallet.n,
      message,
      signature,
    })
    expect(
      (await contract.readState()).cachedValue.state.verify[0].valid
    ).to.equal(true)
  })
})
