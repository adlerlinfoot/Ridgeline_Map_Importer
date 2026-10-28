import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../server.mjs';
test('explicit cancellation stops the matching analysis and permits retry; early cancellation prevents startup',async()=>{
 let calls=0,started;const ready=new Promise(r=>started=r);const server=createServer({analyze:async(_,{signal})=>{calls++;started();await new Promise((_,reject)=>signal.addEventListener('abort',()=>setTimeout(()=>reject(new Error('cancelled')),30),{once:true}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const post=(path,body)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json','X-Ridgeline-Plugin':'map-importer-v1'},body:JSON.stringify(body)});
 const body={jobId:'test-job',mimeType:'image/png',width:1000,height:700,data:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')};
 try{const work=post('/api/extract',body);await ready;await post('/api/cancel',{jobId:'other'});assert.equal((await (await fetch(url+'/api/status')).json()).busy,true);assert.equal((await post('/api/cancel',{jobId:body.jobId})).status,200);assert.equal((await work).status,502);assert.equal((await (await fetch(url+'/api/status')).json()).busy,false);await post('/api/cancel',{jobId:'early'});assert.equal((await post('/api/extract',{...body,jobId:'early'})).status,409);assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
