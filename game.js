(() => {
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener("resize",resize);resize();

const COLORS=["#ffd34f","#ff8b3d","#68c6e8","#c47cff","#74df9b","#ff5f7e","#9aa8ff","#f2f2f2"];
const roomId="farm-"+Math.random().toString(36).slice(2,8).toUpperCase();
const roomCode=document.getElementById("roomCode"),status=document.getElementById("connectionStatus");
roomCode.textContent="ROOM "+roomId;
const controllerURL=new URL("controller.html",location.href);controllerURL.searchParams.set("room",roomId);
new QRCode(document.getElementById("qr"),{text:controllerURL.href,width:200,height:200,colorDark:"#111",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.M});
let peer=new Peer(roomId), connections=new Map(), players=new Map(), enemies=[],bullets=[],particles=[],floating=[],running=false,paused=false,wave=1,farmHP=100,spawnTimer=0,waveLeft=0,waveActive=false,last=performance.now(),keys={},cam={x:0,y:0,zoom:1};
const world={w:2600,h:1800,hen:{x:1300,y:900,r:74},eggs:[{x:1230,y:870,hp:100},{x:1370,y:870,hp:100},{x:1300,y:1000,hp:100}]};
for(let i=0;i<36;i++){let x=120+Math.random()*2360,y=120+Math.random()*1560;if(Math.hypot(x-1300,y-900)<260){i--;continue}world["d"+i]={x,y,s:.7+Math.random()*.8,type:Math.random()<.65?"tree":"plant"}}

peer.on("open",id=>{status.textContent="Room ready • waiting for players";status.style.color="#72e0a0"});
peer.on("error",e=>{status.textContent="Network error: "+e.type;status.style.color="#ff8378"});
peer.on("connection",conn=>setupConnection(conn));

function setupConnection(conn){
 connections.set(conn.peer,conn);
 conn.on("open",()=>{conn.send({t:"hello",room:roomId});toast("Player connected")});
 conn.on("data",msg=>handleMessage(conn,msg));
 conn.on("close",()=>{let p=players.get(conn.peer);if(p){p.dead=true;players.delete(conn.peer);toast(p.name+" left")};connections.delete(conn.peer);updateHUD()});
}
function handleMessage(conn,m){
 if(!m||!m.t)return;
 if(m.t==="join"){let id=conn.peer,name=String(m.name||"CHICK").slice(0,12);let p={id,name,x:world.hen.x+(Math.random()*180-90),y:world.hen.y+(Math.random()*180-90),vx:0,vy:0,angle:0,color:COLORS[players.size%COLORS.length],hp:100,score:0,shoot:false,lastShot:0,dead:false};players.set(id,p);conn.send({t:"joined",id,name,color:p.color});updateHUD();toast("🐥 "+name+" joined!")}
 if(m.t==="input"){let p=players.get(conn.peer);if(p){p.vx=m.x||0;p.vy=m.y||0;p.shoot=!!m.fire;p.angle=(m.angle??p.angle)}}
}
function sendAll(msg){connections.forEach(c=>{try{c.send(msg)}catch(e){}})}
document.getElementById("startBtn").onclick=()=>startWave();
document.getElementById("pauseBtn").onclick=()=>{paused=!paused;document.getElementById("pauseBtn").textContent=paused?"RESUME":"PAUSE"};

addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.code==="Space")e.preventDefault()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

function startWave(){if(waveActive)return;waveActive=true;waveLeft=7+wave*4;spawnTimer=.1;banner("WAVE "+wave);document.getElementById("startBtn").disabled=true}
function spawnEnemy(){
 let edge=Math.floor(Math.random()*4),x=edge===0?40:edge===1?world.w-40:Math.random()*world.w,y=edge===2?40:edge===3?world.h-40:Math.random()*world.h;
 let r=Math.random(),type=r<.62?"fox":r<.88?"wolf":"hawk";
 let hp=type==="fox"?34+wave*4:type==="wolf"?90+wave*8:48+wave*5;
 enemies.push({type,x,y,hp,max:hp,vx:0,vy:0,hit:0,attack:0});
}
function nearestTarget(e){let best=world.hen,bd=1e9;players.forEach(p=>{let d=(p.x-e.x)**2+(p.y-e.y)**2;if(!p.dead&&d<bd){bd=d;best=p}});return best}
function shoot(p){
 if(performance.now()-p.lastShot<180)return;p.lastShot=performance.now();
 let a=p.angle||0; if(!isFinite(a))a=0;
 bullets.push({x:p.x+Math.cos(a)*35,y:p.y+Math.sin(a)*35,vx:Math.cos(a)*760,vy:Math.sin(a)*760,life:1.1,owner:p.id});
 burst(p.x+Math.cos(a)*42,p.y+Math.sin(a)*42,"#ffd15a",5,150);
}
function damageEnemy(e,d,owner){e.hp-=d;e.hit=.08;burst(e.x,e.y,"#fff0a2",5,100);if(e.hp<=0){let p=players.get(owner);if(p){p.score++;floating.push({x:e.x,y:e.y-25,text:"+10",life:1})}burst(e.x,e.y,e.type==="hawk"?"#dbe8ff":"#ffb52e",18,240);if(p){};return true}return false}
function update(dt){
 if(paused)return;
 players.forEach(p=>{
   if(p.dead)return;
   let ax=p.vx,ay=p.vy;
   if(keys.w||keys.arrowup)ay=-1;if(keys.s||keys.arrowdown)ay=1;if(keys.a||keys.arrowleft)ax=-1;if(keys.d||keys.arrowright)ax=1;
   let len=Math.hypot(ax,ay);if(len>1){ax/=len;ay/=len}
   p.x+=ax*230*dt;p.y+=ay*230*dt;p.x=Math.max(70,Math.min(world.w-70,p.x));p.y=Math.max(70,Math.min(world.h-70,p.y));
   let target=nearestTarget({x:p.x,y:p.y});p.angle=Math.atan2(target.y-p.y,target.x-p.x);
   if(keys[" "]||keys.space)p.shoot=true;
   if(p.shoot)shoot(p);
   p.shoot=false;
 });
 if(waveActive){
   spawnTimer-=dt;
   if(waveLeft>0&&spawnTimer<=0){spawnEnemy();waveLeft--;spawnTimer=Math.max(.18,.72-wave*.025)}
   if(waveLeft<=0&&enemies.length===0){waveActive=false;wave++;document.getElementById("startBtn").disabled=false;document.getElementById("startBtn").textContent="START WAVE "+wave;banner("WAVE CLEAR",1200)}
 }
 bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt});
 bullets=bullets.filter(b=>b.life>0&&b.x>0&&b.y>0&&b.x<world.w&&b.y<world.h);
 enemies.forEach(e=>{
   let t=nearestTarget(e),dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy)||1;
   let speed=e.type==="fox"?125:e.type==="wolf"?82:185;
   e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=e.vx*dt;e.y+=e.vy*dt;e.hit=Math.max(0,e.hit-dt);
   if(e.type==="hawk"){e.x+=Math.sin(performance.now()/160)*15*dt}
   e.attack-=dt;
   if(d<(e.type==="hawk"?45:48)&&e.attack<=0){
     e.attack=e.type==="wolf"?1.0:.7;
     if(t===world.hen){farmHP=Math.max(0,farmHP-(e.type==="wolf"?6:3));burst(world.hen.x,world.hen.y,"#ff6d4d",10,180)}
     else {t.hp-=e.type==="wolf"?18:10;burst(t.x,t.y,"#ff6d4d",8,140);if(t.hp<=0){t.dead=true;burst(t.x,t.y,"#fff",28,300);toast("💥 "+t.name+" is down!")}}
   }
 });
 for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];if((b.x-e.x)**2+(b.y-e.y)**2<32**2){if(damageEnemy(e,24,b.owner)){enemies.splice(j,1)}bullets.splice(i,1);break}}}
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt});
 particles=particles.filter(p=>p.life>0);
 floating.forEach(f=>{f.y-=22*dt;f.life-=dt});floating=floating.filter(f=>f.life>0);
 updateCamera();updateHUD();
 if(farmHP<=0){farmHP=100;wave=1;waveActive=false;enemies=[];toast("🏚️ FARM OVERRUN — restart from WAVE 1");document.getElementById("startBtn").disabled=false}
}
function updateCamera(){
 let pts=[world.hen];players.forEach(p=>{if(!p.dead)pts.push(p)});
 let minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
 let spanX=maxX-minX+500,spanY=maxY-minY+400;
 cam.zoom=Math.max(.48,Math.min(1.08,Math.min(W/spanX,H/spanY)));
 let cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 cam.x=Math.max(W/(2*cam.zoom),Math.min(world.w-W/(2*cam.zoom),cx));
 cam.y=Math.max(H/(2*cam.zoom),Math.min(world.h-H/(2*cam.zoom),cy));
}
function sx(x){return (x-cam.x)*cam.zoom+W/2}function sy(y){return (y-cam.y)*cam.zoom+H/2}

