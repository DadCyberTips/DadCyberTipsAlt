function startClock(){
  const c=document.getElementById('clock'),d=document.getElementById('date');
  const tick=()=>{
    const n=new Date();
    c.textContent=n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    d.textContent=n.toLocaleDateString('en-US');
  };
  tick();setInterval(tick,1000);
}
