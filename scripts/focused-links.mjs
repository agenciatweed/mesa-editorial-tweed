import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,json,atomic,locked,digest} from './project.mjs';
export function focusedScope(catalog,checkpoint,lastReviewedAt){
 const unique=[...new Map(catalog.map(a=>[a.slug,a])).values()];
 const pending=unique.filter(a=>checkpoint?.signatures?.[a.slug]!==digest(a)&&(
  !!checkpoint?.signatures?.[a.slug]||Date.parse(a.published)>Date.parse(lastReviewedAt||'1970-01-01T00:00:00Z')));
 return {catalogSha256:digest(unique),slugs:pending.map(a=>a.slug),articles:pending.map(a=>({slug:a.slug,title:a.title,categories:a.categories}))};
}
export async function currentFocusedScope(){
 const site=path.resolve(root,(await json('editorial/integracao.json')).siteRoot);
 const read=async name=>JSON.parse(await readFile(path.join(site,'docs',name),'utf8'));
 const catalog=[...await read('artigos-recuperados.json'),...await read('artigos-editoriais.json')];
 const cycle=await json('.local/link-cycle.json',{}),checkpoint=await json('.local/focused-links.json',{});
 return {catalog,scope:focusedScope(catalog,checkpoint,cycle.lastReviewedAt)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,file]=process.argv.slice(2);
 await locked(async()=>{
  const {catalog,scope}=await currentFocusedScope();
  if(command==='check'){console.log(JSON.stringify(scope));return}
  if(command!=='complete'||!file)throw Error('Use check ou complete EVIDENCIA.json.');
  const proof=JSON.parse(await readFile(file,'utf8'));
  if(!['confirmed','no-changes'].includes(proof.status)||proof.catalogSha256!==scope.catalogSha256||!proof.reason?.trim()||JSON.stringify([...proof.slugs].sort())!==JSON.stringify([...scope.slugs].sort()))throw Error('Avaliação pontual incompleta ou obsoleta.');
  await atomic('.local/focused-links.json',{version:1,completedAt:new Date().toISOString(),catalogSha256:scope.catalogSha256,evidenceSha256:digest(proof),signatures:Object.fromEntries(catalog.map(a=>[a.slug,digest(a)]))});
  console.log(JSON.stringify({completed:true,reviewed:scope.slugs.length}));
 });
}
