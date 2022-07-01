import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home(){
  //Create a bigNumber
  const zero = BigNumber.from(0);

  //walletConnect, tracks if user is connected
  const [walletConnected, setWalletConnect] = useState(false);

  //loading, set to true when waiting for trx to mine
  const [loading, setLoading] = useState(false);

  //tokensToBeClaimed, keeps tracks of claimable tokens 
  //based on the users nft not used to claim yet
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);

  //balanceOfCryptoDevsTokens, keeps track of the number of tokens held by an address
  const [balanceOfCryptoDevsTokens, setBalanceOfCryptoDevsTokens] = useState(zero);

  //tokenAmount, amount of tokens users wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);

  //tokensMinted, number of tokens minted out of supply 10000
  const [tokensMinted, setTokensMinted] = useState(zero);

  //isOwner, get owner of contract 
  const [isOwner, setIsOwner] = useState(false);

  //create a reference for web3modal
  const web3ModalRef = useRef();


  const getProviderOrSigner = async (needSigner = false) => {
    //connect to metamask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    //check if user is connected t the right network(rinkeby)
    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 4) {
      window.alert("Please connect to the right network!");
      throw new Error("Change to rinkeby network");
    }

    if(needSigner){
      const signer =  web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  }

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnect(true);
    } catch (error) {
      console.error(error);
    }
  }

  const getOwner = async () => {
    try {
      //get provider and signer
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);

      //get tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      //get owner by calling owner function in tokenContract and address of current signer
      const _owner = await tokenContract.owner();
      const address = await signer.getAddress();

      //check if _owner === address
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (error) {
      console.error(error);
    }
    
  }

  const withdrawCoins = async () => {
    try {
      //get signer
      const signer = await getProviderOrSigner(true);

      //instance of tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      const tx = await tokenContract.withdraw();

      //set loading to true
      setLoading(true);
      await tx.wait();//waiting for tx to mine
      //set loading to false
      setLoading(false);
      await getOwner();

    } catch (error) {
      console.error(error);
    }
  }

  const getTotalTokensMinted = async () => {
    try {
      //get provider
      const provider = await getProviderOrSigner(true);

      //instance of tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      //tokensMinted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);

    } catch (error) {
      console.error(error)
    }
  }

  const getTokensToBeClaimed = async () => {
    try {
      //get provider and signer
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);

      //create instances of nft and token contracts
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);

      //get the current signed in user address and use it to check their token balance
      const address = await signer.getAddress();
      const balance = await nftContract.balanceOf(address);

      //check value of balance if 0 set setTokensToBeClaimed to 0
      if (balance !== zero) {
        //amount, keeps track of number of unclaimed tokens
        var amount = 0;

        //check if NFT has been used to claim token
        for(var i = 0; i < balance; i++){
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);

          //if !claimed is true increment value of amount
          if (!claimed) {
            amount++
          }
        }
        //setTokensToBeClaimed value, convert to big number 
        setTokensToBeClaimed(BigNumber.from(amount));
      } else {
        setTokensToBeClaimed(zero);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const getBalanceOfCryptoDevTokens = async () => {
    try {
      //get the provider and signer
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);

      //get instance of tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      //get address of user and their balance from the tokenContract instance
      const address = await signer.getAddress();
      const balance = await tokenContract.balanceOf(address);

      //setBalanceOfCryptoDevsTokens, balance is already a big number
      setBalanceOfCryptoDevsTokens(balance);
    } catch (error) {
      console.error(error);
      setBalanceOfCryptoDevsTokens(zero);
    }
  }

  const mintCryptoDevToken = async (amount) => {
    try {
      //get signer and create instance of tokenContract
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      //a token cost 0.001 ether, therefore 
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {value: utils.parseEther(value.toString())});

      //set loading to true
      setLoading(true);
      await tx.wait();//waiting for tx to mine
      //set loading to false
      setLoading(false);

      var msg = "Successfully minted ${amount} Crypto Devs Tokens"
      window.alert(msg);

      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();

    } catch (error) {
      console.error(error);
    }
  }

  const claimCryptoDevToken = async () => {
    try {
      //get signer and create instance of tokenContract
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      //tx to claim tokens
      const tx = await tokenContract.claim();

      //set loading to true
      setLoading(true);
      await tx.wait();//waiting for tx to mine
      //set loading to false
      setLoading(false);

      window.alert("Successfully claimed Crypto Devs Tokens");

      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
      
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      });

      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
      withdrawCoins();
    }
  },[walletConnected]);

  const renderButton = () => {
    if (loading) {
      return(
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }

    if (walletConnected && isOwner) {
      return(
        <div>
          <button className={styles.button} onClick={withdrawCoins}>
            Withdraw Coins
          </button>
        </div>
      )
    }

    if (tokensToBeClaimed > 0) {
      return(
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed
          </div>
          <button className={styles.button} onClick={claimCryptoDevToken}>
            Claim Tokens
          </button>
        </div>
      )
    }

    return(
      <div style={{display: "flex-col"}}>
        <div>
          <input type="number" placeholder="Amount of tokens" onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
          className={styles.input} />
        </div>

        <button className={styles.button} onClick={() => mintCryptoDevToken(tokenAmount)} disabled={!(tokenAmount > 0)}>
          Mint Tokens
        </button>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevsTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );

}