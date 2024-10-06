import {
    createPostResponse,
    createActionHeaders,
    ActionPostResponse,
    ActionGetResponse,
    ActionPostRequest,
  } from '@solana/actions';
  import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
  } from '@solana/web3.js';

  import CryptoJS, { enc } from "crypto-js";
  
  const { createMemoInstruction } = require('@solana/spl-memo');
  const headers = createActionHeaders();
  import { getKeypairFromEnvironment } from "@solana-developers/helpers";
  const keypair = getKeypairFromEnvironment("SECRET_KEY");

  const senderSecretKey_ = keypair.secretKey;
  
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
  
      const baseHref = new URL(
        `/api/actions/benimHayatim?`,
        requestUrl.origin,
      ).toString();
      const payload: ActionGetResponse = {
        type: 'action',
        title: 'SEN DEGIL ONLAR UYUMASIN',
        icon: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGxzZnV0b3lkdGhyazRnMm96M3hndTJsYms2NTh2MXhocTJnZncweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ro3NT0tIhATcm73Xbh/giphy.gif',
        description:
          'Tamamen Anonim ve Gizli İhbarda Bulunun',
        label: 'Transfer', // this value will be ignored since `links.actions` exists
        links: {
          actions: [
            {
              label: 'Tamamla', // button text
              href: `${baseHref}platform={platformIsmi}&suclu={sucluIsmi}&zaman={zamanMetni}&ihbar={ihbarMetni}`, // this href will have a text input
              parameters: [
                {
                  name: 'platformIsmi', // parameter name in the `href` above
                  label: 'Platform', // placeholder of the text input
                  required: true,
                },
                {
                  name: 'sucluIsmi', // parameter name in the `href` above
                  label: 'Suclu Adı veya Platformdaki Adı', // placeholder of the text input
                  required: true,
                },
                {
                  name: 'zamanMetni', // parameter name in the `href` above
                  label: 'Ne Zaman(Ay - Yıl)', // placeholder of the text input
                  required: true,
                },
                {
                  name: 'ihbarMetni', // parameter name in the `href` above
                  label: 'Ihbar', // placeholder of the text input
                  required: true,
                },
              ],
            },
          ],
        },
      };
  
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      let message = 'An unknown error occurred';
      if (typeof err == 'string') message = err;
      return new Response(message, {
        status: 400,
        headers,
      });
    }
  };
  
  // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
  // THIS WILL ENSURE CORS WORKS FOR BLINKS
  export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
  };
  
  export const POST = async (req: Request) => {
    
    try {
      let toPubkey = new PublicKey(
        'AHLtTSyn4wT9FipJRQYekS2JapZmvix6eaC1josdJsbh',
      );
      const requestUrl = new URL(req.url);
      const { platformIsmi, sucluIsmi, zamanMetni, ihbar } = validatedQueryParams(requestUrl);
      const body: ActionPostRequest = await req.json();
  
      // validate the client provided input
      let account: PublicKey;
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl('mainnet-beta'),
      );
      // const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
  
      // ensure the receiving account will be rent exempt
      // const minimumBalance = await connection.getMinimumBalanceForRentExemption(
      //   0, // note: simple accounts that just store native SOL have `0` bytes of data
      // );
      // if (0.001 * LAMPORTS_PER_SOL < minimumBalance) {
      //   throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
      // }
  
      // create an instruction to transfer native SOL from one wallet to another
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: 0 * LAMPORTS_PER_SOL,
      });
      let memo =  `Platform : ${platformIsmi}| Suclu: ${sucluIsmi} | Zaman: ${zamanMetni} | Ihbar: ${ihbar}`;
      let encryptedMessage = encryptMessage(memo, Buffer.from(senderSecretKey_).toString('hex'));
      const cMI = createMemoInstruction(encryptedMessage, [account])
      // get the latest blockhash amd block height
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
  
      // create a legacy transaction
      const transaction = new Transaction({
        feePayer: account,
        blockhash,
        lastValidBlockHeight,
      }).add(cMI);
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: `İhbarınız başarıyla iletildi`,
        },
        // note: no additional signers are needed
        // signers: [],
      });
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      let message = 'An unknown error occurred';
      if (typeof err == 'string') message = err;
      return new Response(message, {
        status: 400,
        headers,
      });
    }
  };
  
  function validatedQueryParams(requestUrl: URL) {

    let ihbar: string = "ihbar";
    let sucluIsmi: string = "sucluIsmi";
    let zamanMetni: string = "zamanMetni";
    let platformIsmi: string = "platformIsmi";

    try {
      if (requestUrl.searchParams.get('platform')) {
        platformIsmi = requestUrl.searchParams.get('platform')!;
      }
  
      if (platformIsmi.length <= 0) throw 'platformIsmi is invalid';
    } catch (err) {
      throw 'Invalid input query parameter: platformIsmi';
    }

    try {
      if (requestUrl.searchParams.get('suclu')) {
        sucluIsmi = requestUrl.searchParams.get('suclu')!;
      }
  
      if (sucluIsmi.length <= 0) throw 'sucluIsmi is invalid';
    } catch (err) {
      throw 'Invalid input query parameter: sucluIsmi';
    }

    try {
      if (requestUrl.searchParams.get('zaman')) {
        zamanMetni = requestUrl.searchParams.get('zaman')!;
      }
  
      if (zamanMetni.length <= 0) throw 'zamanMetni is invalid';
    } catch (err) {
      throw 'Invalid input query parameter: zamanMetni';
    }
    
    try {
      if (requestUrl.searchParams.get('ihbar')) {
        ihbar = requestUrl.searchParams.get('ihbar')!;
      }
  
      if (ihbar.length <= 0) throw 'ihbar is invalid';
    } catch (err) {
      throw 'Invalid input query parameter: ihbar';
    }
  
    return {
      platformIsmi,
      sucluIsmi,
      zamanMetni,
      ihbar,
    };
  }
  
  // Function to encrypt a message
function encryptMessage(message: string, secretKey: string): string {
  // Encrypt message using AES
  const ciphertext = CryptoJS.AES.encrypt(message, secretKey).toString();
  return ciphertext;
}

// Function to decrypt the message
function decryptMessage(ciphertext: string, secretKey: string): string {
  // Decrypt message using AES
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
  const originalMessage = bytes.toString(CryptoJS.enc.Utf8);
  return originalMessage;
}