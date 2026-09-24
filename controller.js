(() => {
const params=new URLSearchParams(location.search),room=params.get("room");
const net=document.getElementById("net"),join=document.getElementById("join"),controls=document.getElementById("controls"),nameInput=document.getElementById("name"),joinBtn=document.getElementById("joinBtn"),msg=document.getElementById("joinMsg"),label=document.getElementById("playerLabel"),fire=document.getElementById("fire");
const moveStick=document.getElementById("moveStick"),moveKnob=document.getElementById("moveKnob"),aimStick=document.getElementById("aimStick"),aimKnob=document.getElementById("aimKnob");
let peer,conn,move={x:0,y:0},aim={x:1,y:0},firing=false,sendTimer,activeMove=false,activeAim=false;
if(!room){msg.textContent="Invalid room link.";joinBtn.disabled=true}
peer=new Peer();
peer.on("open",()=>{net.textContent="ONLINE";net.style.color="#72e0a0"});
peer.on("error",e=>{net.textContent="ERROR";msg.textContent="Connection error: "+e.type});
joinBtn.onclick=()=>{
 const name=(nameInput.value.trim()||"CHICK").slice(0,12);
 joinBtn.disabled=true;msg.textContent="Connecting to farm…";
 conn=peer.connect(room,{reliable:true});
 conn.on("open",()=>{conn.send({t:"join",name});join.hidden=true;controls.hidden=false;label.textContent="🐥 "+name;net.textContent="CONNECTED";startInput()});
 conn.on("close",()=>{net.textContent="DISCONNECTED";controls.hidden=true;join.hidden=false;joinBtn.disabled=false;msg.textContent="Host disconnected."});
};
function startInput(){sendTimer=setInterval(send,45)}
function send(){if(!conn||!conn.open)return;conn.send({t:"input",mx:move.x,my:move.y,ax:aim.x,ay:aim.y,fire:firing})}
function updateStick(el,knob,cx,cy,setter){const r=el.getBoundingClientRect(),dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2),max=r.width*.34,d=Math.hypot(dx,dy)||1,k=Math.min(1,max/d),x=(dx/d)*k,y=(dy/d)*k;knob.style.transform=`translate(${x*max}px,${y*max}px)`;setter(x,y)}
function resetMove(){move={x:0,y:0};moveKnob.style.transform="translate(0,0)";send()}
function resetAim(){aim={x:1,y:0};aimKnob.style.transform="translate(0,0)";send()}
moveStick.addEventListener("pointerdown",e=>{activeMove=true;moveStick.setPointerCapture(e.pointerId);updateStick(moveStick,moveKnob,e.clientX,e.clientY,(x,y)=>move={x,y})});
moveStick.addEventListener("pointermove",e=>{if(activeMove)updateStick(moveStick,moveKnob,e.clientX,e.clientY,(x,y)=>move={x,y})});
moveStick.addEventListener("pointerup",()=>{activeMove=false;resetMove()});
moveStick.addEventListener("pointercancel",()=>{activeMove=false;resetMove()});
aimStick.addEventListener("pointerdown",e=>{activeAim=true;aimStick.setPointerCapture(e.pointerId);updateStick(aimStick,aimKnob,e.clientX,e.clientY,(x,y)=>{aim={x,y}})});
aimStick.addEventListener("pointermove",e=>{if(activeAim)updateStick(aimStick,aimKnob,e.clientX,e.clientY,(x,y)=>{aim={x,y}})});
aimStick.addEventListener("pointerup",()=>{activeAim=false;resetAim()});
aimStick.addEventListener("pointercancel",()=>{activeAim=false;resetAim()});
fire.addEventListener("pointerdown",e=>{e.preventDefault();firing=true;fire.style.filter="brightness(1.3)";send()});
["pointerup","pointercancel","pointerleave"].forEach(ev=>fire.addEventListener(ev,()=>{firing=false;fire.style.filter="";send()}));
})();
