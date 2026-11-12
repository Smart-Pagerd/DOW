const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
const TAX={'0.0% Z Export':0,'Exempt':0,'18% S':.18};
const NOTES="TERMINOS Y CONDICIONES:\n- Reclamaciones por cargas no aseguradas no serán aceptadas, en caso de requerir asegurar su mercancía con nosotros debe notificar por correo, el costo del mismo para carga general es de USD 0.50 por cada USD 100.00 del Valor CIF + 10% (Min. USD 55.00).\n- Frecuencia de salidas semanal.\n- Tarifas aplicables al momento de la salida desde Puerto de Carga.\n- Roll overs y/o cancelaciones estarán sujetas a costos adicional.\n- Tarifas incluyen DTHC y cargos locales de la línea naviera en destino.\n- Tarifas no incluyen cargos por Overweight y/o Oversize.\n- Tarifas sujetas a cargos de inspección en origen y/o en puertos de Trasbordo.\n- Todos los cargos adicionales son VATOS (Valid At the Time Of Shipping).\n- Tarifas no incluyen ITBIS 18%.\n- Tarifas sujetas a disponibilidad de equipos y espacios.\n- No incluido DPH/PORTCOLLECT & DPW/HIT";
const PRE={aduana:{p:'Gestion Aduanal de 1-4 Items',d:'Servicio incluye verificacion dos veces, declaracion y despacho de carga. Valido para 1-4 items Tarifa fija NO INCLUIDO SERV. VUCE.RD',r:600,t:'18% S'},terrestre:{p:'FLETE TERRESTRE',d:'DESDE: CAUCEDO\nHASTA: SDO',r:230,t:'Exempt'}};
let Q=null,editId=null,catalog=[],busy=false;

/* ---------- UI helpers ---------- */
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),3200)}
function count(el,to){const from=parseFloat(el.dataset.v||0);el.dataset.v=to;if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=fmt(to);return}const t0=performance.now();(function s(t){const k=Math.min(1,(t-t0)/600),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(s)})(t0)}
function tab(n){$('#vNew').style.display=n?'none':'';$('#vCat').classList.toggle('on',!!n);$('#tNew').classList.toggle('on',!n);$('#tCat').classList.toggle('on',!!n)}
$('#tNew').onclick=()=>tab(0);$('#tCat').onclick=()=>tab(1);

