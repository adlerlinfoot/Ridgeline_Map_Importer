import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {draft} from '../tests/fixture.mjs';
import test from 'node:test';
let JSDOM;try{({JSDOM}=await import('jsdom'));}catch{}
test('manual editing after upload and cancellation discard late results',{skip:!JSDOM},async()=>{

const dom=new JSDOM(readFileSync('public/index.html','utf8'),{url:'http://127.0.0.1:43881/'}),w=dom.window,blobs=[];
Object.assign(globalThis,{window:w,document:w.document});globalThis.URL.createObjectURL=b=>{blobs.push(b);return 'blob:test'};globalThis.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
w.SVGElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});w.SVGElement.prototype.setPointerCapture=()=>{};
globalThis.fetch=async url=>({ok:true,json:async()=>url==='/api/status'?{kiroInstalled:true}:draft()});
await import('../public/app.mjs');const $=id=>w.document.getElementById(id);
$('example').click();await new Promise(r=>setTimeout(r,10));$('verify').click();assert.match($('status').textContent,/blocked/);assert.match($('validation').textContent,/confirm/);assert.equal($('apply').disabled,true);$('reviewed').checked=true;$('reviewed').dispatchEvent(new w.Event('change'));assert.equal($('apply').disabled,false);$('verify').click();assert.match($('status').textContent,/verified/);$('scale').value='0';$('scale').dispatchEvent(new w.Event('input'));assert.equal($('apply').disabled,true);$('verify').click();assert.match($('validation').textContent,/Invalid physical defaults/);$('scale').value='2';$('scale').dispatchEvent(new w.Event('input'));
const lodge=$('graph').querySelector('[data-node="home"]');lodge.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:500,clientY:650}));$('node-name').value='Custom Lodge';$('node-name').dispatchEvent(new w.Event('change'));assert.equal($('apply').disabled,true);assert.ok($('draft-json').value.includes('Custom Lodge'));
$('graph').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
w.document.querySelector('[data-tool="split"]').click();$('graph').querySelector('[data-edge="WalkA"]').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:300,clientY:600}));assert.equal(JSON.parse($('draft-json').value).nodes.length,8);
$('reviewed').checked=true;$('reviewed').dispatchEvent(new w.Event('change'));assert.equal($('download-map').disabled,false);$('download-map').click();const b=JSON.parse(await blobs[0].text());assert.equal(b.map.lifts.length,3);assert.ok(b.map.nodes.some(n=>n.name==='Custom Lodge'));
// Repeated verification reads pending JSON, removes repaired errors and refreshes assumptions.
const saved=JSON.parse($('draft-json').value),edited=structuredClone(saved);
edited.nodes.forEach(n=>n.elevation_m=null);edited.edges.find(e=>e.kind==='lift').capacity=-1;
$('draft-json').value=JSON.stringify(edited);$('draft-json').dispatchEvent(new w.Event('input'));$('verify').click();
assert.match($('validation').textContent,/Invalid lift capacity/);assert.match($('validation').textContent,/Missing elevations/);
edited.edges.filter(e=>e.kind==='lift').forEach(e=>{e.capacity=600;e.ride_minutes=5;});
// Heights follow the fixture's known downhill geometry.
edited.nodes.forEach(n=>n.elevation_m=1000-n.y);
$('draft-json').value=JSON.stringify(edited);$('draft-json').dispatchEvent(new w.Event('input'));$('verify').click();
assert.doesNotMatch($('validation').textContent,/Invalid lift capacity|Missing elevations|Missing capacities/);
$('draft-json').value=JSON.stringify(saved);$('draft-json').dispatchEvent(new w.Event('input'));$('verify').click();
w.document.querySelector('[data-tool="inspect"]').click();const selection=$('graph').querySelector('[data-node="home"]');selection.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:500,clientY:650}));
$('node-height').value='-1';$('node-height').dispatchEvent(new w.Event('input'));$('verify').click();assert.match($('validation').textContent,/Invalid node elevation/);
$('node-height').value='';$('node-height').dispatchEvent(new w.Event('input'));$('verify').click();assert.doesNotMatch($('validation').textContent,/Invalid node elevation/);
$('graph').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
$('draft-json').value='{broken';$('apply-json').click();assert.ok($('status').classList.contains('error'));
globalThis.createImageBitmap=async()=>({width:1000,height:700,close(){}});
w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});
w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,/9j/';
await $('image-file').onchange({target:{files:[{size:100,name:'manual.jpg'}]}});
assert.equal(JSON.parse($('draft-json').value).nodes.length,0);
w.document.querySelector('[data-tool="node"]').click();
const click=(target,x,y)=>target.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:x,clientY:y}));
click($('graph'),100,100);click($('graph'),300,300);
assert.equal(JSON.parse($('draft-json').value).nodes.length,2);
w.document.querySelector('[data-tool="route"]').click();
click($('graph').querySelector('[data-node="N1"]'),100,100);click($('graph').querySelector('[data-node="N2"]'),300,300);
assert.equal(JSON.parse($('draft-json').value).edges.length,1);
w.document.querySelector('[data-tool="split"]').click();click($('graph').querySelector('[data-edge="E1"]'),200,200);
assert.equal(JSON.parse($('draft-json').value).edges.length,2);
$('delete').click();assert.equal(JSON.parse($('draft-json').value).nodes.length,2);
w.document.querySelector('[data-tool="inspect"]').click();click($('graph').querySelector('[data-node="N1"]'),100,100);
$('graph').dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:150,clientY:130}));$('graph').dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
assert.equal(JSON.parse($('draft-json').value).nodes[0].x,150);
let resolveAnalysis;globalThis.fetch=async(url,opts)=>{if(url==='/api/extract')return new Promise(r=>resolveAnalysis=r);return {ok:true,json:async()=>({cancelled:true})};};
const analysis=$('analyze').onclick();assert.equal($('cancel').disabled,false);await $('cancel').onclick();await new Promise(r=>setTimeout(r,5));
assert.match($('status').textContent,/cancelled/i);resolveAnalysis({ok:true,json:async()=>({draft:draft()})});await analysis;
assert.equal(JSON.parse($('draft-json').value).nodes.length,2);assert.equal($('analyze').disabled,false);
console.log('PASS: upload enables manual add, route, split, delete, drag without Kiro; cancellation retains edits and discards late response.');
console.log('PASS: standalone editor example, overlay selection, node edits, split junction, review gate, topology download and invalid JSON handling.');w.close();

});
