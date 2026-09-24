(() => {
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener("resize",resize);resize();

const COLORS=["#ffd34f","#ff8b3d","#68c6e8","#c47cff","#74df9b","#ff5f7e","#9aa8ff","#f2f2f2"];
const roomId="farm-"+Math.random().toString(36).slice(2,8).toUpperCase();
document.getElementById("roomCode").textContent="ROOM "+roomId;
const controllerURL=new URL("controller.html",location.href);controllerURL.searchParams.set("room",roomId);
new QRCode(document.getElementById("qr"),{text:controllerURL.href,width:200,height:200,colorDark:"#111",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.M});
const status=document.getElementById("connectionStatus"),peer=new Peer(roomId),connections=new Map(),players=new Map();
let enemies=[],bullets=[],particles=[],floating=[],pickups=[],warnings=[],running=false,paused=false,wave=1,farmHP=100,spawnTimer=0,waveLeft=0,waveActive=false,bossSpawned=false,last=performance.now(),keys={},mouse={x:0,y:0,down:false},cam={x:0,y:0,zoom:1},combo=0,comboTimer=0;

const world={w:2600,h:1900,hen:{x:1300,y:1600,r:78},eggs:[{x:1215,y:1570,hp:100},{x:1300,y:1510,hp:100},{x:1385,y:1570,hp:100}],decor:[]};
for(let i=0;i<44;i++){let x=100+Math.random()*2400,y=100+Math.random()*1450;if(y>1280&&x>900&&x<1700){i--;continue}world.decor.push({x,y,s:.65+Math.random()*.9,type:Math.random()<.72?"tree":"plant"})}

peer.on("open",()=>{status.textContent="Room ready • waiting for players";status.style.color="#72e0a0"});
peer.on("error",e=>{status.textContent="Network error: "+e.type;status.style.color="#ff8378"});
peer.on("connection",conn=>setupConnection(conn));
function setupConnection(conn){
 connections.set(conn.peer,conn);
 conn.on("open",()=>conn.send({t:"hello",room:roomId}));
 conn.on("data",m=>handleMessage(conn,m));
 conn.on("close",()=>{let p=players.get(conn.peer);if(p){players.delete(conn.peer);toast(p.name+" left the farm")};connections.delete(conn.peer);updateHUD()});
}
function handleMessage(conn,m){
 if(!m||!m.t)return;
 if(m.t==="join"){
   const id=conn.peer,name=String(m.name||"CHICK").slice(0,12);
   const p={id,name,x:world.hen.x+(Math.random()*260-130),y:world.hen.y-180+(Math.random()*100-50),mx:0,my:0,ax:0,ay:-1,angle:-Math.PI/2,color:COLORS[players.size%COLORS.length],hp:100,score:0,lastShot:0,shoot:false,heat:0,hit:0,combo:0};
   players.set(id,p);conn.send({t:"joined",id,name,color:p.color});updateHUD();toast("🐥 "+name+" joined!");
 }
 if(m.t==="input"){let p=players.get(conn.peer);if(p){p.mx=m.mx||0;p.my=m.my||0;p.ax=m.ax||p.ax;p.ay=m.ay||p.ay;p.shoot=!!m.fire}}
}
function sendAll(msg){connections.forEach(c=>{try{c.send(msg)}catch(e){}})}
document.getElementById("startBtn").onclick=()=>startWave();
document.getElementById("pauseBtn").onclick=()=>{paused=!paused;document.getElementById("pauseBtn").textContent=paused?"RESUME":"PAUSE"};
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.code==="Space")e.preventDefault()});
addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
canvas.addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY});
canvas.addEventListener("mousedown",e=>{if(e.button===0)mouse.down=true});
addEventListener("mouseup",e=>{if(e.button===0)mouse.down=false});

