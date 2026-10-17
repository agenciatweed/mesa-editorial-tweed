import http from 'node:http';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
import {randomBytes} from 'node:crypto';
import {root,canonical,digest,validId,validate,ready,locked,json,atomic,project,saveContent,enqueue,snapshot,reconcile,reviewReady,briefReady,published} from './project.mjs';
const studio=await realpath(path.join(root,'studio')),token=randomBytes(32).toString('hex');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const port=Number(process.env.TWEED_PORT||4173),origin='http://127.0.0.1:'+port;
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>18e6)throw Error('Envio excede 18 MB.');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
const server=http.createServer(async(req,res)=>{try{
 if(req.headers.host!=='127.0.0.1:'+port){reply(res,403,{error:'Host inválido.'});return}
 const url=new URL(req.url,origin),p=decodeURIComponent(url.pathname);
 if(req.method==='POST'&&(req.headers.origin!==origin||req.headers['x-tweed-token']!==token)){reply(res,403,{error:'Abra o painel pelo endereço local.'});return}
 if(p==='/api/project'&&req.method==='GET'){reply(res,200,{...await project(),token,root,queue:await json('editorial/fila.json',{version:1,jobs:[]})});return}
 if(p==='/api/project'&&req.method==='POST'){const input=await body(req);await locked(async()=>{const old=await project();if(input.revision!==old.revision)throw Object.assign(Error('Os arquivos mudaram. Reabra o painel para conciliar; sua cópia permanece no navegador.'),{status:409});validate(input.doc);const queue=await json('editorial/fila.json',{version:1,jobs:[]});
 for(const before of old.doc.items.filter(published)){if(!input.doc.items.some(i=>i.id===before.id))throw Error('Artigos publicados fazem parte do histórico e não podem ser removidos.');}
 for(const item of input.doc.items){const before=old.doc.items.find(i=>i.id===item.id);
  if(before&&published(before)){if(snapshot(item)!==snapshot(before))throw Error('O histórico publicado é somente leitura.');Object.assign(item,before);continue}
  if((before&&item.status!==before.status)||(!before&&item.status!=='Pauta'))throw Error('Use o botão Salvar da etapa para avançar.');
  item.logo=canonical+'/assets/logo_tweed_teal.svg';item.author=canonical+'/#agencia';item.publication=before?.publication;item.automation=before?.automation;item.submitted=before?.submitted||false;item.workflowVersion=before?.workflowVersion;
  if(input.reopen===item.id){if(item.status!=='Pronto')throw Error('Só Pronto pode voltar para revisão.');item.status='Revisão';item.publication={state:'cancelled'};item.checks={};}
  if(input.advance===item.id){
   item.workflowVersion=2;item.submitted=true;
   if(item.status==='Pauta'){briefReady(item);}
   else if(item.status==='Redação'){if(!['body','sources','prompt'].every(k=>item[k]?.trim()))throw Error('A redação precisa de texto, fontes/notas e prompt da capa.');item.status='Revisão';item.automation={...item.automation,reviewKey:undefined,stage:'Revisão',state:'pending'};item.checks={};}
   else if(item.status==='Revisão'){if(!reviewReady(item))throw Error('Aguarde a luz verde da revisão automática antes de aprovar.');item.status='Pronto';item.checks={thesis:true,facts:true,voice:true,privacy:true};item.date=item.date||new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});ready(item);item.publication={state:'queued',approvedAt:new Date().toISOString()};}
   else throw Error('Este artigo já aguarda publicação.');
  }
  if(before?.status==='Pronto'&&!input.reopen&&snapshot(item)!==snapshot(before))throw Error('Volte para Revisão antes de alterar um artigo aprovado.');
 }
 await reconcile(input.doc,queue,{retryId:input.retry||input.advance});
 await mkdir(path.join(root,'backups'),{recursive:true});await atomic('backups/antes-salvar-'+Date.now()+'.json',old.doc);await saveContent(input.doc);await atomic('editorial/fila.json',queue);reply(res,200,{revision:digest(input.doc),queue,doc:input.doc});});return}
 if(p==='/api/request'&&req.method==='POST'){reply(res,400,{error:'Use o botão Salvar da etapa. As ações do GPT agora são automáticas.'});return}
 if(p==='/api/image'&&req.method==='POST'){const input=await body(req);if(!validId(input.itemId))throw Error('Pauta inválida.');const current=await project();const item=current.doc.items.find(i=>i.id===input.itemId);if(!item||published(item)||item.status!=='Revisão'||!reviewReady(item))throw Error('Envie a capa quando a revisão estiver com luz verde.');const data=Buffer.from(input.data||'','base64');if(data.length<20||data.length>12e6)throw Error('Escolha uma imagem de até 12 MB.');const ext=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':data[0]===255&&data[1]===216&&data[2]===255?'jpg':data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)throw Error('Use PNG, JPEG ou WebP.');const file='conteudos/'+input.itemId+'/imagens/'+digest(data)+'.'+ext;await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),data,{flag:'w'});const inspected=await run('python',[path.join(root,'scripts/inspect-image.py'),path.join(root,file)]);const dimensions=JSON.parse(inspected.stdout);reply(res,200,{file,preview:'/media/'+file,...dimensions});return}
 if(!['GET','HEAD'].includes(req.method)){reply(res,405,{error:'Método inválido.'});return}
 const media=p.startsWith('/media/');if(media&&!/^\/media\/conteudos\/[a-zA-Z0-9_-]+\/imagens\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(p))throw Error('Imagem inválida.');const base=media?root:studio;const rel=media?p.slice(7):p==='/'?'index.html':p.replace(/^\/+/, '');const absolute=await realpath(path.resolve(base,rel));if(!absolute.startsWith(base+path.sep)){reply(res,403,{error:'Caminho inválido.'});return}const data=await readFile(absolute);res.writeHead(200,{'Content-Type':types[path.extname(absolute)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){reply(res,e.status||400,{error:e.code==='ENOENT'?'Arquivo não encontrado.':e.message})}});
server.on('error',e=>{console.error('Não foi possível abrir o estúdio:',e.message);process.exitCode=1});server.listen(port,'127.0.0.1',()=>console.log('Estúdio Tweed: '+origin+'\nArquivos em '+root+'\nCtrl+C encerra.'));
