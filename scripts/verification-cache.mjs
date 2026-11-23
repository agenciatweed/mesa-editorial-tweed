import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,json,atomic,locked,digest} from './project.mjs';
export async function verificationFingerprint(manifest,base=root){
 if(!Array.isArray(manifest.files)||!manifest.files.length)throw Error('Informe arquivos de entrada da verificação.');
 const files=[];
 for(const file of [...new Set(manifest.files)].sort())files.push({file,sha256:digest(await readFile(path.resolve(base,file)))});
 return digest({files,context:manifest.context||{}});
}
export function reusable(entry,inputSha256,evidenceSha256,at=Date.now()){
 return !!entry&&entry.inputSha256===inputSha256&&entry.evidenceSha256===evidenceSha256&&at>=Date.parse(entry.checkedAt)&&at-Date.parse(entry.checkedAt)<entry.maxAgeHours*3600000;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,label,manifestFile,evidenceFile]=process.argv.slice(2);
 if(!['check','record'].includes(command)||!/^[a-z0-9][a-z0-9-]{0,90}$/.test(label||'')||/(?:ftp|http|deploy|publish|approval)/.test(label))throw Error('Cache apenas de pesquisa, análise e validação local; nunca de aprovação ou envio.');
 await locked(async()=>{
  const manifest=JSON.parse(await readFile(manifestFile,'utf8')),inputSha256=await verificationFingerprint(manifest);
  const state=await json('.local/verification-cache.json',{version:1,entries:{}}),entry=state.entries[label];
  if(command==='check'){
   let evidenceSha256=null;try{if(entry)evidenceSha256=digest(await readFile(entry.evidenceFile))}catch(e){if(e.code!=='ENOENT')throw e}
   console.log(JSON.stringify({reuse:reusable(entry,inputSha256,evidenceSha256),inputSha256,evidenceFile:entry?.evidenceFile}));return;
  }
  const data=await readFile(evidenceFile),proof=JSON.parse(data),maxAgeHours=manifest.maxAgeHours??24;
  if(proof.status!=='passed'||proof.inputSha256!==inputSha256||!Number.isFinite(Date.parse(proof.checkedAt))||Date.parse(proof.checkedAt)>Date.now()+300000||!(maxAgeHours>0&&maxAgeHours<=720))throw Error('Evidência inválida, obsoleta ou sem validade definida.');
  state.entries[label]={inputSha256,evidenceFile:path.resolve(evidenceFile),evidenceSha256:digest(data),checkedAt:proof.checkedAt,maxAgeHours};
  await atomic('.local/verification-cache.json',state);console.log(JSON.stringify({recorded:true,label}));
 });
}
