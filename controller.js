(() => {
const params=new URLSearchParams(location.search),room=params.get("room");
const net=document.getElementById("net"),join=document.getElementById("join"),controls=document.getElementById("controls"),nameInput=document.getElementById("name"),joinBtn=document.getElementById("joinBtn"),msg=document.getElementById("joinMsg"),label=document.getElementById("playerLabel"),stick=document.getElementById("stick"),knob=document.getElementById("knob"),fire=document.getElementById("fire");
let peer,conn,playerId,axis={x:0,y:0},firing=false,sendTimer;
if(!room){msg.textContent="Invalid room link.";joinBtn.disabled=true}
peer=new Peer();
peer.on("open",()=>{net.textContent="ONLINE";net.style.color="#72e0a0"});
peer.on("error",e=>{net.textContent="ERROR";msg.textContent="Connection error: "+e.type});
joinBtn.onclick=()=>{
 const name=(nameInput.value.trim()||"CHICK").slice(0,12);
 joinBtn.disabled=true;msg.textContent="Connecting to farm…";
 conn=peer.connect(room,{reliable:true});
 conn.on("open",()=>{conn.send({t:"join",name});join.hidden=true;controls.hidden=false;label.textContent="🐥 "+name;net.textContent="CONNECTED";startInput()});
 conn.on("data",m=>{if(m.t==="joined"){playerId=m.id}});
 conn.on("close",()=>{net.textContent="DISCONNECTED";controls.hidden=true;join.hidden=false;joinBtn.disabled=false;msg.textContent="Host disconnected."});
};
function startInput(){sendTimer=setInterval(()=>send(),50)}
function send(){if(!conn||!conn.open)return;conn.send({t:"input",x:axis.x,y:axis.y,fire:firing,angle:0})}
function setStick(cx,cy){const r=stick.getBoundingClientRect(),dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2),max=r.width*.34,d=Math.hypot(dx,dy)||1,k=Math.min(1,max/d);axis.x=(dx/d)*k;axis.y=(dy/d)*k;knob.style.transform=`translate(${axis.x*max}px,${axis.y*max}px)`}
function reset(){axis.x=axis.y=0;knob.style.transform="translate(0,0)";send()}
let active=false;
stick.addEventListener("pointerdown",e=>{active=true;stick.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY)});
stick.addEventListener("pointermove",e=>{if(active)setStick(e.clientX,e.clientY)});
stick.addEventListener("pointerup",()=>{active=false;reset()});
stick.addEventListener("pointercancel",()=>{active=false;reset()});
fire.addEventListener("pointerdown",e=>{e.preventDefault();firing=true;fire.style.filter="brightness(1.3)";send()});
["pointerup","pointercancel","pointerleave"].forEach(ev=>fire.addEventListener(ev,()=>{firing=false;fire.style.filter="";send()}));
})();
