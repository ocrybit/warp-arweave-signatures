import { useEffect, Fragment, useState } from "react"
import {
  Checkbox,
  Image,
  Select,
  ChakraProvider,
  Box,
  Flex,
  Input,
  Textarea,
} from "@chakra-ui/react"

import { map } from "ramda"
import Arweave from "arweave"
const { WarpFactory, LoggerFactory } = require("warp-contracts")
async function addFunds(arweave, wallet) {
  const walletAddress = await arweave.wallets.getAddress(wallet)
  await arweave.api.get(`/mint/${walletAddress}/1000000000000000`)
  await arweave.api.get("mine")
}
import { Buffer } from "buffer"
import { contractTxId } from "/lib/contractTxId.json"
let warp, arweave

const _verify = async data => {
  for (let v of data) {
    const enc = new TextEncoder()
    const encoded = enc.encode(v.message)
    const valid = await arweave.crypto.verify(
      v.pubKey,
      encoded,
      Buffer.from(v.signature, "hex")
    )
    v.valid_web = valid
    v.valid_node = v.valid
  }
  return data
}

export default () => {
  const [verify, setVerify] = useState([])
  const [message, setMessage] = useState("")
  useEffect(() => {
    ;(async () => {
      window.Buffer = Buffer
      arweave = Arweave.init({
        host: "localhost",
        port: 1820,
        protocol: "http",
      })
      const arweave_wallet = await arweave.wallets.generate()
      await addFunds(arweave, arweave_wallet)
      warp = WarpFactory.forLocal(1820)
        .contract(contractTxId)
        .connect(arweave_wallet)
      setInterval(async () => {
        let data = (await warp.readState()).cachedValue.state.verify
        setVerify(await _verify(data))
      }, 1000)
    })()
  }, [])
  return (
    <ChakraProvider>
      <Flex justify="center" fontSize="10px" m={3}>
        <Box>
          <Flex w="750px" mx={3} p={2} bg="#eee">
            <Flex mx={3} flex={1} justify="center">
              Message
            </Flex>
            <Flex mx={3} flex={1} justify="center">
              PublicKey
            </Flex>
            <Flex mx={3} flex={1} justify="center">
              Signature
            </Flex>
            <Flex mx={3} flex={1} justify="center">
              Valid in Browser
            </Flex>
            <Flex mx={3} flex={1} justify="center">
              Valid in Contract
            </Flex>
            <Flex mx={3} flex={1} justify="center">
              Signed Environment
            </Flex>
          </Flex>
          {map(v => {
            return (
              <Flex w="750px" mx={3} sx={{ borderTop: "#ccc 1px solid" }} p={2}>
                <Flex mx={3} flex={1} justify="center">
                  {v.message}
                </Flex>
                <Flex mx={3} flex={1} justify="center" title={v.pubKey}>
                  {v.pubKey.slice(0, 5)}...{v.pubKey.slice(-5)}
                </Flex>
                <Flex mx={3} flex={1} justify="center" title={v.pubKey}>
                  {v.signature.slice(0, 5)}...{v.signature.slice(-5)}
                </Flex>
                <Flex
                  mx={3}
                  flex={1}
                  justify="center"
                  color={v.valid_web ? "green" : "red"}
                >
                  {JSON.stringify(v.valid_web)}
                </Flex>
                <Flex
                  mx={3}
                  flex={1}
                  justify="center"
                  color={v.valid_node ? "green" : "red"}
                >
                  {JSON.stringify(v.valid_node)}
                </Flex>
                <Flex mx={3} flex={1} justify="center">
                  {v.src}
                </Flex>
              </Flex>
            )
          })(verify)}
        </Box>
      </Flex>
      <Flex justify="center" m={3}>
        <Input
          placeholder="Message to Sign"
          value={message}
          onChange={e => setMessage(e.target.value)}
          w="300px"
          sx={{ borderRadius: "3px 0 0 3px" }}
        />
        <Flex
          align="center"
          sx={{
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
            borderRadius: "0 3px 3px 0",
          }}
          py={1}
          px={4}
          bg="#eee"
          onClick={async () => {
            if (/^\s*$/.test(message)) {
              alert("enter message")
              return
            }
            const wallet = window.arweaveWallet
            await wallet.connect([
              "SIGNATURE",
              "ACCESS_PUBLIC_KEY",
              "ACCESS_ADDRESS",
            ])
            let addr = await wallet.getActiveAddress()
            const pubKey = await wallet.getActivePublicKey()
            const enc = new TextEncoder()
            const encoded = enc.encode(message)
            const sig = await wallet.signature(encoded, {
              name: "RSA-PSS",
              saltLength: 32,
            })
            const signature = Buffer.from(sig).toString("hex")
            const isValid = await arweave.crypto.verify(
              pubKey,
              encoded,
              Buffer.from(signature, "hex")
            )
            await warp.writeInteraction({
              pubKey,
              message,
              signature,
              src: "Browser",
            })
            setMessage("")
            let data = (await warp.readState()).cachedValue.state.verify
            setVerify(await _verify(data))
          }}
          justify="center"
        >
          Sign
        </Flex>
      </Flex>
    </ChakraProvider>
  )
}
