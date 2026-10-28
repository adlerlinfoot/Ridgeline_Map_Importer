import {validateDraft,compileDraft,protocol} from './core.mjs';
const $=id=>document.getElementById(id),svg=$('graph');
const colors={lift:'#ff666b',green:'#68be91',blue:'#65a3d9',black:'#202e3c',park:'#f4ad62',base_transit:'#d7d7d7',ski_traverse:'#a584c8'};
let draft=null,image=null,selected=null,tool='inspect',drag=null,route=[],job=null,revision=0,jsonDirty=false;
const status=(text,error=false)=>{$('status').textContent=text;$('status').className=error?'error':'';};
const node=id=>draft.nodes.find(n=>n.id===id),edge=id=>draft.edges.find(e=>e.id===id);
function element(tag,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
function point(event){const r=svg.getBoundingClientRect();return [Math.max(0,Math.min(draft.width,(event.clientX-r.left)/r.width*draft.width)),Math.max(0,Math.min(draft.height,(event.clientY-r.top)/r.height*draft.height))];}
function id(prefix,items){let i=1;while(items.some(x=>x.id===prefix+i))i++;return prefix+i;}
function changed(){revision++;draft.reviewed=false;$('reviewed').checked=false;draw();validate();}
function view(){svg.setAttribute('viewBox',`0 0 ${draft.width} ${draft.height}`);$('image-stage').style.aspectRatio=`${draft.width} / ${draft.height}`;$('image-stage').style.minHeight='0';$('source-image').style.minHeight='0';}
function load(d){if(!d||!Array.isArray(d.nodes)||!Array.isArray(d.edges)||!Number.isFinite(d.width)||!Number.isFinite(d.height)||d.width<10||d.height<10||d.nodes.length>150||d.edges.length>300)throw new Error('Invalid draft shape or size');revision++;jsonDirty=false;draft=structuredClone(d);draft.reviewed=false;selected=null;route=[];$('reviewed').checked=false;view();draw();fields();issues();validate();}
function draw(){
  if(!draft)return;svg.replaceChildren();const radius=draft.width/160;
  for(const e of draft.edges){if(!Array.isArray(e.points)||e.points.length<2||e.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))continue;const color=e.kind==='run'?colors[e.difficulty]:colors[e.kind];const line=element('polyline',{points:e.points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color??'#fff','stroke-width':selected?.id===e.id?radius*.9:radius*.55,'stroke-linejoin':'round','data-edge':e.id});if(e.kind==='base_transit')line.setAttribute('stroke-dasharray',`${radius} ${radius*.7}`);line.append(element('title',{},e.id+' · '+e.name));svg.append(line);
    // Arrow on the final segment makes the committed direction reviewable.
    if(e.kind!=='base_transit'&&e.points.length>1){const a=e.points.at(-2),b=e.points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,x=a[0]+dx*.7,y=a[1]+dy*.7;svg.append(element('path',{d:`M ${x-dx/len*radius-dy/len*radius*.55} ${y-dy/len*radius+dx/len*radius*.55} L ${x} ${y} L ${x-dx/len*radius+dy/len*radius*.55} ${y-dy/len*radius-dx/len*radius*.55}`,fill:'none',stroke:color??'#fff','stroke-width':radius*.3,'pointer-events':'none'}));}
    if(selected?.id===e.id)e.points.slice(1,-1).forEach((p,i)=>svg.append(element('circle',{cx:p[0],cy:p[1],r:radius*.6,fill:'#fff',stroke:'#142d38','data-handle':i+1,'data-route':e.id})));
  }
  for(const n of draft.nodes){svg.append(element('circle',{cx:n.x,cy:n.y,r:radius*(selected?.id===n.id?1.2:1),fill:n.id===draft.lodge?'#ffe0a4':'#ddf5f0',stroke:'#122c39','stroke-width':radius*.3,'data-node':n.id}));const text=element('text',{x:n.x+radius*1.5,y:n.y-radius*1.3,fill:'#091821',stroke:'#fff','stroke-width':radius*.12,'paint-order':'stroke','font-size':radius*1.8,'font-family':'system-ui','pointer-events':'none'},n.name||n.id);svg.append(text);}
  if(route.length)svg.append(element('polyline',{points:route.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#ffec88','stroke-width':radius*.6,'stroke-dasharray':`${radius} ${radius}`}));
}
function fields(){
  const n=selected?.type==='node'?node(selected.id):null,e=selected?.type==='edge'?edge(selected.id):null;
  $('selection').textContent=n?`Node ${n.name||n.id} [${n.id}]`:e?`Route ${e.name||e.id} [${e.id}]`:'Select a node or route.';$('node-fields').hidden=!n;$('edge-fields').hidden=!e;
  if(n){$('node-name').value=n.name??n.id;$('node-kind').value=n.kind;$('node-height').value=n.elevation_m??'';}
  if(e){$('edge-name').value=e.name??e.id;$('edge-kind').value=e.kind;$('edge-difficulty').value=e.difficulty??'green';$('edge-race').checked=e.subtype==='race';$('edge-capacity').value=e.capacity??'';$('edge-ride').value=e.ride_minutes??'';$('edge-both').checked=e.bidirectional!==false;
    for(const [id,value] of [['edge-from',e.from],['edge-to',e.to]]){$(id).replaceChildren(...draft.nodes.map(n=>{const o=document.createElement('option');o.value=n.id;o.textContent=n.id+' · '+n.name;return o;}));$(id).value=value;}
  }
}
function issues(){
  $('legend-summary').textContent=draft?.legend?`Key: ${draft.legend.corner??'unspecified'} · ${(Array.isArray(draft.legend.entries)?draft.legend.entries:[]).map(e=>e.label+' → '+e.meaning).join('; ')}`:'No legend read yet.';
  $('issues').replaceChildren(...(Array.isArray(draft?.uncertainties)?draft.uncertainties:[]).map(u=>{const box=document.createElement('div');box.className='issue';const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=Boolean(u.resolved);input.onchange=()=>{u.resolved=input.checked;changed();};label.append(input,document.createTextNode((u.severity==='blocking'?'IMAGE REVIEW REQUIRED: ':'IMAGE NOTE: ')+u.message));box.append(label);return box;}));
}
function validate(){
  if(!draft)return;const snapshot=structuredClone(draft),v=validateDraft(snapshot,{review:true});
  try{compileDraft(snapshot,{metersPerPixel:Number($('scale').value),capacity:Number($('capacity').value),rideMinutes:Number($('ride').value),requireReview:false});}catch(e){if(!validateDraft(snapshot).errors.length)v.errors.push(e.message);}
  $('validation').replaceChildren();
  for(const [label,list,cls] of [['Must fix',v.errors,'error'],['Assumptions',v.warnings,'warning']])if(list.length){const heading=document.createElement('p');heading.textContent=label;heading.className=cls;const ul=document.createElement('ul');for(const text of list){const li=document.createElement('li');li.textContent=text;
    const diagnostic=v.diagnostics?.find(d=>d.message===text);
    if(diagnostic?.elementId){const button=document.createElement('button');button.textContent='Locate route';button.type='button';button.onclick=()=>{document.querySelector('[data-tool="inspect"]').click();selected={type:'edge',id:diagnostic.elementId};draw();fields();$('image-stage').scrollIntoView?.({behavior:'smooth',block:'center'});status('Selected '+(edge(diagnostic.elementId)?.name||diagnostic.elementId)+'. Edit this route or click an endpoint node to change Node type.');};li.append(document.createTextNode(' '),button);}
    if(text.startsWith('Identify a corner legend')){const button=document.createElement('button');button.textContent='Set legend';button.onclick=()=>{$('manual-legend').scrollIntoView?.({behavior:'smooth',block:'center'});$('legend-corner').focus();};li.append(document.createTextNode(' '),button);}
    ul.append(li);}$('validation').append(heading,ul);}
  if(!v.errors.length){const p=document.createElement('p');p.className='success';p.textContent=`Ready: ${draft.nodes.length} nodes · ${draft.edges.filter(e=>e.kind==='lift').length} lifts · ${draft.edges.length} route edges`;$('validation').append(p);}
  $('apply').disabled=!!v.errors.length||!!job;$('download-map').disabled=!!v.errors.length||!!job;$('download-draft').disabled=false;if(!jsonDirty)$('draft-json').value=JSON.stringify(draft,null,2);return v;
}
function moveNode(n,p){n.x=p[0];n.y=p[1];for(const e of draft.edges){if(e.from===n.id)e.points[0]=[...p];if(e.to===n.id)e.points[e.points.length-1]=[...p];}}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;route=[];if(tool!=='inspect'){selected=null;fields();}if(!draft)status('Upload a map first to start editing.',true);document.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('tool-help').textContent={inspect:'Drag nodes and selected route waypoints. Select to edit properties.',node:'Click the map to add a node, then set its type.',route:'Click a start node, add bends, then click an end node. Set route kind/difficulty first.',split:'Click a route to split it at a new junction. Lifts cannot be split.'}[tool];draw();});
svg.addEventListener('pointerdown',event=>{
  if(!draft)return;const p=point(event),target=event.target,nid=target.getAttribute('data-node'),eid=target.getAttribute('data-edge');
  if(tool==='node'){const n={id:id('N',draft.nodes),name:'New node',kind:'junction',x:p[0],y:p[1],elevation_m:null};draft.nodes.push(n);selected={type:'node',id:n.id};changed();fields();return;}
  if(tool==='route'){
    if(!route.length){if(!nid){status('Start a route by clicking a node.',true);return;}route=[[node(nid).x,node(nid).y]];route.from=nid;}
    else if(nid){if(nid===route.from){status('End at a different node.',true);return;}route.push([node(nid).x,node(nid).y]);const kind=$('edge-kind').value,e={id:id('E',draft.edges),name:'New route',kind,from:route.from,to:nid,points:[...route],difficulty:$('edge-difficulty').value,subtype:$('edge-race').checked?'race':'standard',bidirectional:kind==='base_transit',capacity:null,ride_minutes:null};draft.edges.push(e);selected={type:'edge',id:e.id};route=[];changed();fields();}
    else route.push(p);draw();return;
  }
  if(tool==='split'&&eid){
    const e=edge(eid);if(e.kind==='lift'){status('Do not split lift rides. Add explicit base/top nodes instead.',true);return;}
    let best=null;
    for(let i=1;i<e.points.length;i++){const a=e.points[i-1],b=e.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*dx,a[1]+t*dy],distance=Math.hypot(p[0]-q[0],p[1]-q[1]);if(!best||distance<best.distance)best={i,q,distance};}
    const n={id:id('N',draft.nodes),name:'New junction',kind:e.kind==='base_transit'?'base_junction':'junction',x:best.q[0],y:best.q[1],elevation_m:null};draft.nodes.push(n);const other={...e,id:id('E',draft.edges),name:e.name+' · lower',from:n.id,points:[best.q,...e.points.slice(best.i)]};e.points=[...e.points.slice(0,best.i),best.q];e.to=n.id;draft.edges.push(other);selected={type:'node',id:n.id};changed();fields();return;
  }
  if(tool!=='inspect')return;
  const handle=target.getAttribute('data-handle');
  if(handle!==null){drag={type:'handle',id:target.getAttribute('data-route'),index:Number(handle)};}
  else if(nid){selected={type:'node',id:nid};drag={type:'node',id:nid};}
  else if(eid)selected={type:'edge',id:eid};else selected=null;
  if(drag)svg.setPointerCapture(event.pointerId);draw();fields();
});
svg.addEventListener('pointermove',event=>{if(!drag||!draft)return;const p=point(event);if(drag.type==='node')moveNode(node(drag.id),p);else edge(drag.id).points[drag.index]=p;revision++;draft.reviewed=false;$('reviewed').checked=false;draw();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,()=>{if(drag){drag=null;validate();}});
for(const id of ['node-name','node-kind','node-height'])$(id).oninput=$(id).onchange=()=>{if(selected?.type!=='node')return;const n=node(selected.id);n.name=$('node-name').value;n.kind=$('node-kind').value;n.elevation_m=$('node-height').value===''?null:Number($('node-height').value);changed();};
for(const id of ['edge-name','edge-from','edge-to','edge-kind','edge-difficulty','edge-race','edge-capacity','edge-ride','edge-both'])$(id).oninput=$(id).onchange=()=>{if(selected?.type!=='edge')return;const e=edge(selected.id);e.name=$('edge-name').value;e.from=$('edge-from').value;e.to=$('edge-to').value;e.kind=$('edge-kind').value;e.difficulty=$('edge-difficulty').value;e.subtype=$('edge-race').checked?'race':'standard';e.capacity=$('edge-capacity').value===''?null:Number($('edge-capacity').value);e.ride_minutes=$('edge-ride').value===''?null:Number($('edge-ride').value);e.bidirectional=$('edge-both').checked;if(node(e.from))e.points[0]=[node(e.from).x,node(e.from).y];if(node(e.to))e.points[e.points.length-1]=[node(e.to).x,node(e.to).y];changed();};
$('make-lodge').onclick=()=>{if(selected?.type==='node'){const n=node(selected.id);n.kind='base_lodge';draft.lodge=n.id;changed();fields();}};
$('delete').onclick=()=>{if(!selected)return;if(selected.type==='edge')draft.edges=draft.edges.filter(e=>e.id!==selected.id);else{draft.nodes=draft.nodes.filter(n=>n.id!==selected.id);draft.edges=draft.edges.filter(e=>e.from!==selected.id&&e.to!==selected.id);}selected=null;changed();fields();};
$('verify').onclick=()=>{
  if(!draft){status('Upload a map or open a saved draft before verifying.',true);return;}
  if(jsonDirty){try{load(JSON.parse($('draft-json').value));}catch(e){$('validation').replaceChildren();const p=document.createElement('p');p.className='error';p.textContent='Must fix: Invalid draft JSON: '+e.message;$('validation').append(p);$('apply').disabled=true;$('download-map').disabled=true;status('Verification stopped: correct the draft JSON first.',true);return;}}
  issues();const v=validate();
  if(job)status('Analysis is still running. Finish or cancel it before using the topology.',true);
  else if(v.errors.length)status(`Topology blocked: ${v.errors.length} issue${v.errors.length===1?'':'s'} to fix. See the Must fix list below. Your map has been retained.`,true);
  else status('Topology verified. Use in Ridgeline or Download topology is now available.');
  $('validation').scrollIntoView?.({behavior:'smooth',block:'center'});
};
for(const id of ['scale','capacity','ride'])$(id).addEventListener('input',()=>{if(draft)validate();});
$('reviewed').onchange=()=>{if(draft){draft.reviewed=$('reviewed').checked;validate();}};
$('draft-json').addEventListener('input',()=>{jsonDirty=true;$('apply').disabled=true;$('download-map').disabled=true;status('JSON edits pending. Verify topology or Apply JSON edits to check the latest version.');});
$('apply-json').onclick=()=>{try{const d=JSON.parse($('draft-json').value);if(!Array.isArray(d.nodes)||!Array.isArray(d.edges))throw new Error('Missing nodes/edges arrays');revision++;load(d);status('JSON changes applied; review the updated overlay.');}catch(e){status(e.message,true);}};
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bundle(){return compileDraft(draft,{metersPerPixel:Number($('scale').value),capacity:Number($('capacity').value),rideMinutes:Number($('ride').value)});}
$('download-draft').onclick=()=>download('ridgeline-map-draft.json',draft);
$('download-map').onclick=()=>{try{download('ridgeline-topology.json',bundle());}catch(e){status(e.message,true);}};
$('apply').onclick=()=>{try{const target=window.parent!==window?window.parent:window.opener;if(!target){status('Open this plugin from Ridgeline, or download topology JSON and use Ridgeline’s Import topology file button.');return;}target.postMessage({type:protocol,bundle:bundle()},'http://127.0.0.1:43880');status('Sending validated topology to Ridgeline…');}catch(e){status(e.message,true);}};
window.addEventListener('message',e=>{const host=window.parent!==window?window.parent:window.opener;if(e.origin!=='http://127.0.0.1:43880'||e.source!==host)return;if(e.data?.type==='ridgeline.topology.result')status(e.data.ok?'Map loaded in Ridgeline.':e.data.error,!e.data.ok);if(e.data?.type==='ridgeline.importer.cancel')void cancelAnalysis().catch(()=>{});});
async function setImage(file){
  if(file.size>20e6)throw new Error('Choose an image under 20MB.');
  const original=await createImageBitmap(file);if(original.width>10000||original.height>10000){original.close();throw new Error('Image dimensions exceed 10000 pixels.');}
  const scale=Math.min(1,1920/Math.max(original.width,original.height)),canvas=document.createElement('canvas');canvas.width=Math.round(original.width*scale);canvas.height=Math.round(original.height*scale);const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(original,0,0,canvas.width,canvas.height);original.close();
  const url=canvas.toDataURL('image/jpeg',.92);image={data:url.split(',')[1],mimeType:'image/jpeg',width:canvas.width,height:canvas.height};if(image.data.length>4200000)throw new Error('Compressed image is still too large; use a smaller map.');
  await cancelAnalysis();
  pendingDraft=null;$('use-extracted').hidden=true;
  $('source-image').src=url;
  load({name:file.name?.replace(/\.[^.]+$/,'')||'Manual map',width:image.width,height:image.height,legend:{corner:'top-left',entries:[]},lodge:null,nodes:[],edges:[],uncertainties:[],reviewed:false});
  $('analyze').disabled=false;status(`Image ready: ${image.width} � ${image.height}. Edit manually now, or read the image with Kiro.`);
}
$('image-file').onchange=async e=>{try{if(e.target.files[0])await setImage(e.target.files[0]);}catch(error){status(error.message,true);}};
$('json-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>3e6)throw new Error('Draft file too large');await cancelAnalysis();load(JSON.parse(await file.text()));status('Draft loaded. Upload its matching image if needed for review.');}catch(error){status(error.message,true);}};
const headers={'Content-Type':'application/json','X-Ridgeline-Plugin':'map-importer-v1'};
async function cancelAnalysis(){
  const current=job;if(!current)return;
  if(current.cancelling)return current.cancelling;
  current.cancelled=true;current.controller.abort();status('Stopping Kiro analysis�');
  current.cancelling=(async()=>{
    try{const r=await fetch('/api/cancel',{method:'POST',headers,body:JSON.stringify({jobId:current.id})});if(!r.ok)throw new Error('Could not confirm cancellation. Try Cancel analysis again.');
      if(job===current){job=null;$('analyze').disabled=!image;$('cancel').disabled=true;if(draft)validate();status('Analysis cancelled. Your editable draft is retained.');}
    }catch(e){current.cancelling=null;status(e.message,true);throw e;}
  })();return current.cancelling;
}
$('analyze').onclick=async()=>{
  if(!image||job)return;
  const current={id:crypto.randomUUID(),controller:new AbortController(),revision,cancelled:false};job=current;
  $('analyze').disabled=true;$('cancel').disabled=false;validate();status('Kiro is reading the image and its corner legend. This may take a few minutes�');
  try{const r=await fetch('/api/extract',{method:'POST',headers,body:JSON.stringify({...image,jobId:current.id}),signal:current.controller.signal});const result=await r.json();if(current.cancelled||job!==current)return;if(!r.ok)throw new Error(result.error);
    if(revision!==current.revision){pendingDraft=result.draft;$('use-extracted').hidden=false;status('Analysis complete. Manual edits retained; use the extracted draft button to replace them.');}
    else{load(result.draft);status('Draft extracted. Inspect the overlay and validate before applying.');}
  }catch(e){if(!current.cancelled&&job===current)status(e.message,true);}
  finally{if(job===current&&!current.cancelled){job=null;$('analyze').disabled=!image;$('cancel').disabled=true;if(draft)validate();}}
};
let pendingDraft=null;
$('use-extracted').onclick=()=>{if(pendingDraft){load(pendingDraft);pendingDraft=null;$('use-extracted').hidden=true;status('Extracted draft loaded for review.');}};
$('manual-legend').onclick=()=>{if(!draft)return;draft.legend={corner:$('legend-corner').value,entries:[{label:'Lift',meaning:'lift'},{label:'Green',meaning:'easy run'},{label:'Blue',meaning:'intermediate run'},{label:'Black',meaning:'difficult run'},{label:'Park',meaning:'terrain park'},{label:'Walking',meaning:'base transit'}]};changed();issues();};
$('cancel').onclick=()=>{cancelAnalysis().catch(()=>{});};
$('example').onclick=async()=>{try{await cancelAnalysis();pendingDraft=null;$('use-extracted').hidden=true;const r=await fetch('/example.json');load(await r.json());$('source-image').src='/example.png';image=null;$('analyze').disabled=true;status('Reference example loaded from known topology, not an AI extraction. Review and apply, or upload your own map.');}catch(e){status(e.message,true);}};
fetch('/api/status').then(r=>r.json()).then(s=>{$('connection').textContent=s.kiroInstalled?'Kiro CLI available':'Kiro CLI not installed';}).catch(()=>{$('connection').textContent='Start the local plugin server';});
