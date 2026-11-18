/* ===== Confirmación de embarque ===== */
const CE_MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CE_FIELDS={ref:'ceRef',client:'ceClient',origin:'ceOrigin',dest:'ceDest',date:'ceDate',time:'ceTime',eta:'ceEta'};
const CE={ref:'',client:'',origin:'',dest:'',date:'',time:'',eta:''};
const ceLogo=new Image();
ceLogo.onload=()=>ceRender();
ceLogo.src=LOGO;

const ceDate=iso=>{
  if(!iso)return '';
  const p=iso.split('-').map(Number);
  return p.length===3&&p[1]>=1&&p[1]<=12?`${p[2]} de ${CE_MONTHS[p[1]-1]} de ${p[0]}`:'';
};
const ceClean=n=>String(n||'').replace(/[\s,]+(?:SRL|S\.R\.L\.?|SA|S\.A\.?|INC\.?|LLC|EIRL|SAS)\.?$/i,'').trim();

/* texto del mensaje (para copiar y para la tarjeta) */
function ceParts(c){
  const ref=c.ref||'[REFERENCIA]',cli=ceClean(c.client)||'[CLIENTE]';
  let carga=`Nos complace anunciarles el zarpe exitoso de su carga con la referencia ${ref}`;
  carga+=c.origin?`, debidamente embarcada en ${c.origin}`:'';
  carga+=c.dest?` con destino a ${c.dest}.`:'.';
  const etd=c.date?`${ceDate(c.date)}${c.time?` a las ${c.time} hrs.`:''}`:'[FECHA Y HORA DE ZARPE]';
  return{
    saludo:`Estimado equipo de ${cli},`,
    carga,etd,
    eta:c.eta?ceDate(c.eta):'',
    cierre:'Quedamos atentos a cualquier consulta.'
  };
}
function ceText(c){
  const p=ceParts(c);
  return `${p.saludo}\n\n${p.carga}\n\nETD: ${p.etd}${p.eta?`\nETA: ${p.eta}`:''}\n\n${p.cierre}\nCordialmente,\nDOWIE | DOP DIVISAS · PARTNERS`;
}