function startWave(){
 if(waveActive)return;
 waveActive=true;waveLeft=9+wave*5;spawnTimer=.1;bossSpawned=false;
 banner(wave%5===0?"⚠️ ELITE PREDATOR WAVE":"WAVE "+wave,wave%5===0?1500:900);
 document.getElementById("startBtn").disabled=true;
}
function spawnEnemy(){
 const edge=Math.random();let x,y;
 // V2: most enemies come from the top, with side entries at higher waves.
 if(wave<4||edge<.78){x=90+Math.random()*(world.w-180);y=55}
 else if(edge<.89){x=55;y=180+Math.random()*900}
 else{x=world.w-55;y=180+Math.random()*900}
 let r=Math.random(),type=r<.56?"fox":r<.84?"wolf":"hawk",elite=wave>=3&&Math.random()<Math.min(.25,wave*.025);
 if(wave%5===0&&Math.random()<.12&&!bossSpawned){type="alpha";elite=true;bossSpawned=true}
 let hp=type==="fox"?36+wave*5:type==="wolf"?100+wave*9:type==="hawk"?52+wave*6:500+wave*35;
 if(elite)hp*=1.65;
 enemies.push({type,x,y,hp,max:hp,vx:0,vy:0,hit:0,attack:0,elite,phase:Math.random()*7});
 warnings.push({x,y,life:1.1,type});
}
function targetForEnemy(e){
 let best=world.hen,bd=1e9;
 players.forEach(p=>{if(!p.dead){let d=(p.x-e.x)**2+(p.y-e.y)**2;if(d<bd&&d<520*520){bd=d;best=p}}});
 return best;
}
function nearestEnemy(p){
 let best=null,bd=1e9;enemies.forEach(e=>{let d=(p.x-e.x)**2+(p.y-e.y)**2;if(d<bd){bd=d;best=e}});return best;
}
function shoot(p){
 if(performance.now()-p.lastShot<150)return;
 p.lastShot=performance.now();p.heat=Math.min(1,p.heat+.085);
 const a=p.angle;
 bullets.push({x:p.x+Math.cos(a)*50,y:p.y+Math.sin(a)*50,vx:Math.cos(a)*820,vy:Math.sin(a)*820,life:1.05,owner:p.id});
 burst(p.x+Math.cos(a)*52,p.y+Math.sin(a)*52,"#ffd15a",7,170);
}
function damageEnemy(e,d,owner){
 e.hp-=d;e.hit=.09;burst(e.x,e.y,e.type==="alpha"?"#ff6a3d":"#fff0a2",6,110);
 if(e.hp<=0){
   const p=players.get(owner);
   if(p){p.score+=e.elite?50:10;combo++;comboTimer=2.2;floating.push({x:e.x,y:e.y-25,text:"+"+(e.elite?50:10),life:1.1})}
   burst(e.x,e.y,e.type==="hawk"?"#dbe8ff":"#ff9f35",e.type==="alpha"?48:22,e.type==="alpha"?340:260);
   if(Math.random()<.16||e.elite)pickups.push({x:e.x,y:e.y,type:Math.random()<.65?"egg":"heart",life:9,bob:Math.random()*7});
   return true;
 }
 return false;
}
function update(dt){
 if(paused)return;
 comboTimer-=dt;if(comboTimer<=0)combo=0;
 players.forEach(p=>{
   if(p.dead)return;
   let ax=p.mx,ay=p.my;
   if(keys.w||keys.arrowup)ay=-1;if(keys.s||keys.arrowdown)ay=1;if(keys.a||keys.arrowleft)ax=-1;if(keys.d||keys.arrowright)ax=1;
   let len=Math.hypot(ax,ay);if(len>1){ax/=len;ay/=len}
   p.x+=ax*235*dt;p.y+=ay*235*dt;p.x=Math.max(70,Math.min(world.w-70,p.x));p.y=Math.max(80,Math.min(world.h-80,p.y));
   let tx=p.x+(mouse.x-W/2)/cam.zoom+cam.x,ty=p.y+(mouse.y-H/2)/cam.zoom+cam.y;
   if(p.id===peer.id||!p.ax&&!p.ay){p.angle=Math.atan2(ty-p.y,tx-p.x)}else if(Math.hypot(p.ax,p.ay)>.12){p.angle=Math.atan2(p.ay,p.ax)}
   if(keys[" "]||keys.space||mouse.down)p.shoot=true;
   if(p.shoot)shoot(p);
   p.shoot=false;p.heat=Math.max(0,p.heat-dt*.32);p.hit=Math.max(0,p.hit-dt);
 });
 if(waveActive){
   spawnTimer-=dt;
   if(waveLeft>0&&spawnTimer<=0){spawnEnemy();waveLeft--;spawnTimer=Math.max(.14,.62-wave*.018)}
   if(waveLeft<=0&&enemies.length===0){waveActive=false;wave++;document.getElementById("startBtn").disabled=false;document.getElementById("startBtn").textContent="START WAVE "+wave;banner("WAVE CLEAR • "+(combo?combo+"x COMBO":"READY"),1200)}
 }
 warnings.forEach(w=>w.life-=dt);warnings=warnings.filter(w=>w.life>0);
 bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt});
 bullets=bullets.filter(b=>b.life>0&&b.x>0&&b.y>0&&b.x<world.w&&b.y<world.h);
 enemies.forEach(e=>{
   let t=targetForEnemy(e),dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy)||1;
   let speed=e.type==="fox"?132:e.type==="wolf"?84:e.type==="hawk"?195:e.type==="alpha"?76:100;
   if(e.type==="hawk"){e.phase+=dt*6;dx+=Math.sin(e.phase)*120}
   e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=e.vx*dt;e.y+=e.vy*dt;e.hit=Math.max(0,e.hit-dt);e.attack-=dt;
   const range=e.type==="hawk"?48:e.type==="alpha"?62:52;
   if(d<range&&e.attack<=0){
     e.attack=e.type==="alpha"?1.15:e.type==="wolf"?1:.72;
     if(t===world.hen){farmHP=Math.max(0,farmHP-(e.type==="alpha"?12:e.type==="wolf"?6:3));burst(world.hen.x,world.hen.y,"#ff6d4d",14,190)}
     else{t.hp-=e.type==="alpha"?28:e.type==="wolf"?18:10;burst(t.x,t.y,"#ff6d4d",8,150);if(t.hp<=0){t.dead=true;burst(t.x,t.y,"#fff",30,320);toast("💥 "+t.name+" is down!")}}
   }
 });
 for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];if((b.x-e.x)**2+(b.y-e.y)**2<38**2){if(damageEnemy(e,25,b.owner))enemies.splice(j,1);bullets.splice(i,1);break}}}
 pickups.forEach(p=>{p.life-=dt;p.bob+=dt*5;players.forEach(pl=>{if((pl.x-p.x)**2+(pl.y-p.y)**2<42**2){p.life=0;if(p.type==="heart")pl.hp=Math.min(100,pl.hp+25);else pl.score+=25;burst(p.x,p.y,p.type==="heart"?"#79e39a":"#ffd34f",16,170)}})});
 pickups=pickups.filter(p=>p.life>0);
 players.forEach(p=>{if(p.dead)return;particles.forEach(()=>{});});
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt});particles=particles.filter(p=>p.life>0);
 floating.forEach(f=>{f.y-=22*dt;f.life-=dt});floating=floating.filter(f=>f.life>0);
 if(farmHP<=0){farmHP=100;wave=1;waveActive=false;enemies=[];toast("🏚️ FARM OVERRUN — defend the coop again!");document.getElementById("startBtn").disabled=false;document.getElementById("startBtn").textContent="START WAVE"}
 updateCamera();updateHUD();
}
function updateCamera(){
 let pts=[world.hen];players.forEach(p=>{if(!p.dead)pts.push(p)});
 let minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
 let spanX=maxX-minX+600,spanY=maxY-minY+480;
 cam.zoom=Math.max(.46,Math.min(1.12,Math.min(W/spanX,H/spanY)));
 let cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 cam.x=Math.max(W/(2*cam.zoom),Math.min(world.w-W/(2*cam.zoom),cx));
 cam.y=Math.max(H/(2*cam.zoom),Math.min(world.h-H/(2*cam.zoom),cy));
}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);drawWorld();drawWarnings();drawEnemies();drawBullets();drawPickups();drawPlayers();drawParticles();ctx.restore();drawVignette()}
function drawWorld(){
 ctx.fillStyle="#7fb45b";ctx.fillRect(0,0,world.w,world.h);
 for(let x=0;x<world.w;x+=80)for(let y=0;y<world.h;y+=80){ctx.fillStyle=((x/80+y/80)%2?"#7daf56":"#83b85d");ctx.fillRect(x,y,80,80)}
 // top attack field
 ctx.fillStyle="#9ac56e";ctx.fillRect(0,0,world.w,420);
 // roads
 ctx.fillStyle="#c99b63";ctx.beginPath();ctx.moveTo(0,720);ctx.lineTo(world.w,680);ctx.lineTo(world.w,835);ctx.lineTo(0,900);ctx.fill();
 ctx.beginPath();ctx.moveTo(1120,0);ctx.lineTo(1480,0);ctx.lineTo(1430,1450);ctx.lineTo(1170,1450);ctx.fill();
 // crop bands
 for(let y=250;y<1300;y+=170){ctx.strokeStyle="#69984a";ctx.lineWidth=3;for(let x=180;x<2420;x+=34){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12,y-18);ctx.stroke()}}
 // defensive fence above coop
 ctx.strokeStyle="#7d4f2c";ctx.lineWidth=12;for(let x=730;x<1870;x+=80){ctx.beginPath();ctx.moveTo(x,1350);ctx.lineTo(x,1480);ctx.stroke()}ctx.beginPath();ctx.moveTo(730,1400);ctx.lineTo(1870,1400);ctx.stroke();ctx.beginPath();ctx.moveTo(730,1460);ctx.lineTo(1870,1460);ctx.stroke();
 world.decor.forEach(o=>o.type==="tree"?drawTree(o.x,o.y,o.s):drawPlant(o.x,o.y,o.s));
 // coop at bottom
 const x=world.hen.x,y=world.hen.y;
 ctx.fillStyle="#c47a42";ctx.fillRect(x-150,y-85,300,170);ctx.fillStyle="#8d4e32";ctx.beginPath();ctx.moveTo(x-180,y-75);ctx.lineTo(x,y-205);ctx.lineTo(x+180,y-75);ctx.fill();ctx.fillStyle="#4c3026";ctx.fillRect(x-38,y+10,76,75);
 ctx.fillStyle="#ffe36b";ctx.font="900 20px system-ui";ctx.textAlign="center";ctx.fillText("GOLDEN COOP",x,y-105);
 // eggs
 let alive=0;world.eggs.forEach(e=>{if(e.hp>0){alive++;ctx.fillStyle="#ffd84d";ctx.beginPath();ctx.ellipse(e.x,e.y,20,27,0,0,7);ctx.fill();ctx.fillStyle="#fff4a6";ctx.beginPath();ctx.ellipse(e.x-6,e.y-8,5,8,0,0,7);ctx.fill()}});
 drawHen();
 // defensive zone label
 ctx.fillStyle="#fff3b3aa";ctx.font="900 16px system-ui";ctx.fillText("DEFEND MOMMA HEN • GOLDEN EGG ZONE",x,y+125);
}
function drawTree(x,y,s){ctx.fillStyle="#6f472d";ctx.fillRect(x-9*s,y,18*s,60*s);ctx.fillStyle="#2f7d43";for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+(i-1)*25*s,y-15*s-(i%2)*15,42*s,0,7);ctx.fill()}ctx.fillStyle="#439a4d";ctx.beginPath();ctx.arc(x-20*s,y-30*s,30*s,0,7);ctx.fill()}
function drawPlant(x,y,s){ctx.strokeStyle="#3d7c38";ctx.lineWidth=4*s;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(i-1.5)*9*s,y-20*s);ctx.stroke()}ctx.fillStyle="#f4ce51";ctx.beginPath();ctx.arc(x+18*s,y-24*s,6*s,0,7);ctx.fill()}
function drawHen(){let x=world.hen.x,y=world.hen.y;ctx.save();ctx.translate(x,y);ctx.fillStyle="#fff4dc";ctx.beginPath();ctx.ellipse(0,25,72,60,0,0,7);ctx.fill();ctx.fillStyle="#fff8e8";ctx.beginPath();ctx.arc(0,-40,62,0,7);ctx.fill();ctx.fillStyle="#ed3e32";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*19,-102-(i===0?9:0),20,0,7);ctx.fill()}ctx.fillStyle="#222";ctx.beginPath();ctx.arc(-20,-45,10,0,7);ctx.arc(20,-45,10,0,7);ctx.fill();ctx.fillStyle="#f3a33b";ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(24,-12);ctx.lineTo(0,-3);ctx.closePath();ctx.fill();ctx.fillStyle="#5c3929";ctx.font="900 13px system-ui";ctx.textAlign="center";ctx.fillText("MOMMA",0,75);ctx.restore()}
function drawPlayers(){players.forEach(p=>{if(!p.dead)drawChick(p)})}
function drawChick(p){let {x,y,color,name,a,heat,hp}=p;ctx.save();ctx.translate(x,y);ctx.fillStyle="#e79b38";ctx.beginPath();ctx.ellipse(0,30,25,18,0,0,7);ctx.fill();ctx.fillStyle="#ffd34f";ctx.beginPath();ctx.arc(0,-12,43,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(12,-18,14,18,0,0,7);ctx.ellipse(-14,-18,14,18,0,0,7);ctx.fill();ctx.fillStyle="#20262b";ctx.beginPath();ctx.arc(15,-17,7,0,7);ctx.arc(-15,-17,7,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(18,-20,2.5,0,7);ctx.arc(-12,-20,2.5,0,7);ctx.fill();ctx.fillStyle="#ed8c31";ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(18,3);ctx.lineTo(0,12);ctx.closePath();ctx.fill();ctx.fillStyle="#e6332d";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*13,-54-(i===0?5:0),12,0,7);ctx.fill()}
 // body-facing gun
 ctx.save();ctx.rotate(a);ctx.fillStyle="#2c3338";roundRect(-4,-8,66,16,5);ctx.fill();ctx.fillStyle="#15191c";roundRect(28,-5,30,7,2);ctx.fill();ctx.fillStyle="#a9b0b3";ctx.fillRect(43,-2,4,5);ctx.restore();
 if(heat>.05){ctx.fillStyle="#2c2020";roundRect(-30,-66,60,5,3);ctx.fillStyle=heat>.75?"#f04a3c":"#f4c94e";roundRect(-30,-66,60*heat,5,3)}
 ctx.fillStyle="#132029dd";roundRect(-48,-91,96,22,11);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(name,0,-76);
 ctx.fillStyle="#351f26";roundRect(-30,-61,60,5,3);ctx.fillStyle="#6de38d";roundRect(-30,-61,60*Math.max(0,hp)/100,5,3);ctx.restore()}
