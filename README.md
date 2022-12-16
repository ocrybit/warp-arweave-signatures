# Warp-Arweave Signature Bug

This repo is to demonstrate a strange behaviour when verifying Arweave signatures in Warp contracts.

## The Strange Problem

Signatures made in the NodeJS environment failed to be verified in warp contracts in browser, but the same signatures can be successfully verified in browser outside the warp contracts, in NodeJS, and in nodejs warp contracts. So they fail to be verified only in browser warp contracts.

Strangely, signatures made in browser can be verified in both browser warp contracts and nodejs warp contracts as well as anywhere outside the warp contracts.

| Signed Environment | Browser | Browser Warp | NodeJS | NodeJS Warp |
| --- | --- | --- | --- | --- |
| Browser | True | True | True | True |
| NodeJS | True | False | True | True |

## How to Reproduce

Clone the repo and run ArLocal and REPL. It auto-deploys a warp contract.

```bash            
git clone https://github.com/ocrybit/warp-arweave-signatures.git
cd warp-arweave-signatures
yarn
yarn run
```

In another terminal, start the local app.

```bash
cd warp-arweave-signatures
yarn dev
```

Now the app is running at [localhost:3000](http://localhost:3000).

You can sign messages from the browser app and the command-line REPL, and see if the signatures are successfully verified in the different environments.

## The Contract

It's a fairly simple warp contract to just verify a signature and record the validity.

```javascript
export async function handle(state, action) {
  try {
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
```
