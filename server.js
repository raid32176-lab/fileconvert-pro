const express=require("express");const path=require("path");const app=express();
app.use(express.json({limit:"1mb"}));app.use(express.static(path.join(__dirname,"public")));
const PORT=process.env.PORT||3000;
const WALLET=process.env.SOLANA_WALLET_ADDRESS||"D2PsMM1zrZJYypyhtAKMpSLGtsZrUDa2xmNtZ2JxAyxh";
const RPC=process.env.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com";
const MINT=process.env.USDT_SOLANA_MINT||"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const RAW=500000n,used=new Set();
async function rpc(method,params){const r=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});if(!r.ok)throw Error("Solana RPC error");let j=await r.json();if(j.error)throw Error(j.error.message||"RPC error");return j.result}
app.get("/api/payment/config",(q,s)=>s.json({currency:"USDT",network:"Solana (SPL)",amount:.5,wallet:WALLET}));
app.post("/api/payment/verify",async(q,s)=>{try{let tx=String(q.body?.txid||"").trim();if(!tx)return s.status(400).json({ok:false,message:"Transaction Signature مطلوب"});if(used.has(tx))return s.status(409).json({ok:false,message:"هذه المعاملة استُخدمت من قبل"});
let t=await rpc("getTransaction",[tx,{encoding:"jsonParsed",commitment:"finalized",maxSupportedTransactionVersion:0}]);if(!t)return s.status(404).json({ok:false,message:"المعاملة غير موجودة أو غير مؤكدة"});if(t.meta?.err)return s.status(400).json({ok:false,message:"المعاملة فاشلة"});
let pre=t.meta?.preTokenBalances||[],post=t.meta?.postTokenBalances||[],m=new Map(),got=0n;
for(let b of pre)if(b.mint===MINT&&b.owner===WALLET)m.set(b.accountIndex,BigInt(b.uiTokenAmount.amount));
for(let b of post)if(b.mint===MINT&&b.owner===WALLET){let a=BigInt(b.uiTokenAmount.amount),before=m.get(b.accountIndex)||0n;if(a>before)got+=a-before}
if(got<RAW)return s.status(400).json({ok:false,message:"لم يتم العثور على تحويل USDT كافٍ إلى محفظة الموقع. المطلوب 0.50 USDT عبر Solana."});
used.add(tx);s.json({ok:true,amount:Number(got)/1e6,txid:tx})}catch(e){console.error(e);s.status(500).json({ok:false,message:e.message||"فشل التحقق"})}});
app.get("*",(q,s)=>s.sendFile(path.join(__dirname,"public","index.html")));app.listen(PORT,()=>console.log("FileConvert Pro on "+PORT));