/* tarjeta (canvas) */
function ceWrap(x,text,maxW){
  const out=[];
  String(text).split('\n').forEach(par=>{
    let line='';
    par.split(/\s+/).forEach(w=>{
      const t=line?line+' '+w:w;
      if(line&&x.measureText(t).width>maxW){out.push(line);line=w}else line=t;
    });
    out.push(line);
  });
  return out;
}
function ceRound(x,px,py,w,h,r){
  x.beginPath();
  x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);
  x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();
}
function ceDraw(cv,c){
  const W=1240,H=1754,x=cv.getContext('2d'),F='"Segoe UI",Arial,sans-serif';
  const BL='#1b5fb8',OR='#f7991c',INK='#1d2733',MU='#667085';
  cv.width=W;cv.height=H;
  x.fillStyle='#fff';x.fillRect(0,0,W,H);

  /* logo de DOWIE de fondo, grande y muy tenue */
  if(ceLogo.complete&&ceLogo.naturalWidth){
    const w=1060,h=w*ceLogo.naturalHeight/ceLogo.naturalWidth;
    x.save();x.globalAlpha=.07;x.drawImage(ceLogo,(W-w)/2,(H-h)/2+60,w,h);x.restore();
  }
  /* decoración: círculos translúcidos en las esquinas */
  x.save();
  x.globalAlpha=.10;x.fillStyle=OR;x.beginPath();x.arc(W+40,H-300,300,0,Math.PI*2);x.fill();
  x.globalAlpha=.08;x.fillStyle=BL;x.beginPath();x.arc(-60,H-520,240,0,Math.PI*2);x.fill();
  x.restore();

  /* franja superior */
  x.fillStyle=BL;x.fillRect(0,0,W,270);
  x.save();x.globalAlpha=.14;x.fillStyle='#fff';
  x.beginPath();x.arc(W-90,40,210,0,Math.PI*2);x.fill();
  x.beginPath();x.arc(W-330,250,120,0,Math.PI*2);x.fill();
  x.restore();
  x.fillStyle=OR;x.fillRect(0,270,W,16);

  /* logo en una placa blanca */
  x.fillStyle='#fff';ceRound(x,70,62,400,146,20);x.fill();
  if(ceLogo.complete&&ceLogo.naturalWidth){
    const w=340,h=w*ceLogo.naturalHeight/ceLogo.naturalWidth;
    x.drawImage(ceLogo,100,135-h/2,w,h);
  }
  /* título */
  x.textAlign='right';x.textBaseline='alphabetic';
  x.fillStyle='#fff';x.font=`700 60px ${F}`;x.fillText('CONFIRMACIÓN',W-70,125);
  x.fillStyle=OR;x.font=`700 60px ${F}`;x.fillText('DE EMBARQUE',W-70,198);
  x.textAlign='left';

  /* referencia */
  const refTxt='REF: '+(c.ref||'[REFERENCIA]');
  x.font=`700 46px ${F}`;
  const rw=Math.min(W-200,x.measureText(refTxt).width+90);
  x.fillStyle='#fff6e8';ceRound(x,(W-rw)/2,340,rw,96,48);x.fill();
  x.lineWidth=5;x.strokeStyle=OR;ceRound(x,(W-rw)/2,340,rw,96,48);x.stroke();
  x.fillStyle=INK;x.textAlign='center';x.fillText(refTxt,W/2,404);x.textAlign='left';

  /* texto */
  const p=ceParts(c),L=110,TW=W-2*L;let y=540;
  x.fillStyle=INK;x.font=`700 46px ${F}`;x.fillText(p.saludo,L,y);y+=86;
  x.font=`400 40px ${F}`;
  ceWrap(x,p.carga,TW).forEach(l=>{x.fillText(l,L,y);y+=62});
  y+=40;

  /* ruta */
  if(c.origin||c.dest){
    const ox=L+20,dx=W-L-20,ry=y+30;
    x.fillStyle=OR;x.beginPath();x.arc(ox,ry,16,0,Math.PI*2);x.fill();
    x.setLineDash([16,12]);x.lineWidth=5;x.strokeStyle=BL;x.beginPath();x.moveTo(ox+30,ry);x.lineTo(dx-34,ry);x.stroke();x.setLineDash([]);
    x.fillStyle=BL;x.beginPath();x.moveTo(dx-34,ry-18);x.lineTo(dx,ry);x.lineTo(dx-34,ry+18);x.closePath();x.fill();
    x.fillStyle=INK;
    const fitTxt=t=>{t=String(t||'').toUpperCase();let px=32;x.font=`700 ${px}px ${F}`;while(px>20&&x.measureText(t).width>TW/2-30){px-=2;x.font=`700 ${px}px ${F}`}return t};
    x.textAlign='left';x.fillText(fitTxt(c.origin),L,ry+66);
    x.textAlign='right';x.fillText(fitTxt(c.dest),W-L,ry+66);
    x.textAlign='left';
    x.font=`400 26px ${F}`;x.fillStyle=MU;x.fillText('Zarpe',L,ry-34);x.textAlign='right';x.fillText('Destino',W-L,ry-34);x.textAlign='left';
    y=ry+130;
  }

  /* ETD / ETA */
  const bw=(TW-40)/2,bh=c.eta?220:200;
  const box=(bx,label,lines)=>{
    x.fillStyle='#fff6e8';ceRound(x,bx,y,bw,bh,22);x.fill();
    x.lineWidth=5;x.strokeStyle=OR;ceRound(x,bx,y,bw,bh,22);x.stroke();
    x.fillStyle=OR;ceRound(x,bx,y,16,bh,8);x.fill();
    x.fillStyle=BL;x.font=`700 46px ${F}`;x.fillText(label,bx+44,y+66);
    x.fillStyle=INK;x.font=`600 34px ${F}`;
    let ly=y+122;lines.forEach(t=>{ceWrap(x,t,bw-80).forEach(l=>{x.fillText(l,bx+44,ly);ly+=46})});
  };
  const etdLines=c.date?[ceDate(c.date)].concat(c.time?[`${c.time} hrs.`]:[]):['—'];
  box(L,'ETD',etdLines);
  box(L+bw+40,'ETA',c.eta?[ceDate(c.eta)]:['Por confirmar']);
  y+=bh+80;

  /* cierre */
  x.fillStyle=INK;x.font=`400 40px ${F}`;
  x.fillText(p.cierre,L,y);y+=70;
  x.font=`700 40px ${F}`;x.fillText('Cordialmente,',L,y);y+=60;
  x.fillStyle=BL;x.fillText('Equipo DOWIE',L,y);

  /* pie */
  x.fillStyle=OR;x.fillRect(0,H-150,W,10);
  x.fillStyle=BL;x.fillRect(0,H-140,W,140);
  x.fillStyle='#fff';x.textAlign='center';x.font=`700 32px ${F}`;
  x.fillText('DOWIE | DOP DIVISAS · PARTNERS',W/2,H-76);
  x.font=`400 28px ${F}`;x.fillText('dopdivisas@gmail.com   •   809-592-0826',W/2,H-30);
  x.textAlign='left';
}
function ceRender(){const cv=document.getElementById('ceCv');if(cv)ceDraw(cv,CE)}

