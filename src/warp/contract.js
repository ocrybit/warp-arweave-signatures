export async function handle(state, action) {
  try {
    const crypto = SmartWeave.arweave.wallets.crypto
    const { pubKey, message, signature, src } = action.input
    const enc = new TextEncoder()
    const encoded = enc.encode(message)
    const valid = await SmartWeave.arweave.crypto.verify(
      pubKey,
      encoded,
      Buffer.from(signature, "hex")
    )
    state.verify.push({ pubKey, message, signature, valid, src })
  } catch (e) {
    console.log(e)
    throw new ContractError("verify error")
  }
  return { state }
}