function draw(){
 ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
 drawWorld();drawEnemies();drawBullets();drawPlayers();drawParticles();ctx.restore();
 drawVignette();
}
function drawWorld(){
 ctx.fillStyle="#83b65a";ctx.fillRect(0,0,world.w,world.h);
 for(let x=0;x<world.w;x+=80)for(let y=0;y<world.h;y+=80){ctx.fillStyle=((x/80+y/80)%2?"#80b258":"#87ba5e");ctx.fillRect(x,y,80,80)}
 // paths
 ctx.fillStyle="#c99b63";ctx.beginPath();ctx.moveTo(0,760);ctx.lineTo(world.w,690);ctx.lineTo(world.w,830);ctx.lineTo(0,900);ctx.fill();
 ctx.beginPath();ctx.moveTo(1150,0);ctx.lineTo(1450,0);ctx.lineTo(1400,1800);ctx.lineTo(1200,1800);ctx.fill();
 // fence
 ctx.strokeStyle="#7d4f2c";ctx.lineWidth=12;for(let x=260;x<2340;x+=80){ctx.beginPath();ctx.moveTo(x,520);ctx.lineTo(x,700);ctx.stroke();ctx.beginPath();ctx.moveTo(x,650);ctx.lineTo(x+80,650);ctx.stroke()}
 // decorations
 for(let k in world){if(!k.startsWith("d"))continue;let o=world[k];if(o.type==="tree")drawTree(o.x,o.y,o.s);else drawPlant(o.x,o.y,o.s)}
 // hen coop
 ctx.fillStyle="#c47a42";ctx.fillRect(1170,790,260,190);ctx.fillStyle="#8d4e32";ctx.beginPath();ctx.moveTo(1140,800);ctx.lineTo(1300,680);ctx.lineTo(1460,800);ctx.fill();ctx.fillStyle="#4c3026";ctx.fillRect(1265,865,70,115);
 ctx.fillStyle="#ffe36b";ctx.font="900 18px system-ui";ctx.textAlign="center";ctx.fillText("GOLDEN COOP",1300,770);
 // eggs
 world.eggs.forEach((e,i)=>{if(e.hp>0){ctx.fillStyle="#ffd84d";ctx.beginPath();ctx.ellipse(e.x,e.y,18,24,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff4a6";ctx.beginPath();ctx.ellipse(e.x-6,e.y-7,5,7,0,0,Math.PI*2);ctx.fill()}});
 drawHen();
}
function drawTree(x,y,s){ctx.fillStyle="#6f472d";ctx.fillRect(x-9*s,y,18*s,60*s);ctx.fillStyle="#2f7d43";for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+(i-1)*25*s,y-15*s-(i%2)*15,42*s,0,Math.PI*2);ctx.fill()}ctx.fillStyle="#439a4d";ctx.beginPath();ctx.arc(x-20*s,y-30*s,30*s,0,Math.PI*2);ctx.fill()}
function drawPlant(x,y,s){ctx.strokeStyle="#3d7c38";ctx.lineWidth=4*s;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(i-1.5)*9*s,y-20*s);ctx.stroke()}ctx.fillStyle="#f4ce51";ctx.beginPath();ctx.arc(x+18*s,y-24*s,6*s,0,7);ctx.fill()}
function drawHen(){let x=world.hen.x,y=world.hen.y;ctx.save();ctx.translate(x,y);ctx.fillStyle="#fff4dc";ctx.beginPath();ctx.ellipse(0,20,65,55,0,0,7);ctx.fill();ctx.fillStyle="#fff8e8";ctx.beginPath();ctx.arc(0,-30,58,0,7);ctx.fill();ctx.fillStyle="#ed3e32";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*18,-85-(i===0?8:0),18,0,7);ctx.fill()}ctx.fillStyle="#222";ctx.beginPath();ctx.arc(-18,-35,9,0,7);ctx.arc(18,-35,9,0,7);ctx.fill();ctx.fillStyle="#f3a33b";ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(22,-5);ctx.lineTo(0,5);ctx.closePath();ctx.fill();ctx.restore()}
function drawPlayers(){players.forEach(p=>{if(p.dead)return;drawChick(p.x,p.y,p.color,p.name,p.angle,p.hp,p.score)})}
function drawChick(x,y,color,name,a,hp,score){ctx.save();ctx.translate(x,y);ctx.rotate(a*.04); // tiny body tilt
 ctx.fillStyle="#e79b38";ctx.beginPath();ctx.ellipse(0,28,25,18,0,0,7);ctx.fill();
 ctx.fillStyle="#ffd34f";ctx.beginPath();ctx.arc(0,-12,42,0,7);ctx.fill();
 ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(12,-18,14,18,0,0,7);ctx.ellipse(-14,-18,14,18,0,0,7);ctx.fill();
 ctx.fillStyle="#20262b";ctx.beginPath();ctx.arc(15,-17,7,0,7);ctx.arc(-15,-17,7,0,7);ctx.fill();
 ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(18,-20,2.5,0,7);ctx.arc(-12,-20,2.5,0,7);ctx.fill();
 ctx.fillStyle="#ed8c31";ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(18,3);ctx.lineTo(0,12);ctx.closePath();ctx.fill();
 ctx.fillStyle="#e6332d";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*13,-54-(i===0?5:0),12,0,7);ctx.fill()}
 // gun
 ctx.save();ctx.rotate(a);ctx.fillStyle="#2c3338";roundRect(-5,-8,62,15,5);ctx.fill();ctx.fillStyle="#15191c";roundRect(25,-5,28,7,2);ctx.fill();ctx.fillStyle="#a9b0b3";ctx.fillRect(38,-2,4,5);ctx.restore();
 // nameplate
 ctx.fillStyle="#132029dd";roundRect(-46,-82,92,22,11);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(name,-0, -67);
 ctx.fillStyle="#351f26";roundRect(-30,-57,60,5,3);ctx.fill();ctx.fillStyle="#6de38d";roundRect(-30,-57,60*Math.max(0,hp)/100,5,3);ctx.fill();
 ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawEnemies(){enemies.forEach(e=>{ctx.save();ctx.translate(e.x,e.y);if(e.type==="hawk"){ctx.fillStyle=e.hit?"#fff":"#5a6570";ctx.beginPath();ctx.ellipse(0,0,20,11,0,0,7);ctx.fill();ctx.strokeStyle="#38414a";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-38,-20);ctx.moveTo(8,0);ctx.lineTo(38,-20);ctx.stroke();ctx.fillStyle="#d99a37";ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(31,5);ctx.lineTo(18,8);ctx.fill()}else{ctx.fillStyle=e.hit?"#fff3c4":e.type==="wolf"?"#6d6a68":"#d87839";ctx.beginPath();ctx.ellipse(0,5,28,20,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(-8,-13,20,0,7);ctx.fill();ctx.fillStyle=e.type==="wolf"?"#4b4847":"#d87839";ctx.beginPath();ctx.moveTo(-25,-27);ctx.lineTo(-18,-48);ctx.lineTo(-5,-30);ctx.moveTo(5,-30);ctx.lineTo(19,-48);ctx.lineTo(27,-22);ctx.fill();ctx.fillStyle="#1d2327";ctx.beginPath();ctx.arc(-15,-15,4,0,7);ctx.arc(1,-15,4,0,7);ctx.fill();ctx.fillStyle="#f0b43b";ctx.beginPath();ctx.moveTo(8,-8);ctx.lineTo(24,-2);ctx.lineTo(8,2);ctx.fill()}ctx.restore()})}
