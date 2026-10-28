import http from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join,extname} from 'node:path';
import {analyzeImage} from './lib/vision.mjs';
import {validateDraft} from './public/core.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
export function createServer({analyze=analyzeImage}={}){
  let busy=false;const attempts=[];
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin,allowed=new Set(['http://127.0.0.1:43881','http://localhost:43881','http://127.0.0.1:43880','http://localhost:43880']);
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(origin&&!allowed.has(origin)){send(403,{error:'Only the local importer and Ridgeline may access this service.'});return;}
    if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host??'')){send(403,{error:'Invalid local host'});return;}
    if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; frame-ancestors http://127.0.0.1:43880 http://localhost:43880");
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Ridgeline-Plugin'});res.end();return;}
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/status'){let installed=true;try{await access(process.env.KIRO_CLI_PATH??join(process.env.LOCALAPPDATA??'','Kiro-Cli','kiro-cli.exe'));}catch{installed=false;}send(200,{plugin:'ridgeline-map-importer',version:'1.0.0',kiroInstalled:installed,busy});return;}
    if(req.method==='POST'&&url.pathname==='/api/extract'){
      if(req.headers['x-ridgeline-plugin']!=='map-importer-v1'||!req.headers['content-type']?.startsWith('application/json')){send(403,{error:'Missing plugin request headers'});return;}
      let size=0,chunks=[];try{for await(const chunk of req){size+=chunk.length;if(size>4500000)throw new Error('Image request too large (3MB image maximum)');chunks.push(chunk);}}catch(e){send(413,{error:e.message});return;}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{send(400,{error:'Invalid JSON'});return;}
      const {data,mimeType,width,height}=body;
      if(!['image/png','image/jpeg','image/webp'].includes(mimeType)||typeof data!=='string'||data.length>4200000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||!Number.isInteger(width)||!Number.isInteger(height)||width<10||height<10||width>2400||height>2400){send(400,{error:'Use a PNG/JPEG/WebP image resized to at most 2400 pixels and 3MB.'});return;}
      const bytes=Buffer.from(data,'base64'),valid=mimeType==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mimeType==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      if(!valid||bytes.length>3150000){send(400,{error:'Invalid image bytes'});return;}
      if(busy){send(409,{error:'One map is already being analyzed. Wait or cancel it first.'});return;}
      const now=Date.now();while(attempts.length&&attempts[0]<now-3600000)attempts.shift();if(attempts.length>=12){send(429,{error:'Hourly image-analysis limit reached (12).'});return;}
      busy=true;attempts.push(now);const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
      try{const draft=await analyze({data,mimeType,width,height},{signal:controller.signal});draft.reviewed=false;if(draft.width!==width||draft.height!==height){draft.uncertainties=Array.isArray(draft.uncertainties)?draft.uncertainties:[];draft.uncertainties.push({id:'DIMENSIONS',message:'Agent draft dimensions differ from the supplied image. Correct coordinates/dimensions against the overlay.',severity:'blocking',resolved:false});}send(200,{draft,validation:validateDraft(draft)});}catch(e){if(!res.destroyed)send(502,{error:e.message});}finally{busy=false;}return;
    }
    if(req.method!=='GET'){send(405,{error:'Method not allowed'});return;}
    const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    if(!/^(index\.html|styles\.css|app\.mjs|core\.mjs|example\.json|example\.png)$/.test(name)){send(404,{error:'Not found'});return;}
    try{const bytes=await readFile(join(here,'public',name));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.png':'image/png'}[extname(name)],'Cache-Control':'no-store'});res.end(bytes);}catch{send(404,{error:'Not found'});}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(Number(process.env.PORT??43881),'127.0.0.1',()=>console.log('Map importer: http://127.0.0.1:43881/'));
