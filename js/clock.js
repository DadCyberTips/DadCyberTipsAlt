function startClock(){
  const c=document.getElementById('clock'),d=document.getElementById('date');
  const tick=()=>{
    const n=new Date();
    const tz=window.SYS?SYS.tz:undefined;   // Cape Canaveral, FL
    c.textContent=n.toLocaleTimeString('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'});
    d.textContent=n.toLocaleDateString('en-US',{timeZone:tz});
  };
  tick();setInterval(tick,1000);
}
