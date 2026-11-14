/* ===== Shipping Instruction ===== */
const SI_INCO=['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];
const SI_CLIENTS=[
 {id:'grupo-armir',name:'GRUPO ARMIR SRL',rnc:'132-397495'},
 {id:'dracma',name:'DRACMA SRL',rnc:'132732626'},
 {id:'world-solving',name:'WORLD SOLVING SRL',rnc:'133477351'},
 {id:'ballester-hermanos',name:'BALLESTER HERMANOS',rnc:'66-0175269'},
 {id:'grupo-cgar',name:'GRUPO CGAR',rnc:'131560921'},
 {id:'inmek-srl',name:'INMEK SRL',rnc:''},
 {id:'share-capital',name:'SHARE CAPITAL DEVELOPMENT & CONSULTING BY JAMCO SRL',rnc:'1-32-26711-7'},
 {id:'lantor-auto-parts',name:'LANTOR AUTO PARTS SRL',rnc:''},
 {id:'b-fernandez',name:'B. FERNANDEZ & HNOS., INC.',rnc:''},
 {id:'interflash-imser',name:'INTERFLASH MULTI SERVICIOS IMSER SRL',rnc:'132466594'},
 {id:'megared-telecom',name:'MEGARED TELECOM SRL',rnc:'132455541'}
];
const SI_NOTIFY={name:'DOMINICAN WORLDWIDE IMPEX',address:'Calle 17, SD Villa Carmen Santo Domingo, Santo Domingo 11901',contact:'Elvis Suarez',phone:'809-592-0826',email:'dopdivisas@gmail.com',rnc:'133368862'};
const siBlank=()=>({id:null,ref:'',date:'',svc:'',client:'',
 shipper:{name:'',address:'',contact:'',phone:'',email:'',tax:''},
 cnee:{name:'',address:'',contact:'',phone:'',email:'',rnc:''},
 notify:Object.assign({},SI_NOTIFY),
 ship:{origin:'',po:'',pol:'',pod:'CAUCEDO',dest:'',inco:'',mov:'',ready:'',etd:''},
 cargo:{pieces:'',gw:'',cbm:'',equip:'',desc:'',haz:'',hazd:'',eur1:''},
 comments:''});
const siDmy=s=>s?String(s).split('-').reverse().join('/'):'';
const siN=v=>(v===''||v==null||isNaN(+v))?'':String(+(+v).toFixed(2));
function siGet(o,p){return p.split('.').reduce((a,k)=>a==null?'':a[k],o)}
function siSet(o,p,v){const k=p.split('.');let a=o;while(k.length>1)a=a[k.shift()];a[k[0]]=v}

/* ---- lectura del packing list (grid = filas de celdas) ---- */
function siSplitHead(t){
  let L=t.split(/\n/).map(x=>x.trim()).filter(Boolean);
  if(L.length<2){
    const s=t.replace(/\s+/g,' ').trim(),tel=s.search(/\bTEL\b/i);
    const body=tel>0?s.slice(0,tel).trim():s,rest=tel>0?s.slice(tel):'';
    const m=body.match(/^(.*?\b(?:CO\.?,?\s*LTD\.?|LIMITED|LTD\.?|INC\.?|CORP\.?|CORPORATION|COMPANY|FACTORY|GMBH)\.?)\s*(.*)$/i);
    L=(m?[m[1].trim(),m[2].trim(),rest]:[body,rest]).filter(Boolean);
  }
  return L;
}
function siParse(grid){
  const cells=[];
  grid.forEach((row,r)=>(row||[]).forEach((v,c)=>{if(v!==undefined&&v!==null&&String(v).trim()!=='')cells.push({r,c,v})}));
  const T=c=>String(c.v),first=re=>cells.find(c=>re.test(T(c).trim()));
  const rightOf=c=>cells.filter(x=>x.r===c.r&&x.c>c.c).sort((a,b)=>a.c-b.c)[0];
  const num=v=>{if(typeof v==='number')return v;const n=parseFloat(String(v).replace(/,/g,''));return isNaN(n)?null:n};
  /* valor de una etiqueta: lo que sigue en la misma celda o, si no hay, la celda de la derecha */
  const val=re=>{
    const c=first(re);if(!c)return '';
    const t=T(c).trim(),m=t.match(re),same=t.slice(m.index+m[0].length).replace(/^[\s:：\-]+/,'').trim();
    if(same)return same;
    const r=rightOf(c),v=r?T(r).trim():'';
    return /[:：]\s*$/.test(v)?'':v;
  };
  const out={shipper:{},cnee:{},ship:{},cargo:{},found:{}};
  /* embarcador */
  const pool=cells.filter(c=>c.r<5);
  const notLabel=c=>!/^(?:ADD(?:RESS)?|TO|FROM|CONSIGNEE|INV|DATE)\b/i.test(T(c).trim());
  const head=pool.find(c=>notLabel(c)&&/\bTEL\s*[:：]/i.test(T(c)))||pool.find(c=>notLabel(c)&&T(c).includes('\n'))||pool.find(c=>notLabel(c)&&/\bLTD\b|CO\.,/i.test(T(c)))||cells.find(c=>c.r<3&&notLabel(c));
  if(head){
    const L=siSplitHead(T(head)),rest=L.slice(2).join(' ');
    out.shipper.name=(L[0]||'').replace(/^(FROM|SHIPPER)\s*[:：]\s*/i,'');out.shipper.address=L[1]||'';
    const t=rest.match(/TEL\s*[:：]?\s*([+\d][\d\s\-+()]*\d)/i);if(t)out.shipper.phone=t[1].trim();
    const k=rest.match(/CONTACT\s*[:：]?\s*(.+)$/i);if(k)out.shipper.contact=k[1].trim();
    const em=rest.match(/[\w.+-]+@[\w-]+\.[\w.]+/);if(em)out.shipper.email=em[0];
  }
  if(!out.shipper.name){const f=val(/^(?:FROM|SHIPPER|EXPORTER)\s*[:：]/i);if(f)out.shipper.name=f.split(/\n/)[0].trim()}
  /* consignatario */
  const toRaw=val(/^(?:TO|CONSIGNEE|SHIP\s*TO|SOLD\s*TO|BUYER)\s*[:：]/i)||val(/^CONSIGNEE\b/i);
  if(toRaw){const L=toRaw.split(/\n/).map(x=>x.trim()).filter(Boolean);out.cnee.name=L[0]||'';if(L[1])out.cnee.address=L[1]}
  const adRaw=val(/^ADD(?:RESS)?\s*[:：]/i);
  if(adRaw){
    const L=adRaw.split(/\n/).map(x=>x.trim()).filter(Boolean);let addr=L[0]||'',rest=L.slice(1).join(' ');
    const ci=addr.search(/\s+Contacts?\s*[:：]/i);if(ci>0){rest=(addr.slice(ci)+' '+rest).trim();addr=addr.slice(0,ci).trim()}
    out.cnee.address=addr||out.cnee.address||'';if(!rest)rest=adRaw;
    const m=rest.match(/Contacts?\s*[:：]\s*(.*?)\s+Tel\s*[:：]?\s*([+\d][\d\s\-+()]*\d)/i);
    if(m){out.cnee.contact=m[1].trim();out.cnee.phone=m[2].trim()}
    else{const t=rest.match(/Tel\s*[:：]?\s*([+\d][\d\s\-+()]*\d)/i);if(t)out.cnee.phone=t[1].trim()}
    const em=rest.match(/[\w.+-]+@[\w-]+\.[\w.]+/);if(em)out.cnee.email=em[0];
  }
  /* embarque */
  const po=val(/^INV(?:OICE)?\.?\s*NO\.?\s*[:：]?/i);if(po)out.po=po;
  const pol=val(/^(?:Ports?\s+of\s+loading|Loading\s+Port|Port\s+of\s+Shipment|POL)\s*[:：]?/i);if(pol)out.ship.pol=pol;
  const pod=val(/^(?:Ports?\s+of\s+(?:discharge|destination)|Discharge\s+Port|Destination\s+Port|POD)\s*[:：]?/i);if(pod)out.ship.pod=pod;
  /* totales */
  const tot=re=>{
    const c=first(re);if(!c)return null;
    const t=T(c).trim(),m=t.match(re),mm=t.slice(m.index+m[0].length).match(/-?\d[\d,]*\.?\d*/);
    if(mm)return num(mm[0]);
    const r=cells.filter(x=>x.r===c.r&&x.c>c.c&&num(x.v)!==null).sort((a,b)=>a.c-b.c)[0];
    return r?num(r.v):null;
  };
  let ct=tot(/^(?:TTL|TOTAL)\.?\s*(?:CTNS|CARTONS?|PKGS?|PACKAGES?|BULTOS)\b\s*[:：]?/i);
  let gw=tot(/^(?:TTL|TOTAL)\.?\s*(?:G\.?\s*W\.?|GROSS(?:\s*WEIGHT)?)\b\s*[:：]?/i);if(gw==null)gw=tot(/^GROSS\s*WEIGHT\s*[:：]?/i);
  let cb=tot(/^(?:TTL|TOTAL)\.?\s*(?:CBM|VOLUME|MEASUREMENT|M3)\b\s*[:：]?/i);if(cb==null)cb=tot(/^CBM\s*[:：]/i);
  /* tabla de artículos: descripción y respaldo de totales */
  const hdr=first(/^(?:DES\.?|DESCRIPTION(?:\s+OF\s+GOODS)?|ITEM\s+DESCRIPTION|DESCRIPCI[ÓO]N)$/i);
  const descs=[];
  if(hdr){
    const col=n=>{const c=cells.find(x=>x.r===hdr.r&&n.test(T(x).trim()));return c?c.c:-1};
    const cD=hdr.c,cE=col(/^(?:CNTS|CTNS|CARTONS?|PKGS?)$/i),cG=col(/^G\.?\s*W/i),cS=col(/CTNS?\s*SIZE|CARTON\s*SIZE|MEAS/i);
    let sc=0,sg=0,sv=0,n=0;
    for(let r=hdr.r+1;r<grid.length;r++){
      const g=grid[r]||[],at=c=>(c>=0?g[c]:null);
      if(g.some(v=>/^(?:MARK|TTL|TOTAL)/i.test(String(v==null?'':v).trim())))break;
      const d=at(cD);if(d&&String(d).trim())descs.push(String(d).replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim().toUpperCase());
      const e=num(at(cE));
      if(e!==null){sc+=e;n++;const gg=num(at(cG));if(gg!==null)sg+=gg*e;
        const a=num(at(cS)),b=num(at(cS+1)),c=num(at(cS+2));if(a&&b&&c)sv+=a*b*c*e/1e6}
    }
    if(n){if(ct==null)ct=sc;if(gw==null)gw=sg;if(cb==null&&sv)cb=sv}
  }
  const r2=x=>x==null?'':Math.round(x*100)/100;
  out.cargo.pieces=ct==null?'':ct;out.cargo.gw=r2(gw);out.cargo.cbm=r2(cb);
  out.cargo.desc=[...new Set(descs)].filter(Boolean).slice(0,3).join(' / ');
  out.found={
    'Embarcador':out.shipper.name,'Dirección del embarcador':out.shipper.address,
    'Consignatario (CNEE)':out.cnee.name,'Dirección del consignatario':out.cnee.address,
    'Puerto de carga (POL)':out.ship.pol,'Total de bultos':out.cargo.pieces,
    'Peso bruto':out.cargo.gw,'Volumen (CBM)':out.cargo.cbm,'Descripción de la mercancía':out.cargo.desc};
  return out;
}
function siMatch(name,list){
  const n=s=>String(s||'').toUpperCase().replace(/[.,&]/g,' ').replace(/\b(SRL|SA|INC|EIRL|LLC)\b/g,'').replace(/\s+/g,' ').trim();
  const a=n(name);if(!a)return null;
  return list.find(c=>n(c.name)===a)||list.find(c=>{const b=n(c.name);return b.length>=5&&a.length>=5&&(b.includes(a)||a.includes(b))})||null;
}

/* ---- valores que se escriben en el documento ---- */
const SI_CHECK={'ship.svc':['FCL','LCL'],'ship.mov':['CY/CY','CFS/CFS','OTRO'],'cargo.haz':['NO','SÍ'],'cargo.eur1':['NO','SÍ']};
const siSel=(S,k)=>k==='ship.svc'?S.svc:siGet(S,k);
const siMark=(S,k)=>SI_CHECK[k].map(o=>(siSel(S,k)===o?'X':'☐')+' '+o).join(k==='ship.svc'?'    ':'   ');
const SI_MAP={ref:'I2',date:'K4',
 'shipper.name':'D7','shipper.address':'D8','shipper.contact':'D9','shipper.phone':'J9','shipper.email':'D10','shipper.tax':'J10',
 'cnee.name':'D13','cnee.address':'D14','cnee.contact':'D15','cnee.phone':'J15','cnee.email':'D16','cnee.rnc':'J16',
 'notify.name':'D19','notify.address':'D20','notify.contact':'D21','notify.phone':'J21','notify.email':'D22','notify.rnc':'J22',
 'ship.origin':'D25','ship.po':'J25','ship.pol':'D26','ship.pod':'J26','ship.dest':'D27','ship.inco':'J27','ship.svc':'D28','ship.mov':'J28','ship.ready':'D29','ship.etd':'J29',
 'cargo.pieces':'D32','cargo.gw':'J32','cargo.cbm':'D33','cargo.equip':'J33','cargo.desc':'D34','cargo.haz':'D35','cargo.eur1':'J35','cargo.hazd':'D36','comments':'D39'};
function siVals(S){
  const V={};
  Object.keys(SI_MAP).forEach(k=>{
    let v;
    if(SI_CHECK[k])v=siMark(S,k);
    else if(k==='date'||k==='ship.ready'||k==='ship.etd')v=siDmy(siGet(S,k));
    else if(k==='cargo.gw')v=S.cargo.gw===''?'':siN(S.cargo.gw)+'  KG';
    else if(k==='cargo.cbm'||k==='cargo.pieces')v=siN(siGet(S,k));
    else v=siGet(S,k);
    V[k]=v==null?'':String(v);
  });
  return V;
}

/* ---- diseño (idéntico a la plantilla de Excel) ---- */
const SI_H=[18,18,18,18,18,19.95,28.05,30,18,18,18,19.95,28.05,30,18,18,18,19.95,24,28.05,18,18,18,19.95,18,18,18,18,18,18,19.95,18,18,34.05,18,25.95,18,19.95,48,18,18,28.05,28.05,19.95];
const SI_CELLS=[
 [1,5,8,'T','SHIPPING INSTRUCTION',2],[1,9,12,'H1','REFERENCIA / REFERENCE NO.'],[2,9,12,'V','ref',2],
 [3,5,8,'B','MARÍTIMA / OCEAN',2],[4,9,10,'H2','FECHA / DATE'],[4,11,12,'V','date'],
 [6,1,12,'S','1. DATOS DEL EMBARCADOR / SHIPPER'],
 [7,1,3,'L','EMBARCADOR / SHIPPER *'],[7,4,12,'V','shipper.name'],
 [8,1,3,'L','DIRECCIÓN / ADDRESS *'],[8,4,12,'V','shipper.address'],
 [9,1,3,'L','CONTACTO / CONTACT *'],[9,4,6,'V','shipper.contact'],[9,7,9,'L','TELÉFONO / PHONE *'],[9,10,12,'V','shipper.phone'],
 [10,1,3,'L','CORREO / EMAIL *'],[10,4,6,'V','shipper.email'],[10,7,9,'L','TAX ID / REGISTRO FISCAL'],[10,10,12,'V','shipper.tax'],
 [12,1,12,'S','2. DATOS DEL CONSIGNATARIO / CONSIGNEE'],
 [13,1,3,'L','CONSIGNATARIO / CONSIGNEE *'],[13,4,12,'V','cnee.name'],
 [14,1,3,'L','DIRECCIÓN / ADDRESS *'],[14,4,12,'V','cnee.address'],
 [15,1,3,'L','CONTACTO / CONTACT *'],[15,4,6,'V','cnee.contact'],[15,7,9,'L','TELÉFONO / PHONE *'],[15,10,12,'V','cnee.phone'],
 [16,1,3,'L','CORREO / EMAIL *'],[16,4,6,'V','cnee.email'],[16,7,9,'L','RNC / TAX ID *'],[16,10,12,'V','cnee.rnc'],
 [18,1,12,'S','3. NOTIFY PARTY'],
 [19,1,3,'L','NOTIFY PARTY'],[19,4,12,'V','notify.name'],
 [20,1,3,'L','DIRECCIÓN / ADDRESS'],[20,4,12,'V','notify.address'],
 [21,1,3,'L','CONTACTO / CONTACT'],[21,4,6,'V','notify.contact'],[21,7,9,'L','TELÉFONO / PHONE'],[21,10,12,'V','notify.phone'],
 [22,1,3,'L','CORREO / EMAIL'],[22,4,6,'V','notify.email'],[22,7,9,'L','RNC / TAX ID'],[22,10,12,'V','notify.rnc'],
 [24,1,12,'S','4. DATOS DEL EMBARQUE / SHIPMENT DETAILS'],
 [25,1,3,'L','ORIGEN / ORIGIN'],[25,4,6,'V','ship.origin'],[25,7,9,'L','P.O. / REFERENCIA'],[25,10,12,'V','ship.po'],
 [26,1,3,'L','PUERTO DE CARGA / POL *'],[26,4,6,'V','ship.pol'],[26,7,9,'L','PUERTO DE DESCARGA / POD *'],[26,10,12,'V','ship.pod'],
 [27,1,3,'L','DESTINO FINAL / FINAL DEST.'],[27,4,6,'V','ship.dest'],[27,7,9,'L','INCOTERM *'],[27,10,12,'V','ship.inco'],
 [28,1,3,'L','TIPO DE SERVICIO *'],[28,4,6,'V','ship.svc'],[28,7,9,'L','TIPO DE MOVIMIENTO'],[28,10,12,'V','ship.mov'],
 [29,1,3,'L','CARGA LISTA / CARGO READY'],[29,4,6,'V','ship.ready'],[29,7,9,'L','ETD REQUERIDO'],[29,10,12,'V','ship.etd'],
 [31,1,12,'S','5. DATOS DE LA CARGA / CARGO DETAILS'],
 [32,1,3,'L','TOTAL PIEZAS / BULTOS *'],[32,4,6,'V','cargo.pieces'],[32,7,9,'L','PESO BRUTO *'],[32,10,12,'V','cargo.gw'],
 [33,1,3,'L','VOLUMEN TOTAL / CBM *'],[33,4,6,'V','cargo.cbm'],[33,7,9,'L','EQUIPO / CONTAINER TYPE'],[33,10,12,'V','cargo.equip'],
 [34,1,3,'L','DESCRIPCIÓN / COMMODITY *'],[34,4,12,'V','cargo.desc'],
 [35,1,3,'L','MERCANCÍA PELIGROSA / HAZMAT'],[35,4,6,'V','cargo.haz'],[35,7,9,'L','REQUIERE EUR.1'],[35,10,12,'V','cargo.eur1'],
 [36,1,3,'L','DETALLES HAZMAT / UN NO.'],[36,4,12,'V','cargo.hazd'],
 [38,1,12,'S','6. INSTRUCCIONES ESPECIALES / SPECIAL INSTRUCTIONS'],
 [39,1,3,'L','COMENTARIOS'],[39,4,12,'V','comments'],
 [41,1,12,'N','Los campos con fondo crema son editables. Complete toda la información aplicable antes de enviar la instrucción.'],
 [42,1,6,'G','FIRMA AUTORIZADA / AUTHORIZED SIGNATURE',2],[42,7,12,'G','FECHA / DATE',2],
 [44,1,12,'F','DOWIE | DOP DIVISAS · PARTNERS   •   operations@dowie-dom.com   •   809-592-0826']
];
const SI_ST={
 T:{f:'FFFFFF',c:'0752A8',s:17,b:1,a:'c',nb:1},B:{f:'FF9F1A',c:'082B5A',s:11,b:1,a:'c'},
 H1:{f:'082B5A',c:'FFFFFF',s:8,b:1,a:'c',nb:1},H2:{f:'0752A8',c:'FFFFFF',s:8,b:1,a:'c',nb:1},
 S:{f:'082B5A',c:'FFFFFF',s:9,b:1,a:'l'},L:{f:'EAF2FB',c:'082B5A',s:8,b:1,a:'l'},
 N:{f:'EAF2FB',c:'5B6B7F',s:7,b:0,a:'l'},G:{f:'FFFFFF',c:'082B5A',s:8,b:1,a:'c'},
 F:{f:'082B5A',c:'FFFFFF',s:8,b:1,a:'c',nb:1},V:{f:'FFF7E6',c:'152238',s:9,b:0,a:'c'}};
/*__PURE_END__*/

function siPdf(S){
  const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),V=siVals(S);
  const COLW=58.9,k=547/(12*COLW),cw=COLW*k,ox=24,oy=28,ys=[0];
  SI_H.forEach((h,i)=>ys[i+1]=ys[i]+h*k);
  const rgb=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  SI_CELLS.forEach(([r,c1,c2,kind,txt,rs=1])=>{
    const st=SI_ST[kind],x=ox+(c1-1)*cw,w=(c2-c1+1)*cw,y=oy+ys[r-1],h=ys[r-1+rs]-ys[r-1];
    doc.setFillColor(...rgb(st.f));doc.setDrawColor(...rgb('AFC4DD'));doc.setLineWidth(.5);
    doc.rect(x,y,w,h,st.nb?'F':'FD');
    doc.setTextColor(...rgb(st.c));
    if(SI_CHECK[txt]){
      const fs=Math.max(5.5,9*k),bs=fs*.85,mid=y+h/2;let cx=x+6;
      doc.setFont('helvetica','normal');doc.setFontSize(fs);doc.setLineWidth(.6);doc.setDrawColor(...rgb('152238'));
      SI_CHECK[txt].forEach(o=>{
        doc.rect(cx,mid-bs/2,bs,bs,'S');
        if(siSel(S,txt)===o){doc.line(cx+1,mid-bs/2+1,cx+bs-1,mid+bs/2-1);doc.line(cx+bs-1,mid-bs/2+1,cx+1,mid+bs/2-1)}
        doc.text(o,cx+bs+3,mid+fs*.33);cx+=bs+3+doc.getTextWidth(o)+(txt==='ship.svc'?12:8);
      });
      return;
    }
    const text=kind==='V'?V[txt]:txt;if(!text)return;
    let fs=Math.max(5,(kind==='V'&&txt==='ref'?12:st.s)*k),lines;
    doc.setFont('helvetica',st.b?'bold':'normal');
    for(;;){doc.setFontSize(fs);lines=doc.splitTextToSize(text,w-8);if(lines.length*fs*1.15<=h-2||fs<=5)break;fs-=.5}
    const y0=y+(h-lines.length*fs*1.15)/2+fs*.85;
    lines.forEach((ln,i)=>{
      if(st.a==='c')doc.text(ln,x+w/2,y0+i*fs*1.15,{align:'center'});else doc.text(ln,x+5,y0+i*fs*1.15);
    });
  });
  doc.addImage(SI_LOGO,'PNG',ox+4*k,oy+4*k,187.5*k,62.5*k);
  return doc;
}
const siB64=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer};
function siSave(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function siXlsx(S,name){
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(siB64(SI_TEMPLATE));
  const ws=wb.getWorksheet('MARITIMA'),air=wb.getWorksheet('AEREA');if(air)wb.removeWorksheet(air.id);
  ['K16','K22','E33'].forEach(a=>{ws.getCell(a).value=null});
  ['D16:F16','J16:L16','J22:L22','D25:F25','D33:F33'].forEach(m=>{try{ws.mergeCells(m)}catch(e){}});
  const V=siVals(S);
  Object.keys(SI_MAP).forEach(key=>{
    const cell=ws.getCell(SI_MAP[key]);let v=V[key];
    if(v==='')v=null;
    else if(key==='cargo.pieces'||key==='cargo.cbm')v=Number(v);
    else if(key==='date'||key==='ship.ready'||key==='ship.etd'){const p=siGet(S,key).split('-').map(Number);v=p.length===3&&p[0]?new Date(Date.UTC(p[0],p[1]-1,p[2])):null}
    cell.value=v;
  });
  ws.pageSetup=Object.assign({},ws.pageSetup,{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:'A1:L44'});
  const buf=await wb.xlsx.writeBuffer();
  siSave(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);
}

/* ---- interfaz ---- */
let S=siBlank(),siEditId=null,siClients=SI_CLIENTS.slice(),siCat=[],siBusy=false,siLoaded=false;
const SI_FIELDS=[
 ['Encabezado',[['ref','Referencia / Reference No.'],['date','Fecha / Date',0,'date']]],
 ['1. Datos del embarcador / Shipper',[['shipper.name','Embarcador / Shipper *',1],['shipper.address','Dirección / Address *',1,'ta'],['shipper.contact','Contacto / Contact *'],['shipper.phone','Teléfono / Phone *'],['shipper.email','Correo / Email *'],['shipper.tax','Tax ID / Registro fiscal']]],
 ['2. Datos del consignatario / Consignee',[['@client'],['cnee.name','Consignatario / Consignee *',1],['cnee.address','Dirección / Address *',1,'ta'],['cnee.contact','Contacto / Contact *'],['cnee.phone','Teléfono / Phone *'],['cnee.email','Correo / Email *'],['cnee.rnc','RNC / Tax ID *']]],
 ['3. Notify party',[['notify.name','Notify party',1],['notify.address','Dirección / Address',1,'ta'],['notify.contact','Contacto / Contact'],['notify.phone','Teléfono / Phone'],['notify.email','Correo / Email'],['notify.rnc','RNC / Tax ID']]],
 ['4. Datos del embarque / Shipment details',[['ship.origin','Origen / Origin'],['ship.po','P.O. / Referencia'],['ship.pol','Puerto de carga / POL *'],['ship.pod','Puerto de descarga / POD *'],['ship.dest','Destino final / Final dest.'],['ship.inco','Incoterm *',0,'sel',SI_INCO],['ship.mov','Tipo de movimiento',0,'sel',['CY/CY','CFS/CFS','OTRO']],['ship.ready','Carga lista / Cargo ready',0,'date'],['ship.etd','ETD requerido',0,'date']]],
 ['5. Datos de la carga / Cargo details',[['cargo.pieces','Total piezas / bultos *',0,'num'],['cargo.gw','Peso bruto (KG) *',0,'num'],['cargo.cbm','Volumen total / CBM *',0,'num'],['cargo.equip','Equipo / Container type',0,'sel',['20 GP','40 GP','40 HC','45 HC','OTRO']],['cargo.desc','Descripción / Commodity *',1],['cargo.haz','Mercancía peligrosa / Hazmat',0,'sel',['NO','SÍ']],['cargo.eur1','Requiere EUR.1',0,'sel',['NO','SÍ']],['cargo.hazd','Detalles Hazmat / UN No.',1]]],
 ['6. Instrucciones especiales / Special instructions',[['comments','Comentarios',1,'ta']]]
];
function siBuild(){
  const fld=([p,l,w,t,o])=>{
    if(p==='@client')return '<div class="wide"><label>Cliente (CNEE)</label><div class="cl"><select id="siClient"></select><button type="button" class="btn gh sm" id="siSaveCl">Guardar como cliente</button></div></div>';
    let i;
    if(t==='ta')i=`<textarea data-p="${p}" rows="2"></textarea>`;
    else if(t==='sel')i=`<select data-p="${p}"><option value="">—</option>${o.map(x=>`<option>${x}</option>`).join('')}</select>`;
    else i=`<input data-p="${p}" type="${t==='date'?'date':t==='num'?'number':'text'}"${t==='num'?' step="any"':''}>`;
    return `<div${w?' class="wide"':''}><label>${l}</label>${i}</div>`;
  };
  $('#siForm').innerHTML=SI_FIELDS.map(([t,f])=>`<div class="card"><h3>${t}</h3><div class="g2 si">${f.map(fld).join('')}</div></div>`).join('');
}
function siRender(){
  document.querySelectorAll('#siForm [data-p]').forEach(el=>{el.value=siGet(S,el.dataset.p)});
  $('#siClient').innerHTML='<option value="">— Personalizado —</option>'+siClients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#siClient').value=S.client||'';
  document.querySelectorAll('#siSvc button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.svc));
}
function siReport(p){
  const f=p&&p.found;if(!f){$('#siFound').innerHTML='';return}
  const k=Object.keys(f),ok=k.filter(x=>f[x]!==''&&f[x]!=null).length;
  $('#siFound').innerHTML=`<div class="card found"><h3>Datos leídos del Packing List (${ok} de ${k.length})</h3><ul>${k.map(x=>{const v=f[x];const y=v!==''&&v!=null;return `<li class="${y?'y':'n'}"><b>${y?'✔':'✘'} ${esc(x)}</b><span>${y?esc(String(v).slice(0,90)):'No encontrado, llénalo a mano'}</span></li>`}).join('')}</ul></div>`;
}
function siStart(p,fromBlank){
  S=siBlank();siEditId=null;S.date=today();
  if(p){
    Object.assign(S.shipper,p.shipper);Object.assign(S.cnee,p.cnee);
    if(p.ship.pol)S.ship.pol=p.ship.pol;if(p.ship.pod)S.ship.pod=p.ship.pod;if(p.po)S.ship.po=p.po;
    Object.assign(S.cargo,p.cargo);
    const m=siMatch(S.cnee.name,siClients);if(m){S.client=m.id;S.cnee.name=m.name;S.cnee.rnc=m.rnc||''}
  }
  $('#siEditor').classList.add('on');siRender();siReport(p);
  $('#siEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function siGrid(file){
  if(typeof XLSX==='undefined')throw new Error('No cargó la librería de Excel. Revisa tu conexión o desactiva el bloqueador y recarga.');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  let name=wb.SheetNames.find(n=>/pack/i.test(n))||wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:null,blankrows:true});
}
const siWait=ms=>new Promise(r=>setTimeout(r,ms));
async function siHandle(file){
  if(siBusy)return;
  if(!/\.(xlsx|xls|ods|csv)$/i.test(file.name))return toast('Sube un Excel (.xlsx, .xls, .ods) o .csv');
  siBusy=true;const st=[...document.querySelectorAll('#siSteps .st')];
  $('#siSteps').classList.add('on');st.forEach(s=>s.className='st');st[0].classList.add('act');
  try{
    const grid=await siGrid(file);st[0].className='st done';st[1].classList.add('act');await siWait(350);
    const p=siParse(grid);
    console.log('[SI] filas leídas:',grid.length,'datos:',p.found);
    const none=Object.values(p.found).every(v=>v===''||v==null);
    st[1].className='st done';st[2].classList.add('act');await siWait(350);
    st[2].className='st done';siStart(p);toast(none?'No reconocí los campos de este archivo; llénalos a mano':'Revisa los datos y elige LCL o FCL');
    setTimeout(()=>$('#siSteps').classList.remove('on'),1500);
  }catch(e){console.error(e);toast(e.message||'No pude leer el archivo');st.forEach(s=>s.className='st')}
  siBusy=false;
}
const siOk=()=>{if(S.svc)return true;toast('Selecciona si es LCL o FCL');$('#siSvc').classList.add('err');$('#siSvc').scrollIntoView({behavior:'smooth',block:'center'});return false};
const siName=(d,ext)=>'Shipping_Instruction_'+((d.cnee&&d.cnee.name)||'DOWIE').replace(/[^\w]+/g,'_')+'.'+ext;
function siDoPdf(d){try{siPdf(d).save(siName(d,'pdf'));toast('PDF descargado')}catch(e){console.error(e);toast('No se pudo generar el PDF')}}
async function siDoXls(d){try{await siXlsx(d,siName(d,'xlsx'));toast('Excel descargado')}catch(e){console.error(e);toast('No se pudo generar el Excel')}}

/* ---- almacenamiento (Supabase o navegador) ---- */
const SI_LS='dowie_si',SI_LSC='dowie_clientes';
const siLsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const siLsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const siU=t=>SB_URL+'/rest/v1/'+t;
async function siFetch(t,q){const r=await fetch(siU(t)+q,{headers:SBH()});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function siUpsert(t,row){const r=await fetch(siU(t)+'?on_conflict=id',{method:'POST',headers:Object.assign(SBH(),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(row)});if(!r.ok)throw new Error('HTTP '+r.status)}
async function siDelete(t,id){const r=await fetch(siU(t)+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:SBH()});if(!r.ok)throw new Error('HTTP '+r.status)}
async function siLoad(){
  const extra=siLsGet(SI_LSC);extra.forEach(c=>{if(!siClients.some(x=>x.id===c.id))siClients.push(c)});
  siCat=siLsGet(SI_LS);siList();
  if(!REMOTE){siRender();return}
  try{
    const cl=await siFetch('clientes','?select=*&order=name.asc');
    if(cl.length){siClients=SI_CLIENTS.filter(s=>!cl.some(c=>c.id===s.id)).concat(cl.map(c=>({id:c.id,name:c.name,rnc:c.rnc||''})))}
    const rows=await siFetch('shipping_instructions','?select=*&order=created_at.desc');
    siCat=rows.map(r=>({id:r.id,ref:r.ref,consignee:r.consignee,date:r.date,svc:r.svc,data:r.data,createdAt:Number(r.created_at)||0}));
    siLsSet(SI_LS,siCat);siList();siRender();
  }catch(e){toast('No se pudo conectar con la base de datos; se muestra la copia local')}
}
function siOpen(){if(!siLoaded){siLoaded=true;siBuild();siBind();S.date=today();siRender()}siLoad()}
async function siSaveRec(){
  if(!siOk())return;
  const id=siEditId||'si'+Date.now().toString(36),old=siCat.find(x=>x.id===id),now=Date.now();
  S.id=id;
  const rec={id,ref:S.ref||'',consignee:S.cnee.name||'',date:S.date||null,svc:S.svc,data:JSON.parse(JSON.stringify(S)),created_at:old?old.createdAt:now,updated_at:now};
  try{
    if(REMOTE)await siUpsert('shipping_instructions',rec);
    const o={id,ref:rec.ref,consignee:rec.consignee,date:rec.date,svc:rec.svc,data:rec.data,createdAt:rec.created_at};
    const i=siCat.findIndex(x=>x.id===id);if(i>=0)siCat[i]=o;else siCat.unshift(o);
    siLsSet(SI_LS,siCat);siEditId=id;siList();toast('Guardada en el historial');
  }catch(e){toast('No se pudo guardar')}
}
async function siSaveClient(){
  const name=(S.cnee.name||'').trim();if(!name)return toast('Escribe el nombre del consignatario');
  const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cliente'+Date.now().toString(36);
  const c={id,name:name.toUpperCase(),rnc:(S.cnee.rnc||'').trim()};
  try{
    if(REMOTE)await siUpsert('clientes',{id:c.id,name:c.name,rnc:c.rnc,created_at:Date.now()});
    const i=siClients.findIndex(x=>x.id===id);if(i>=0)siClients[i]=c;else siClients.push(c);
    const ex=siLsGet(SI_LSC).filter(x=>x.id!==id);ex.push(c);siLsSet(SI_LSC,ex);
    S.client=id;siRender();toast('Cliente guardado');
  }catch(e){toast('No se pudo guardar el cliente')}
}
function siList(){
  $('#siList').innerHTML=siCat.length?siCat.map(r=>`<div class="card item" data-id="${esc(r.id)}"><div><b>${esc(r.consignee||'Sin consignatario')}</b><small>${esc(r.ref||'Sin referencia')} · ${esc(r.svc||'')} · ${esc(siDmy(r.date))}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="pdf">PDF</button><button class="btn gh sm" data-a="xls">Excel</button><button class="btn gh sm" data-a="edit">Editar</button><button class="btn gh sm" data-a="del">Eliminar</button></div></div>`).join(''):'<div class="card empty">No hay instrucciones guardadas.</div>';
}
function siBind(){
  $('#siForm').addEventListener('input',e=>{const p=e.target.dataset.p;if(p)siSet(S,p,e.target.value)});
  $('#siForm').addEventListener('change',e=>{
    if(e.target.id==='siClient'){
      const c=siClients.find(x=>x.id===e.target.value);S.client=c?c.id:'';
      if(c){S.cnee.name=c.name;S.cnee.rnc=c.rnc||''}
      siRender();
    }
  });
  $('#siForm').addEventListener('click',e=>{if(e.target.id==='siSaveCl')siSaveClient()});
  $('#siSvc').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;S.svc=b.dataset.v;
    if(!S.ship.mov||['CY/CY','CFS/CFS'].includes(S.ship.mov))S.ship.mov=S.svc==='FCL'?'CY/CY':'CFS/CFS';
    $('#siSvc').classList.remove('err');siRender();
  };
  $('#siPdf').onclick=()=>{if(siOk())siDoPdf(S)};
  $('#siXls').onclick=()=>{if(siOk())siDoXls(S)};
  $('#siSave').onclick=siSaveRec;
  const d=$('#siDrop'),f=$('#siFile');
  d.onclick=()=>f.click();
  ['dragover','dragenter'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();d.classList.add('over')}));
  ['dragleave','drop'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();d.classList.remove('over')}));
  d.addEventListener('drop',e=>{if(e.dataTransfer.files[0])siHandle(e.dataTransfer.files[0])});
  f.onchange=()=>{if(f.files[0])siHandle(f.files[0]);f.value=''};
  $('#siBlank').onclick=()=>{siStart(null);siReport(null)};
  $('#siList').addEventListener('click',async e=>{
    const b=e.target.closest('[data-a]');if(!b)return;
    const r=siCat.find(x=>x.id===b.closest('.item').dataset.id);if(!r)return;
    const d=Object.assign(siBlank(),r.data);
    if(b.dataset.a==='pdf')siDoPdf(d);
    if(b.dataset.a==='xls')siDoXls(d);
    if(b.dataset.a==='edit'){S=d;siEditId=r.id;$('#siEditor').classList.add('on');siRender();$('#siEditor').scrollIntoView({behavior:'smooth'})}
    if(b.dataset.a==='del'){
      if(!b.dataset.sure){b.dataset.sure=1;b.textContent='¿Seguro?';setTimeout(()=>{b.dataset.sure='';b.textContent='Eliminar'},3000);return}
      try{if(REMOTE)await siDelete('shipping_instructions',r.id);siCat=siCat.filter(x=>x!==r);siLsSet(SI_LS,siCat);siList();toast('Eliminada')}catch(er){toast('No se pudo eliminar')}
    }
  });
}
