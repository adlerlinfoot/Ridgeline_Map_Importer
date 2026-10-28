import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';import {draft} from './fixture.mjs';
test('loopback server enforces origins, request headers, payloads and returns draft validation',async()=>{
  let calls=0;const server=createServer({analyze:async()=>{calls++;return draft();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const data={mimeType:'image/png',width:1000,height:700,data:Buffer.from([137,80,78,71,13,10,26,10,0,1,2]).toString('base64')};
  const post=(body,headers={})=>fetch(url+'/api/extract',{method:'POST',headers:{'Content-Type':'application/json','X-Ridgeline-Plugin':'map-importer-v1',...headers},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(url+'/api/status')).status,200);
    assert.equal((await post(data,{Origin:'https://untrusted.example'})).status,403);
    assert.equal((await fetch(url+'/api/extract',{method:'POST',body:'{}'})).status,403);
    assert.equal((await post({...data,data:'bad'})).status,400);
    const r=await post(data,{Origin:'http://127.0.0.1:43880'});assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:43880');const value=await r.json();assert.equal(value.draft.reviewed,false);assert.equal(value.validation.errors.length,0);assert.equal(calls,1);
    assert.equal((await fetch(url+'/.git/config')).status,404);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