function drawEnemies(){enemies.forEach(e=>{ctx.save();ctx.translate(e.x,e.y);if(e.type==="hawk"){ctx.fillStyle=e.hit?"#fff":"#5a6570";ctx.beginPath();ctx.ellipse(0,0,22,12,0,0,7);ctx.fill();ctx.strokeStyle="#38414a";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-42,-22);ctx.moveTo(8,0);ctx.lineTo(42,-22);ctx.stroke();ctx.fillStyle="#d99a37";ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(32,5);ctx.lineTo(18,9);ctx.fill()}else if(e.type==="alpha"){ctx.fillStyle=e.hit?"#fff":"#7d3330";ctx.beginPath();ctx.ellipse(0,8,42,31,0,0,7);ctx.fill();ctx.fillStyle="#8e3d37";ctx.beginPath();ctx.arc(-12,-20,30,0,7);ctx.fill();ctx.fillStyle="#1b1010";ctx.beginPath();ctx.arc(-21,-21,7,0,7);ctx.arc(-4,-21,7,0,7);ctx.fill();ctx.fillStyle="#ffcb43";ctx.font="900 10px system-ui";ctx.textAlign="center";ctx.fillText("ALPHA",0,55)}else{ctx.fillStyle=e.hit?"#fff3c4":e.type==="wolf"?"#6d6a68":"#d87839";ctx.beginPath();ctx.ellipse(0,5,28,20,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(-8,-13,20,0,7);ctx.fill();ctx.fillStyle=e.type==="wolf"?"#4b4847":"#d87839";ctx.beginPath();ctx.moveTo(-25,-27);ctx.lineTo(-18,-48);ctx.lineTo(-5,-30);ctx.moveTo(5,-30);ctx.lineTo(19,-48);ctx.lineTo(27,-22);ctx.fill();ctx.fillStyle="#1d2327";ctx.beginPath();ctx.arc(-15,-15,4,0,7);ctx.arc(1,-15,4,0,7);ctx.fill();ctx.fillStyle="#f0b43b";ctx.beginPath();ctx.moveTo(8,-8);ctx.lineTo(24,-2);ctx.lineTo(8,2);ctx.fill()}if(e.elite){ctx.strokeStyle="#ffd34f";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,38,0,7);ctx.stroke()}ctx.restore()})}
function drawWarnings(){warnings.forEach(w=>{let a=Math.atan2(world.hen.y-w.y,world.hen.x-w.x);ctx.save();ctx.globalAlpha=Math.min(1,w.life*2);ctx.translate(w.x,w.y);ctx.fillStyle="#ff5a43";ctx.beginPath();ctx.arc(0,0,16+Math.sin(performance.now()/80)*3,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font="900 15px system-ui";ctx.textAlign="center";ctx.fillText("!",0,5);ctx.restore()})}
function drawBullets(){bullets.forEach(b=>{ctx.strokeStyle="#fff0a0";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(b.x-b.vx*.018,b.y-b.vy*.018);ctx.lineTo(b.x,b.y);ctx.stroke()})}
function drawPickups(){pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y+Math.sin(p.bob)*5);ctx.fillStyle=p.type==="heart"?"#79e39a":"#ffd34f";ctx.beginPath();ctx.arc(0,0,15,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font="900 14px system-ui";ctx.textAlign="center";ctx.fillText(p.type==="heart"?"♥":"$",0,5);ctx.restore()})}
function burst(x,y,color,n,speed){for(let i=0;i<n;i++){let a=Math.random()*7,v=speed*(.35+Math.random()*.8);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.4,color,size:2+Math.random()*5})}}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.65);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill()});ctx.globalAlpha=1;floating.forEach(f=>{ctx.globalAlpha=f.life;ctx.fillStyle="#fff4a3";ctx.font="900 18px system-ui";ctx.textAlign="center";ctx.fillText(f.text,f.x,f.y)});ctx.globalAlpha=1}
function drawVignette(){let g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,"transparent");g.addColorStop(1,"#07101688");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function banner(t,ms=900){let el=document.getElementById("waveBanner");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),ms)}
let toastTimer;function toast(t){let e=document.getElementById("toast");e.textContent=t;e.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.opacity=0,1800)}
function updateHUD(){document.getElementById("wave").textContent=wave;document.getElementById("enemyCount").textContent=enemies.length+(waveActive?waveLeft:0);document.getElementById("playerCount").textContent=players.size;document.getElementById("farmBar").style.width=farmHP+"%";document.getElementById("farmBar").style.background=farmHP<30?"#f04a3c":"#f4c94e";document.getElementById("eggCount").textContent=world.eggs.filter(e=>e.hp>0).length}
function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
setTimeout(()=>document.getElementById("lobby").style.display="none",1800);
})();