function drawBullets(){bullets.forEach(b=>{ctx.strokeStyle="#fff0a0";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(b.x-b.vx*.018,b.y-b.vy*.018);ctx.lineTo(b.x,b.y);ctx.stroke()})}
function burst(x,y,color,n,speed){for(let i=0;i<n;i++){let a=Math.random()*7,v=speed*(.35+Math.random()*.8);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.4,color,size:2+Math.random()*5})}}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.65);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill()});ctx.globalAlpha=1;floating.forEach(f=>{ctx.globalAlpha=f.life;ctx.fillStyle="#fff4a3";ctx.font="900 18px system-ui";ctx.textAlign="center";ctx.fillText(f.text,f.x,f.y)});ctx.globalAlpha=1}
function drawVignette(){let g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,"transparent");g.addColorStop(1,"#07101688");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function banner(t,ms=900){let el=document.getElementById("waveBanner");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),ms)}
let toastTimer;function toast(t){let e=document.getElementById("toast");e.textContent=t;e.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.opacity=0,1700)}
function updateHUD(){document.getElementById("wave").textContent=wave;document.getElementById("enemyCount").textContent=enemies.length+(waveActive?waveLeft:0);document.getElementById("playerCount").textContent=players.size;document.getElementById("farmBar").style.width=farmHP+"%";document.getElementById("farmBar").style.background=farmHP<30?"#f04a3c":"#f4c94e"}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
setTimeout(()=>{document.getElementById("lobby").style.display="none";},1800);
})();