/* interfaz */
function ceClients(){
  const sel=$('#ceSel');if(!sel||typeof siClients==='undefined')return;
  const cur=sel.value;
  sel.innerHTML='<option value="">— Elegir de la lista (o escribir abajo) —</option>'+siClients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  sel.value=cur;
}
function ceReadForm(){Object.keys(CE_FIELDS).forEach(k=>{CE[k]=$('#'+CE_FIELDS[k]).value.trim()})}
function ceMissing(){
  const m=[];
  if(!CE.ref)m.push('Referencia');if(!CE.client)m.push('Cliente');if(!CE.origin)m.push('Lugar de zarpe');
  if(!CE.dest)m.push('Destino');if(!CE.date)m.push('Fecha de zarpe');if(!CE.time)m.push('Hora');
  return m;
}
function ceOk(){const m=ceMissing();if(!m.length)return true;toast('Falta: '+m.join(', '));return false}
const ceName=ext=>'Confirmacion_Embarque_'+(CE.ref||'DOWIE').replace(/[^\w-]+/g,'_')+'.'+ext;
function ceBlob(){return new Promise(res=>$('#ceCv').toBlob(res,'image/png'))}

function ceBind(){
  Object.values(CE_FIELDS).forEach(id=>$('#'+id).addEventListener('input',()=>{ceReadForm();ceRender()}));
  $('#ceSel').onchange=()=>{
    const c=siClients.find(x=>x.id===$('#ceSel').value);if(!c)return;
    $('#ceClient').value=ceClean(c.name);ceReadForm();ceRender();
  };
  $('#cePng').onclick=async()=>{if(!ceOk())return;try{siSave(await ceBlob(),ceName('png'));toast('Imagen descargada')}catch(e){toast('No se pudo generar la imagen')}};
  $('#cePdf').onclick=async()=>{
    if(!ceOk())return;
    try{
      await need('jspdf');
      const doc=new window.jspdf.jsPDF({unit:'pt',format:'a4'});
      doc.addImage($('#ceCv').toDataURL('image/jpeg',.95),'JPEG',0,0,595.28,841.89);
      doc.save(ceName('pdf'));toast('PDF descargado');
    }catch(e){toast(e.message||'No se pudo generar el PDF')}
  };
  $('#ceCopy').onclick=async()=>{
    if(!ceOk())return;const t=ceText(CE);
    try{await navigator.clipboard.writeText(t)}
    catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(er){}a.remove()}
    toast('Mensaje copiado');
  };
  if(navigator.canShare){
    const b=$('#ceShare');b.style.display='';
    b.onclick=async()=>{
      if(!ceOk())return;
      try{
        const f=new File([await ceBlob()],ceName('png'),{type:'image/png'});
        if(navigator.canShare({files:[f]}))await navigator.share({files:[f],text:ceText(CE)});else toast('Tu dispositivo no permite compartir imágenes desde aquí');
      }catch(e){if(e&&e.name!=='AbortError')toast('No se pudo compartir')}
    };
  }
}
let ceLoaded=false;
function ceOpen(){if(!ceLoaded){ceLoaded=true;ceBind();ceClients();ceReadForm()}ceRender()}
$('#tCE').onclick=()=>{tab(3);ceOpen()};
