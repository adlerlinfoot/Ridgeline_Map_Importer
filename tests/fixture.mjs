export function draft(){
  const nodes=[{id:'home',name:'Lodge',kind:'base_lodge',x:500,y:650,elevation_m:null}];
  const edges=[];
  for(const [i,x,difficulty] of [[0,100,'green'],[1,500,'blue'],[2,900,'black']]){
    nodes.push({id:'base'+i,name:'Base '+i,kind:'lift_base',x,y:600,elevation_m:null},{id:'peak'+i,name:'Peak '+i,kind:'lift_top',x,y:100,elevation_m:null});
    edges.push({id:'Chair_'+i,name:'Chair '+i,kind:'lift',from:'base'+i,to:'peak'+i,points:[[x,600],[x,100]],capacity:null,ride_minutes:null},{id:'Run_'+i,name:'Run '+i,kind:'run',from:'peak'+i,to:'base'+i,points:[[x,100],[x+20,350],[x,600]],difficulty});
  }
  for(const [id,a,b] of [['WalkA','base0','base1'],['WalkB','base1','base2'],['LodgeAccess','home','base1']]){const n=nodes.find(n=>n.id===a),m=nodes.find(n=>n.id===b);edges.push({id,name:id,kind:'base_transit',from:a,to:b,points:[[n.x,n.y],[m.x,m.y]],bidirectional:true});}
  return {name:'Three lift test mountain',width:1000,height:700,lodge:'home',legend:{corner:'bottom-right',entries:[{label:'green',meaning:'green',color:'#008800'},{label:'lift',meaning:'lift',color:'#ff0000'}]},nodes,edges,uncertainties:[],reviewed:true};
}