/* ---------- PDF reading ---------- */
async function readPdf(file){
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,out=[];
  for(let p=1;p<=pdf.numPages;p++){
    const tc=await(await pdf.getPage(p)).getTextContent(),rows=[];
    tc.items.forEach(it=>{if(!it.str.trim())return;const y=it.transform[5],x=it.transform[4];let r=rows.find(r=>Math.abs(r.y-y)<3);if(!r){r={y,a:[]};rows.push(r)}r.a.push({x,w:it.width,s:it.str})});
    rows.sort((a,b)=>b.y-a.y).forEach(r=>{r.a.sort((a,b)=>a.x-b.x);let t='',end=null;r.a.forEach(i=>{if(end!==null){const g=i.x-end;t+=g>8?'  ':g>1?' ':''}t+=i.s;end=i.x+i.w});out.push(t.trim())});
  }
  return out;
}
function parseQuote(lines){
  const J=lines.join('\n'),m={},items=[];let sec='orig',total=null,done=false;
  m.ref=(J.match(/\b(CT-\d{4,}|[A-Z]{2,4}-\d{5,})\b/)||[])[1]||'';
  const ci=lines.findIndex(l=>/^CLIENTE\b/i.test(l));if(ci>=0&&lines[ci+1])m.client=lines[ci+1].split(/\s{2,}/)[0].trim();
  const g=re=>{for(const l of lines){const r=l.match(re);if(r)return r[1].trim()}return''};
  m.origin=g(/OR[IÍ]GEN:\s*(.+?)(?:\s{2,}|$)/i);m.dest=g(/DESTINO:\s*(.+?)(?:\s{2,}|$)/i);m.inco=g(/INCOTERM:\s*(\S+)/i);m.weight=g(/PESO:\s*(.+?)(?:\s{2,}|$)/i);m.vol=g(/VOLUMEN:\s*(.+?)(?:\s{2,}|$)/i);m.type=g(/TIPO DE EMBARQUE:\s*(\S+)/i);
  const dates=J.match(/\d{2}\/\d{2}\/\d{4}/g)||[];m.valid=dates[1]||'';
  m.src=/pier\s*17/i.test(J)?'Pier 17':/neutral/i.test(J)?'Neutral Logistics':'Proveedor';
  const rowRe=/^(.*?)\s+(USD|EUR|US\$)\s+([\d,]+\.\d{2})\s+(\S+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d,]+\.\d{2})$/;
  for(const raw of lines){
    if(done)break;
    if(/^CARGOS?\s+(DE\s+)?ORIGEN/i.test(raw)){sec='orig';continue}
    if(/^CARGOS?\s+(DE\s+)?FLETE/i.test(raw)){sec='freight';continue}
    if(/^CARGOS?\s+(DE\s+)?DESTINO/i.test(raw)){sec='dest';continue}
    const t=raw.replace(/\s{2,}/g,' ');
    if(/^TOTAL\s+(GENERAL|USD)?/i.test(t)){const a=t.match(/([\d,]+\.\d{2})\s*$/);if(a){total=parseFloat(a[1].replace(/,/g,''));done=true}continue}
    if(/neutrallogistic|^\(\d{3}\)|^Ave\.|^NL Neutral|^DESCRIPCI/i.test(t))continue;
    let r=t.match(rowRe);
    if(r){items.push({name:r[1],total:parseFloat(r[8].replace(/,/g,'')),sec});continue}
    const f=t.match(/^([A-Za-zÁÉÍÓÚáéíóú][^$]{2,}?)\s+(?:USD|US\$|\$)?\s?([\d,]+\.\d{2})$/);
    if(f&&!/total|subtotal|fecha|tel|vigencia/i.test(f[1])){let s=sec;if(/freight|flete/i.test(f[1]))s='freight';else if(/CFS|THC|FHC|destin|delivery/i.test(f[1]))s='dest';items.push({name:f[1],total:parseFloat(f[2].replace(/,/g,'')),sec:s})}
  }
  const sum=r2(items.reduce((a,i)=>a+i.total,0));
  return{m,items,total:total!=null?total:sum};
}
function ratioFor(T){const x=Math.min(1,Math.max(0,Math.log(Math.max(T,1)/500)/Math.log(40)));return .18+(.945-.18)*x}
function today(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function isoFrom(s){const a=(s||'').split('/').map(Number);if(a.length!==3)return'';let[mm,dd,y]=a;if(mm>12){[mm,dd]=[dd,mm]}const p=n=>String(n).padStart(2,'0');return y+'-'+p(mm)+'-'+p(dd)}
function nextNum(){const d=new Date(),p=n=>String(n).padStart(2,'0');return'CT-'+p(d.getDate())+p(d.getMonth()+1)+d.getFullYear()+'-'+String(catalog.length+1).padStart(3,'0')}

function autoLines(){
  const{m,items,total}=Q.src;if(!items.length)return[];
  const S={orig:0,freight:0,dest:0};items.forEach(i=>S[i.sec]+=i.total);
  const ratio=ratioFor(total),V={};let acc=0;
  for(const k in S){V[k]=r2(S[k]*ratio);acc+=V[k]}
  const diff=r2(total*ratio-acc),first=['freight','orig','dest'].find(k=>S[k]>0);V[first]=r2(V[first]+diff);
  const L=[];
  if(S.freight>0)L.push({p:'FLETE MARITIMO '+(m.type||''),d:[(m.origin&&m.dest)?m.origin+' a '+m.dest:'',[m.weight,m.vol].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),q:1,r:V.freight,t:'0.0% Z Export'});
  if(S.orig>0)L.push({p:'CARGOS EN ORIGEN',d:m.inco||'',q:1,r:V.orig,t:'Exempt'});
  if(S.dest>0)L.push({p:'CARGOS EN DESTINO',d:'Cargos de la linea naviera, INCLUIDO: FHC Freight Handling Charge, THC Destino, BL destino.',q:1,r:V.dest,t:'18% S'});
  return L;
}

/* ---------- Editor ---------- */
function startQuote(src,saved){
  if(saved){Q=JSON.parse(JSON.stringify(saved));Q.src=saved.srcInfo||{m:{src:saved.origSrc||'NL'},items:[],total:saved.origTotal||0};editId=saved.id}
  else{
    editId=null;const m=src.m;
    Q={number:nextNum(),date:today(),due:isoFrom(m.valid)||today(new Date(Date.now()+7*864e5)),bill:m.client||'',ship:m.client||'',notes:NOTES,origRef:m.ref,origSrc:m.src||'',origTotal:src.total,src};
    Q.lines=autoLines();
  }
  $('#fNum').value=Q.number;$('#fDate').value=Q.date;$('#fDue').value=Q.due;$('#fBill').value=Q.bill;$('#fShip').value=Q.ship;$('#fNotes').value=Q.notes;
  $('#oSrc').textContent=Q.origSrc||'NL';
  $('#editor').classList.add('on');renderLines();calc();
  $('#editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderLines(){
  $('#lines').innerHTML=Q.lines.map((l,i)=>`<div class="line" style="animation-delay:${i*60}ms" data-i="${i}">
    <div class="g2"><div><label>Producto o servicio</label><input data-k="p" value="${esc(l.p)}"></div><div><label>Descripción</label><textarea data-k="d" rows="2">${esc(l.d)}</textarea></div></div>
    <div class="lr"><div><label>Impuesto</label><select data-k="t">${Object.keys(TAX).map(k=>`<option${k===l.t?' selected':''}>${k}</option>`).join('')}</select></div>
    <div><label>Cant.</label><input type="number" min="0" step="1" data-k="q" value="${l.q}"></div><div><label>Tarifa</label><input type="number" min="0" step="0.01" data-k="r" value="${l.r}"></div>
    <div><label>Importe</label><input disabled value="${fmt(l.q*l.r)}" data-amt></div><button class="x" data-del>Quitar</button></div></div>`).join('');
}
$('#lines').addEventListener('input',e=>{const row=e.target.closest('.line');if(!row)return;const l=Q.lines[+row.dataset.i],k=e.target.dataset.k;if(!k)return;l[k]=(k==='q'||k==='r')?(parseFloat(e.target.value)||0):e.target.value;row.querySelector('[data-amt]').value=fmt(l.q*l.r);calc()});
$('#lines').addEventListener('click',e=>{if(e.target.dataset.del!==undefined){Q.lines.splice(+e.target.closest('.line').dataset.i,1);renderLines();calc()}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-add]');if(!a||!Q)return;const p=PRE[a.dataset.add];Q.lines.push(p?{p:p.p,d:p.d,q:1,r:p.r,t:p.t}:{p:'',d:'',q:1,r:0,t:'Exempt'});renderLines();calc()});
$('#reset').onclick=()=>{if(!Q||!Q.src.items.length)return toast('No hay PDF original para recalcular');Q.lines=autoLines();renderLines();calc();toast('Precio recalculado')};
['fNum','fDate','fDue','fBill','fShip','fNotes'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(Q)Qset({fNum:'number',fDate:'date',fDue:'due',fBill:'bill',fShip:'ship',fNotes:'notes'}[id],$('#'+id).value)}));
function Qset(k,v){Q[k]=v}
function totals(q){
  const sub=r2(q.lines.reduce((a,l)=>a+l.q*l.r,0)),by={};
  q.lines.forEach(l=>{by[l.t]=r2((by[l.t]||0)+l.q*l.r)});
  let tax=0;const rows=Object.keys(by).map(k=>{const t=r2(by[k]*TAX[k]);tax+=t;return{label:k,base:by[k],tax:t,rate:TAX[k]*100}});
  return{sub,rows,tax:r2(tax),total:r2(sub+tax)};
}
function calc(){
  const T=totals(Q);
  count($('#dSub'),T.sub);count($('#gTot'),T.total);
  $('#oTot').textContent=fmt(Q.origTotal);
  const d=Q.origTotal?((T.sub-Q.origTotal)/Q.origTotal*100):0;$('#dif').textContent=(d>0?'+':'')+d.toFixed(1)+'%';
  $('#taxes').innerHTML=`<div><span>Subtotal</span><span>${fmt(T.sub)}</span></div>`+T.rows.map(r=>`<div><span>ITBIS @ ${r.rate}% sobre ${fmt(r.base)}</span><span>${fmt(r.tax)}</span></div>`).join('');
}

/* ---------- Upload flow ---------- */
const drop=$('#drop'),fileIn=$('#file');
drop.onclick=()=>fileIn.click();
['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{if(e.dataTransfer.files[0])handle(e.dataTransfer.files[0])});
fileIn.onchange=()=>{if(fileIn.files[0])handle(fileIn.files[0]);fileIn.value=''};
$('#blank').onclick=()=>{startQuote({m:{src:'Manual'},items:[],total:0});Q.lines=[{p:'',d:'',q:1,r:0,t:'Exempt'}];renderLines();calc()};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function handle(file){
  if(busy)return;if(!/pdf$/i.test(file.type)&&!/\.pdf$/i.test(file.name))return toast('Sube un archivo PDF');
  busy=true;const st=[...document.querySelectorAll('.st')];$('#steps').classList.add('on');st.forEach(s=>s.className='st');st[0].classList.add('act');
  try{
    const lines=await readPdf(file);st[0].className='st done';st[1].classList.add('act');await wait(450);
    if(!lines.length)throw new Error('El PDF no tiene texto legible (¿es un escaneo?)');
    const src=parseQuote(lines);st[1].className='st done';st[2].classList.add('act');await wait(450);
    if(!src.items.length)throw new Error('No pude identificar los cargos en este PDF. Puedes crear la cotización manualmente.');
    st[2].className='st done';startQuote(src);toast('Revisa los datos antes de descargar');
  }catch(e){toast(e.message||'No pude leer el PDF');st.forEach(s=>s.className='st')}
  busy=false;
}

/* ---------- PDF generation ---------- */
const dmy=s=>s?s.split('-').reverse().join('/'):'';
function makePdf(q){
  const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'}),W=612,BL=[31,111,214],INK=[38,38,38],MU=[110,110,110],LN=[222,222,222];
  const F=(s,b)=>{doc.setFont('helvetica',b?'bold':'normal');doc.setFontSize(s)},T=(s,x,y,o)=>doc.text(String(s),x,y,o);
  doc.setTextColor(...BL);F(11,1);T('COTIZACIÓN',30,42);
  doc.setTextColor(...INK);F(7,1);T('DOP DIVISAS | DOWIE. PARTNERS',30,58);F(6.8);
  T('N.º de registro de la empresa N.º 1-',30,70);T('32-12996-2',30,80);T('ITBIS N.º de registro 132129962',30,92);
  ['Calle 17, SD Villa Carmen','Santo Domingo, Santo Domingo','11901','dopdivisas@gmail.com','+18095920826'].forEach((s,i)=>T(s,150,58+i*11));
  doc.addImage(LOGO,'PNG',322,24,240,60);
  doc.setFillColor(234,243,252);doc.rect(0,120,W,150,'F');
  F(7,1);T('Facturar a',30,142);T('Enviar a',386,142);F(8);T(q.bill||'',30,156);T(q.ship||'',386,156);
  doc.setDrawColor(190,200,215);doc.setLineDashPattern([1.5,2],0);doc.line(30,190,570,190);doc.setLineDashPattern([],0);
  F(8,1);T('Detalles de Cotización',30,214);F(7.5);T('N.º de Cotización: '+q.number,30,228);T('Fecha de Cotización: '+dmy(q.date),30,240);T('Fecha de vencimiento: '+dmy(q.due),30,252);
  let y=300;const head=()=>{F(8);doc.setTextColor(...INK);T('N.º',30,y);T('Fecha',52,y);T('Producto o servicio',100,y);T('Descripción',212,y);T('Cant.',394,y,{align:'right'});T('Tarifa',448,y,{align:'right'});T('Importe',502,y,{align:'right'});T('Impuesto',512,y);doc.setDrawColor(...LN);doc.line(30,y+8,570,y+8);y+=8};
  head();
  q.lines.forEach((l,i)=>{
    F(7);const dl=doc.splitTextToSize(l.d||'',150),pl=(F(7.2,1),doc.splitTextToSize(l.p||'',100)),h=Math.max(30,Math.max(dl.length,pl.length)*9+18);
    if(y+h>730){doc.addPage();y=50;head()}
    doc.setTextColor(...INK);F(7.5);T((i+1)+'.',30,y+17);F(7.2,1);pl.forEach((s,k)=>T(s,100,y+17+k*9));F(7);dl.forEach((s,k)=>T(s,212,y+17+k*9));
    F(7.5);T(l.q,394,y+17,{align:'right'});T(fmt(l.r),448,y+17,{align:'right'});T(fmt(l.q*l.r),502,y+17,{align:'right'});T(l.t,512,y+17);
    doc.setDrawColor(...LN);doc.line(30,y+h,570,y+h);y+=h;
  });
  const t=totals(q);let y0=y+28;const bh=22*(t.rows.length+1)+44;
  if(y0+bh>745){doc.addPage();y0=50}
  let ry=y0;F(8);doc.setTextColor(...INK);
  T('Subtotal',380,ry);T(fmt(t.sub),570,ry,{align:'right'});ry+=22;
  t.rows.forEach(r=>{T('ITBIS @ '+r.rate+'% on '+fmt(r.base),380,ry);T(fmt(r.tax),570,ry,{align:'right'});ry+=22});
  doc.setDrawColor(...LN);doc.line(380,ry-12,570,ry-12);F(9,1);T('Total',380,ry+6);F(14,1);T(fmt(t.total),570,ry+6,{align:'right'});
  F(11);doc.setTextColor(...INK);T('Nota para el cliente',40,y0+4);F(7);doc.setTextColor(...MU);
  let ny=y0+22;doc.splitTextToSize(q.notes||'',300).forEach(s=>{if(ny>745){doc.addPage();ny=50}T(s,40,ny);ny+=9.5});
  let ay=Math.max(ny+36,650);if(ay>740){doc.addPage();ay=650}
  doc.setTextColor(...INK);F(7,1);T('Fecha de',400,ay-24);T('vencimiento',400,ay-15);F(8);T(dmy(q.due),470,ay-18);
  F(7.5);T('Fecha de aceptación',30,ay);T('Aceptado por',210,ay);doc.setDrawColor(150,150,150);doc.line(30,ay+30,180,ay+30);doc.line(210,ay+30,420,ay+30);
  return doc;
}
function download(q){
  try{const doc=makePdf(q);doc.save('Cotizacion_'+(q.number||'DOWIE').replace(/[^\w-]/g,'')+'.pdf');toast('PDF descargado')}catch(e){toast('No se pudo generar el PDF')}
}
$('#bPdf').onclick=()=>Q&&download(Q);

/* ---------- Catalog (shared db with local fallback) ---------- */
const LS='dowie_cts';
function lsLoad(){try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){return[]}}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(catalog))}catch(e){}}
function save(){
  if(!Q)return;if(!Q.lines.length)return toast('Agrega al menos una línea');
  const T=totals(Q),id=editId||'q'+Date.now().toString(36);
  const rec={number:Q.number,date:Q.date,due:Q.due,bill:Q.bill,ship:Q.ship,notes:Q.notes,lines:Q.lines,origRef:Q.origRef||'',origSrc:Q.origSrc||'',origTotal:Q.origTotal||0,total:T.total,sub:T.sub,createdAt:Q.createdAt||Date.now(),updatedAt:Date.now()};
  try{
    {const i=catalog.findIndex(c=>c.id===id);const o=Object.assign({id},rec);if(i>=0)catalog[i]=o;else catalog.push(o);lsSave();renderCat()}
    editId=id;Q.createdAt=rec.createdAt;toast('Guardada en el catálogo');
  }catch(e){toast('No se pudo guardar')}
}
$('#bSave').onclick=save;
function renderCat(){
  $('#cnt').textContent=catalog.length;
  const f=($('#q').value||'').toLowerCase(),a=catalog.filter(c=>(c.number+' '+c.bill).toLowerCase().includes(f)).sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  $('#list').innerHTML=a.length?a.map((c,i)=>`<div class="card item" style="animation-delay:${i*50}ms" data-id="${esc(c.id)}"><div><b>${esc(c.number)}</b><small>${esc(c.bill||'Sin cliente')} · ${esc(dmy(c.date))}${c.origRef?' · Ref. '+esc(c.origRef):''}</small></div>
    <div style="text-align:right"><b>${fmt(c.total)}</b><small>original ${fmt(c.origTotal)}</small></div>
    <div style="display:flex;gap:6px"><button class="btn sm" data-a="pdf">PDF</button><button class="btn gh sm" data-a="edit">Editar</button><button class="btn gh sm" data-a="del">Eliminar</button></div></div>`).join(''):'<div class="card empty">No hay cotizaciones guardadas.</div>';
}
$('#q').oninput=renderCat;
$('#list').addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const c=catalog.find(x=>x.id===b.closest('.item').dataset.id);if(!c)return;
  if(b.dataset.a==='pdf')download(c);
  if(b.dataset.a==='edit'){tab(0);startQuote(null,c)}
  if(b.dataset.a==='del'){
    if(!b.dataset.sure){b.dataset.sure=1;b.textContent='¿Seguro?';setTimeout(()=>{b.dataset.sure='';b.textContent='Eliminar'},3000);return}
    catalog=catalog.filter(x=>x!==c);lsSave();renderCat();toast('Cotización eliminada')
  }
});
$('#exp').onclick=()=>{const b=new Blob([JSON.stringify(catalog,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='catalogo-dowie.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#imp').onclick=()=>$('#impf').click();
$('#impf').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const a=JSON.parse(await f.text());if(!Array.isArray(a))throw 0;a.forEach(c=>{if(c&&c.id&&c.lines){const i=catalog.findIndex(x=>x.id===c.id);if(i>=0)catalog[i]=c;else catalog.push(c)}});lsSave();renderCat();toast('Catálogo importado')}catch(er){toast('Archivo no válido')}e.target.value=''};
catalog=lsLoad();renderCat();
