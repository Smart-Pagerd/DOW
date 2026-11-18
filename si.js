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
function siParseBase(grid){
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
  const notLabel=c=>!/^(?:ADD(?:RESS)?|TO|FROM|CONSIGNEE|CONSIGNE|INV(?:OICE)?|DATE|FACTURA|BOOKING|PACKING|COMMERCIAL|BILL|PROFORMA)\b/i.test(T(c).trim());
  const head=pool.find(c=>notLabel(c)&&/\bTEL\s*[:：]/i.test(T(c)))||pool.find(c=>notLabel(c)&&T(c).includes('\n'))||pool.find(c=>notLabel(c)&&/\bLTD\b|CO\.,/i.test(T(c)))||cells.find(c=>c.r<3&&notLabel(c)&&!/\d/.test(T(c)));
  if(head&&/^\s*(?:TEL|PHONE)\b/i.test(T(head))){
    const rowTxt=r=>cells.filter(x=>x.r===r).sort((a,b)=>a.c-b.c).map(T).join(' ').replace(/\s+/g,' ').trim();
    const rows=[...new Set(cells.filter(x=>x.r<head.r).map(x=>x.r))].sort((a,b)=>a-b);
    const co=/\b(?:CO\.?,?\s*LTD|LIMITED|LTD|INC|CORP|CORPORATION|COMPANY|FACTORY|TRADING|GMBH)\b/i;
    let ni=-1;for(let i=rows.length-1;i>=0;i--){if(co.test(rowTxt(rows[i]))){ni=i;break}}
    if(ni<0)ni=Math.max(0,rows.length-2);
    if(rows.length){out.shipper.name=rowTxt(rows[ni]);out.shipper.address=rows.slice(ni+1).map(rowTxt).join(' ')}
    const rest=rowTxt(head.r);
    const t=rest.match(/TEL\s*[:：]?\s*([+\d][\d\s\-+()]*\d)/i);if(t)out.shipper.phone=t[1].trim();
    const k=rest.match(/CONTACT\s*[:：]?\s*(.+)$/i);if(k)out.shipper.contact=k[1].trim();
    const em=rest.match(/[\w.+-]+@[\w-]+\.[\w.]+/);if(em)out.shipper.email=em[0];
  }else if(head){
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
  const adCell=first(/^ADD(?:RESS)?\s*[:：]/i),adRaw=val(/^ADD(?:RESS)?\s*[:：]/i);
  if(adRaw){
    const L=adRaw.split(/\n/).map(x=>x.trim()).filter(Boolean);let addr=L[0]||'',rest=L.slice(1).join(' ');
    const ci=addr.search(/\s+Contacts?\s*[:：]/i);if(ci>0){rest=(addr.slice(ci)+' '+rest).trim();addr=addr.slice(0,ci).trim()}
    if(grid.fuzzy&&adCell){
      for(let r=adCell.r+1;r<=adCell.r+3;r++){
        const c=cells.find(x=>x.r===r&&Math.abs(x.c-adCell.c)<=30);if(!c)continue;
        const t=T(c).trim();if(/^(?:Contacts?|Tel|E-?mail)\b/i.test(t))break;
        addr+=' '+t;
      }
    }
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
    let sc=0,sg=0,sv=0,n=0,lo=0,hi=0,buf='';
    if(grid.fuzzy){
      const hr=cells.filter(x=>x.r===hdr.r).sort((a,b)=>a.c-b.c),pv=hr.filter(x=>x.c<hdr.c).pop(),nx=hr.find(x=>x.c>hdr.c);
      lo=pv?pv.c+20:hdr.c-60;hi=nx?nx.c-4:hdr.c+80;
    }
    const flush=()=>{if(buf.trim())descs.push(buf.replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim().toUpperCase());buf=''};
    for(let r=hdr.r+1;r<grid.length;r++){
      const g=grid[r]||[];
      const at=c=>{
        if(c<0)return null;
        if(!grid.fuzzy)return g[c];
        let best=null,bd=1e9;g.forEach((v,k)=>{const d=Math.abs(k-c);if(d<bd){bd=d;best=v}});
        return bd<=30?best:null;
      };
      if(g.some(v=>/^(?:MARK|TTL|TOTAL)/i.test(String(v==null?'':v).trim())))break;
      if(grid.fuzzy){
        let t='';g.forEach((v,k)=>{if(k>=lo&&k<=hi&&isNaN(+v))t+=(t?' ':'')+String(v).trim()});
        if(t){buf+=(buf?' ':'')+t;if((buf.match(/\(/g)||[]).length===(buf.match(/\)/g)||[]).length)flush()}
      }else{const d=at(cD);if(d&&String(d).trim())descs.push(String(d).replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim().toUpperCase())}
      const e=num(at(cE));
      if(e!==null){sc+=e;n++;const gg=num(at(cG));if(gg!==null)sg+=gg*e;
        if(!grid.fuzzy){const a=num(at(cS)),b=num(at(cS+1)),c=num(at(cS+2));if(a&&b&&c)sv+=a*b*c*e/1e6}}
    }
    flush();
    if(n){if(ct==null)ct=sc;if(gw==null)gw=sg;if(cb==null&&sv)cb=sv}
  }
  /* respaldo: buscar en todo el texto del documento si algo no se encontró por celdas */
  const blob=cells.map(c=>T(c)).join('\n'),grab=(re,g=1)=>{const m=blob.match(re);return m?m[g].trim():''},NUM='\\s*[:：]?\\s*(-?\\d[\\d,]*\\.?\\d*)';
  if(!out.cnee.name)out.cnee.name=grab(/(?:^|\n)\s*(?:TO|CONSIGNEE|SHIP\s*TO|SOLD\s*TO)\s*[:：]\s*([^\n]+)/i);
  if(!out.cnee.address){const ad=grab(/(?:^|\n)\s*ADD(?:RESS)?\s*[:：]\s*([^\n]+)/i);out.cnee.address=ad.replace(/\s+Contacts?\s*[:：].*$/i,'').trim()}
  if(!out.cnee.contact){const m=blob.match(/Contacts?\s*[:：]\s*(.*?)\s+Tel\s*[:：]?\s*([+\d][\d\s\-+()]*\d)/i);if(m){out.cnee.contact=m[1].trim();out.cnee.phone=m[2].trim()}}
  if(!out.ship.pol)out.ship.pol=grab(/Ports?\s+of\s+loading\s*[:：]?\s*([^\n:：]+)/i);
  if(ct==null){const v=grab(new RegExp('(?:TTL|TOTAL)\\s*(?:CTNS|CARTONS?|PKGS?|PACKAGES?)'+NUM,'i'));if(v)ct=num(v)}
  if(gw==null){const v=grab(new RegExp('(?:TTL|TOTAL)\\s*(?:G\\.?\\s*W\\.?|GROSS(?:\\s*WEIGHT)?)'+NUM,'i'));if(v)gw=num(v)}
  if(cb==null){const v=grab(new RegExp('(?:TTL|TOTAL)\\s*(?:CBM|VOLUME|MEASUREMENT|M3)'+NUM,'i'));if(v)cb=num(v)}
  const r2=x=>x==null?'':Math.round(x*100)/100;
  out.cargo.pieces=ct==null?'':ct;out.cargo.gw=r2(gw);out.cargo.cbm=r2(cb);
  out.cargo.desc=[...new Set(descs)].filter(Boolean).slice(0,4).join(' / ');
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


/* ---- PDF -> cuadrícula (items = {s,x,y,w} por página) ---- */
function siPdfGrid(pages){
  const grid=[];let r=0;
  pages.forEach(items=>{
    const rows=[];
    items.forEach(it=>{
      if(!String(it.s).trim())return;
      let row=rows.find(x=>Math.abs(x.y-it.y)<3);
      if(!row){row={y:it.y,a:[]};rows.push(row)}
      row.a.push(it);
    });
    rows.sort((a,b)=>b.y-a.y).forEach(row=>{
      row.a.sort((a,b)=>a.x-b.x);
      const cells=[];
      row.a.forEach(it=>{
        const last=cells[cells.length-1];
        if(last&&it.x-last.end<=6){last.s+=(it.x-last.end>0.5?' ':'')+it.s;last.end=it.x+it.w}
        else cells.push({s:it.s,x:it.x,end:it.x+it.w});
      });
      const g=[];cells.forEach(c=>{g[Math.round(c.x)]=c.s.trim()});
      grid[r++]=g;
    });
  });
  grid.fuzzy=true;
  return grid;
}

/* ---- lector propio de .ods (content.xml) ---- */
function siOdsParse(xml){
  const dec=t=>t.replace(/&#x([0-9a-f]+);/gi,(m,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(m,d)=>String.fromCodePoint(+d)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  const attr=(a,n)=>{const m=a.match(new RegExp('(?:^|\\s)'+n+'="([^"]*)"'));return m?dec(m[1]):null};
  const para=inner=>{
    const out=[],re=/<text:p(?=[\s>\/])[^>]*?(?:\/>|>([\s\S]*?)<\/text:p>)/g;let m;
    while((m=re.exec(inner))){
      let t=m[1]||'';
      t=t.replace(/<text:s(?:\s[^>]*?text:c="(\d+)")?[^>]*\/>/g,(x,n)=>' '.repeat(n?+n:1)).replace(/<text:line-break\s*\/>/g,'\n').replace(/<text:tab\s*\/>/g,' ').replace(/<[^>]+>/g,'');
      out.push(dec(t));
    }
    return out.join('\n');
  };
  const sheets=[],tre=/<table:table\s([^>]*)>([\s\S]*?)<\/table:table>/g;let tm;
  while((tm=tre.exec(xml))){
    const name=attr(tm[1],'table:name')||'',grid=[];let r=0;
    const rre=/<table:table-row(?=[\s>\/])([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/g;let rm;
    while((rm=rre.exec(tm[2]))){
      const rep=+(attr(rm[1],'table:number-rows-repeated')||1),body=rm[2]||'';let c=0,has=false;const row=[];
      const cre=/<(table:table-cell|table:covered-table-cell)(?=[\s>\/])([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;let cm;
      while((cm=cre.exec(body))){
        const crep=+(attr(cm[2],'table:number-columns-repeated')||1);
        if(cm[1]==='table:table-cell'){
          const vt=attr(cm[2],'office:value-type');let v=null;
          if(vt==='float'||vt==='percentage'||vt==='currency'){const x=attr(cm[2],'office:value');if(x!==null)v=parseFloat(x)}
          else if(vt==='string'){v=attr(cm[2],'office:string-value');if(v===null)v=para(cm[3]||'')}
          else if(vt==='date'){v=attr(cm[2],'office:date-value')}
          else if(vt==='boolean'){v=attr(cm[2],'office:boolean-value')}
          if(v!==null&&String(v).trim()!==''){for(let k=0;k<Math.min(crep,20);k++)row[c+k]=v;has=true}
        }
        c+=crep;
      }
      if(has)grid[r]=row;
      r+=rep;
    }
    sheets.push({name,grid});
  }
  return sheets;
}

/* ---- extractor general: facturas comerciales, packing lists y similares ---- */
function siExtra(grid,out){
  const cells=[];
  grid.forEach((row,r)=>(row||[]).forEach((v,c)=>{if(v!==undefined&&v!==null&&String(v).trim()!=='')cells.push({r,c,v})}));
  if(!cells.length)return;
  const fz=!!grid.fuzzy,tol=fz?40:2,reach=fz?220:3;
  const T=c=>String(c.v).replace(/\s+/g,' ').trim();
  const num=v=>{if(v===null||v===undefined)return null;if(typeof v==='number')return v;const n=parseFloat(String(v).replace(/,/g,''));return isNaN(n)?null:n};
  const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;])/g,'$1').replace(/[\s,;]+$/,'').trim();
  const rightOf=c=>cells.filter(x=>x.r===c.r&&x.c>c.c&&x.c-c.c<=reach).sort((a,b)=>a.c-b.c)[0];
  const same=(re,c)=>{const t=T(c),m=t.match(re);return m?t.slice(m.index+m[0].length).replace(/^[\s:：\-#.]+/,'').trim():''};
  const val=(re,c)=>{const v=same(re,c);if(v)return v;const r=rightOf(c);return r&&!/[:：]\s*$/.test(T(r))?T(r):''};
  const first=re=>cells.find(c=>re.test(T(c)));
  const setIf=(o,k,v)=>{v=clean(v);if(v&&!o[k])o[k]=v};
  const L=re=>{const c=first(re);return c?val(re,c):''};
  /* bloques con encabezado: CONSIGNEE / CONSIGNE / CLIENTE ... y SHIPPER / EXPORTER ... */
  const HDR={
    cnee:/^(?:CONSIGNEE|CONSIGNE|CONSIGNATARIO|SHIP\s*TO|SOLD\s*TO|BILL\s*TO|BUYER|IMPORTER|CUSTOMER)\b\s*[:：]?/i,
    shipper:/^(?:SHIPPER|EXPORTER|SELLER|VENDOR|EMBARCADOR|EXPORTADOR|SUPPLIER)\b\s*[:：]?/i};
  const FL=[
    ['name',/^(?:CLIENT|CLIENTE|NAME|NOMBRE|COMPANY|EMPRESA|CUSTOMER)\b\s*[:：]/i],
    ['address',/^(?:ADDRESS|ADDRES|ADDR|ADD|DIRECCI[ÓO]N|DIR)\b\s*[:：]/i],
    ['phone',/^(?:PHONE|TEL|TELEPHONE|TEL[ÉE]FONO|CELL|MOBILE)\b\.?\s*[:：]/i],
    ['email',/^(?:E-?MAIL|CORREO)\b\.?\s*[:：]/i],
    ['tax',/^(?:TAX\s*ID|RNC|VAT|TIN|EIN|RUC|NIT|CUIT|RFC)\b\s*[:：#]?/i],
    ['contact',/^(?:CONTACT|CONTACTO|ATTN|ATTENTION)\b\s*[:：]/i]];
  const STOP=/^(?:ITEM|DESCRIPTION|DESCRIPCI|NO\.?\s*$|#\s*$)/i;
  const block=(hre,tgt,taxKey)=>{
    const h=first(hre);if(!h)return;
    const hv=same(hre,h);if(hv)setIf(tgt,'name',hv.split(/\n/)[0]);
    for(let r=h.r+1;r<=h.r+9;r++){
      const rc=cells.filter(x=>x.r===r&&Math.abs(x.c-h.c)<=tol).sort((a,b)=>a.c-b.c);
      if(rc.some(x=>STOP.test(T(x))||HDR.cnee.test(T(x))||HDR.shipper.test(T(x))))break;
      rc.forEach(x=>FL.forEach(([k,re])=>{if(re.test(T(x)))setIf(tgt,k==='tax'?taxKey:k,val(re,x))}));
    }
  };
  block(HDR.cnee,out.cnee,'rnc');block(HDR.shipper,out.shipper,'tax');
  /* embarcador a partir del encabezado del documento (antes del bloque del consignatario) */
  const stopRow=Math.min(14,...cells.filter(c=>/^(?:TO|ADD|ADDRESS|CONSIGN\w*|SHIP\s*TO|SOLD\s*TO|BILL\s*TO|BUYER|CLIENT|CLIENTE)\b\s*[:：]/i.test(T(c))).map(c=>c.r));
  const skip=/^(?:INVOICE|FACTURA|DATE|FECHA|BOOKING|BILL\s*OF|B\/L|CONTAINER|SEAL|VOYAGE|PORT|MOVEMENT|SHIPPING|PACKING|COMMERCIAL|PAGE|PROFORMA)\b/i;
  const co=/\b(?:LTD|LIMITED|SRL|S\.?R\.?L|S\.?A\.?S?|INC|CORP|LLC|CO\.|GMBH|LABORATORIOS?|COMPANY|FACTORY|TRADING|INDUSTRIAL)\b/i;
  const sh=out.shipper;
  cells.filter(c=>c.r<stopRow&&!skip.test(T(c))).sort((a,b)=>a.r-b.r||a.c-b.c).forEach(c=>{
    const t=T(c);let used=false;
    const em=t.match(/[\w.+-]+@[\w-]+\.[\w.]*\w/);if(em){used=true;if(!sh.email)sh.email=em[0]}
    const ph=t.match(/(?:Tel(?:\.|[ée]fono)?|Phone|Cel)\s*[:：.]*\s*(\(?\+?\d[\d\s().\-]*\d)/i);if(ph){used=true;if(!sh.phone)sh.phone=clean(ph[1])}
    const tx=t.match(/(?:RNC|RUC|NIT|TAX\s*ID|VAT|EIN|RFC)\s*[:：#.]*\s*([\w-]*\d[\w-]*)/i);if(tx){used=true;if(!sh.tax)sh.tax=tx[1]}
    if(!used){
      if(co.test(t)&&!sh.name&&t.length<90)sh.name=t;
      else if(/\d|\b(?:CALLE|AVE|AV\.|STREET|ST\.|ROAD|RD\.|ZONA|KM)\b/i.test(t)&&!sh.address&&t.length>8)sh.address=t;
    }
  });
  /* puertos, movimiento, incoterm, naviera */
  const place=v=>{const p=clean(v).split(',').map(x=>x.trim()).filter(Boolean);return p.length>1?{city:p[0],country:p[p.length-1].replace(/\.$/,'')}:{city:p[0]||'',country:''}};
  const POL=/^(?:Ports?\s+of\s+(?:loading|shipping|shipment)|Loading\s+Port|Port\s+of\s+origin|POL|Puerto\s+de\s+(?:carga|embarque))\b\s*[:：]?/i;
  const POD=/^(?:Ports?\s+of\s+(?:discharge|destination|delivery)|Discharge\s+Port|Destination\s+Port|POD|Puerto\s+de\s+(?:descarga|destino))\b\s*[:：]?/i;
  const pl=out.ship.pol||L(POL),pd=out.ship.pod||L(POD);
  if(pl){const p=place(pl);out.ship.pol=p.city;if(p.country&&!out.ship.origin)out.ship.origin=p.country}
  if(pd){const p=place(pd);out.ship.pod=p.city;if(p.country&&!out.ship.dest)out.ship.dest=p.country}
  const mv=L(/^(?:MOVEMENT(?:\s+TERMS?)?|TIPO\s+DE\s+MOVIMIENTO)\b\s*[:：]?/i);
  if(mv&&!out.ship.mov)out.ship.mov=/YARD\s*TO\s*YARD|\bCY\s*[\/\-]?\s*CY\b/i.test(mv)?'CY/CY':/CFS\s*(?:TO|[\/\-])?\s*CFS/i.test(mv)?'CFS/CFS':'OTRO';
  const ic=first(/(?:INCOTERMS?|TERMS?\s+OF\s+(?:DELIVERY|SALE)|DELIVERY\s+TERMS?|PRICE\s+TERMS?|T[ÉE]RMINOS?\s+DE\s+ENTREGA)/i);
  if(ic&&!out.ship.inco){const r=rightOf(ic),m=(T(ic)+' '+(r?T(r):'')).match(/\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i);if(m)out.ship.inco=m[1].toUpperCase()}
  const bits=[],nav=L(/^(?:SHIPPING\s+COMPANY|SHIPPING\s+LINE|CARRIER|NAVIERA)\b\s*[:：]?/i),bk=L(/^BOOKING\s*(?:NO\.?|NUMBER|#)?\s*[:：]?/i);
  if(nav)bits.push('Naviera: '+clean(nav));if(bk)bits.push('Booking: '+clean(bk));
  if(bits.length)out.comments=bits.join(' · ');
  /* tabla de artículos: bultos, peso bruto, volumen y descripción */
  const CAT={desc:/DESCRIP|COMMODITY|PRODUCT|GOODS|MERCANC|ART[ÍI]CULO/i,pcs:/^(?:BOXES|BOX|CARTONS?|CTNS?|PKGS?|PACKAGES?|BULTOS|CAJAS|PALLETS?|CASES|CNTS)\b/i,gw:/GROSS|\bG\.?\s*W\b/i,cbm:/\bCBM\b|M³|\bM3\b|VOLUME|VOL\./i};
  const by=new Map();cells.forEach(c=>{if(!by.has(c.r))by.set(c.r,[]);by.get(c.r).push(c)});
  let H=null;
  for(const [r,cs] of [...by.entries()].sort((a,b)=>a[0]-b[0])){
    if(cs.find(c=>CAT.desc.test(T(c)))&&(cs.find(c=>CAT.pcs.test(T(c)))||cs.find(c=>CAT.gw.test(T(c))))){H={r,cs:cs.slice().sort((a,b)=>a.c-b.c)};break}
  }
  let spec=null;
  if(H){
    const isN=x=>/^-?[\d.,]+$/.test(T(x));
    if(!fz){
      const col=re=>H.cs.filter(c=>re.test(T(c)));
      const cD=col(CAT.desc)[0],cP=col(CAT.pcs)[0],gws=col(CAT.gw);
      const cG=gws.find(c=>/TOTAL|T\.?\s*G\.?\s*W/i.test(T(c)))||gws.find(c=>!/\bPER\b|\/\s*(?:BOX|CTN|CARTON|UNIT)/i.test(T(c)))||null,cV=col(CAT.cbm)[0];
      const at=(row,hc)=>hc?row.find(x=>x.c===hc.c)||null:null;
      spec={start:H.r+1,
        desc:row=>{const d=at(row,cD);return d&&/[A-Za-z]{3}/.test(T(d))?T(d):''},
        num:(row,k)=>{const x=at(row,{p:cP,g:cG,v:cV}[k]);return x?num(x.v):null}};
    }else{
      /* PDF: los encabezados se parten en varias líneas; se agrupan por columna */
      const hd=H.cs.find(c=>CAT.desc.test(T(c)));
      let fd=null;
      for(const r of [...by.keys()].sort((a,b)=>a-b)){
        if(r<=H.r)continue;const row=by.get(r);
        if(row.some(x=>Math.abs(x.c-hd.c)<=130&&/[A-Za-z]{3}/.test(T(x)))&&row.filter(isN).length>=2){fd=r;break}
      }
      if(fd!==null){
        const hc=cells.filter(c=>c.r>=H.r-3&&c.r<fd).sort((a,b)=>a.c-b.c),cl=[];
        hc.forEach(c=>{const l=cl[cl.length-1];if(l&&c.c-l.last<=25){l.cells.push(c);l.last=c.c}else cl.push({cells:[c],last:c.c})});
        cl.forEach(k=>{k.txt=k.cells.slice().sort((a,b)=>a.r-b.r).map(T).join(' ');k.x=k.cells.reduce((a,c)=>a+c.c,0)/k.cells.length});
        const cD=cl.find(k=>CAT.desc.test(k.txt)),cP=cl.find(k=>CAT.pcs.test(k.txt)),gcs=cl.filter(k=>CAT.gw.test(k.txt));
        const cG=gcs.find(k=>/TOTAL|T\.?\s*G\.?\s*W/i.test(k.txt))||gcs.find(k=>!/\bPER\b/i.test(k.txt))||null,cV=cl.find(k=>CAT.cbm.test(k.txt));
        if(cD){
          const i=cl.indexOf(cD),lo=cl[i-1]?cl[i-1].x+20:cD.x-100,hi=cl[i+1]?cl[i+1].x-4:cD.x+150;
          spec={start:fd,
            desc:row=>{const t=row.filter(x=>x.c>=lo&&x.c<=hi&&/[A-Za-z]/.test(T(x))).map(T).join(' ');return /[A-Za-z]{3}/.test(t)?t:''},
            num:(row,k)=>{const h={p:cP,g:cG,v:cV}[k];if(!h)return null;let b=null,bd=1e9;row.forEach(x=>{const d=Math.abs(x.c-h.x);if(isN(x)&&d<bd){bd=d;b=x}});return bd<=35?num(b.v):null}};
        }
      }
    }
  }
  if(spec){
    let pcs=0,gw=0,cb=0,np=0,ng=0,nc=0,miss=0;const ds=[];
    for(let r=spec.start;miss<3&&r<spec.start+500;r++){
      const row=by.get(r);if(!row){miss++;continue}miss=0;
      if(row.some(x=>/^(?:TOTAL|TTL|SUBTOTAL|PROVIDED|MARK)/i.test(T(x))))break;
      const d=spec.desc(row);if(!d)continue;
      if(ds.length&&row.filter(x=>/^-?[\d.,]+$/.test(T(x))).length===0)break;
      ds.push(d.replace(/\(.*?\)/g,'').trim().toUpperCase());
      const p=spec.num(row,'p'),g=spec.num(row,'g'),v=spec.num(row,'v');
      if(p!==null){pcs+=p;np++}if(g!==null){gw+=g;ng++}if(v!==null){cb+=v;nc++}
    }
    const r2=x=>Math.round(x*100)/100;
    if(out.cargo.pieces===''&&np)out.cargo.pieces=pcs;
    if(out.cargo.gw===''&&ng)out.cargo.gw=r2(gw);
    if(out.cargo.cbm===''&&nc)out.cargo.cbm=r2(cb);
    if(!out.cargo.desc&&ds.length)out.cargo.desc=[...new Set(ds)].slice(0,4).join(' / ');
  }
}
function siParse(grid){
  const out=siParseBase(grid);siExtra(grid,out);
  out.found={
    'Embarcador':out.shipper.name,'Dirección del embarcador':out.shipper.address,
    'Consignatario (CNEE)':out.cnee.name,'Dirección del consignatario':out.cnee.address,
    'Puerto de carga (POL)':out.ship.pol,'Total de bultos':out.cargo.pieces,
    'Peso bruto':out.cargo.gw,'Volumen (CBM)':out.cargo.cbm,'Descripción de la mercancía':out.cargo.desc};
  return out;
}
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
  await need('exceljs');await need('siassets');
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
function siFillShipper(){
  if(S.shipper.name)return;
  const dig=x=>String(x||'').replace(/\D/g,''),mail=String(S.shipper.email||'').toLowerCase();
  const hit=siCat.map(r=>r.data&&r.data.shipper).find(sh=>sh&&sh.name&&((dig(sh.tax)&&dig(sh.tax)===dig(S.shipper.tax))||(mail&&String(sh.email||'').toLowerCase()===mail)));
  if(hit)['name','address','contact','phone','email','tax'].forEach(k=>{if(!S.shipper[k])S.shipper[k]=hit[k]||''});
}
function siStart(p){
  S=siBlank();siEditId=null;S.date=today();
  if(p){
    Object.assign(S.shipper,p.shipper);Object.assign(S.cnee,p.cnee);
    Object.keys(p.ship||{}).forEach(k=>{if(p.ship[k])S.ship[k]=p.ship[k]});
    if(p.po&&!S.ship.po)S.ship.po=p.po;
    Object.assign(S.cargo,p.cargo);
    if(p.comments)S.comments=p.comments;
    const m=siMatch(S.cnee.name,siClients);if(m){S.client=m.id;S.cnee.name=m.name;S.cnee.rnc=m.rnc||S.cnee.rnc||''}
    siFillShipper();
  }
  $('#siEditor').classList.add('on');siRender();
  $('#siEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function siGrid(file){
  const buf=await file.arrayBuffer();let sheets=[];
  if(/\.pdf$/i.test(file.name)){
    await need('pdfjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:buf}).promise,pages=[];
    for(let p=1;p<=pdf.numPages;p++){
      const tc=await(await pdf.getPage(p)).getTextContent();
      pages.push(tc.items.map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width})));
    }
    const g=siPdfGrid(pages);
    if(!g.length)throw new Error('Este PDF no tiene texto (parece un escaneo). Súbelo en Excel o llena los datos a mano.');
    return g;
  }
  if(/\.ods$/i.test(file.name)){
    try{await need('jszip');const z=await JSZip.loadAsync(buf);sheets=siOdsParse(await z.file('content.xml').async('string'))}catch(e){console.warn('ODS propio falló',e);sheets=[]}
  }
  if(!sheets.some(x=>x.grid.length)){
    await need('xlsx');
    const wb=XLSX.read(buf,{type:'array'});
    sheets=wb.SheetNames.map(n=>{
      const ws=wb.Sheets[n],g=[];
      Object.keys(ws).forEach(k=>{
        if(k[0]==='!')return;
        const c=ws[k],v=c.v!==undefined?c.v:c.w;
        if(v===undefined||v===null||String(v).trim()==='')return;
        const a=XLSX.utils.decode_cell(k);(g[a.r]=g[a.r]||[])[a.c]=v;
      });
      return{name:n,grid:g};
    });
  }
  let best=[],bs=-1;
  sheets.forEach(sh=>{
    let sc=/pack/i.test(sh.name)?5:0;
    sh.grid.forEach(r=>(r||[]).forEach(v=>{if(/packing|ctns|g\.?\s*w|cbm|consignee|^to\s*[:：]/i.test(String(v)))sc++}));
    if(sc>bs){bs=sc;best=sh.grid}
  });
  return best;
}
const siWait=ms=>new Promise(r=>setTimeout(r,ms));
async function siHandle(file){
  if(siBusy)return;
  if(!/\.(xlsx|xls|ods|csv|pdf)$/i.test(file.name))return toast('Sube un Excel (.xlsx, .xls, .ods), .csv o PDF');
  siBusy=true;const st=[...document.querySelectorAll('#siSteps .st')];
  $('#siSteps').classList.add('on');st.forEach(s=>s.className='st');st[0].classList.add('act');
  try{
    const grid=await siGrid(file);st[0].className='st done';st[1].classList.add('act');await siWait(350);
    const p=siParse(grid);
    const none=Object.values(p.found).every(v=>v===''||v==null);
    st[1].className='st done';st[2].classList.add('act');await siWait(350);
    st[2].className='st done';siStart(p);toast(none?'No reconocí los campos de este archivo; llénalos a mano':!S.shipper.name?'Falta el nombre del embarcador (puede venir en un logo). Escríbelo y guarda el SI: la próxima vez se llena solo.':'Revisa los datos y elige LCL o FCL');
    setTimeout(()=>$('#siSteps').classList.remove('on'),1500);
  }catch(e){console.error(e);toast(e.message||'No pude leer el archivo');st.forEach(s=>s.className='st')}
  siBusy=false;
}
const siOk=()=>{if(S.svc)return true;toast('Selecciona si es LCL o FCL');$('#siSvc').classList.add('err');$('#siSvc').scrollIntoView({behavior:'smooth',block:'center'});return false};
const siName=(d,ext)=>'Shipping_Instruction_'+((d.cnee&&d.cnee.name)||'DOWIE').replace(/[^\w]+/g,'_')+'.'+ext;
async function siDoPdf(d){try{await need('jspdf');await need('siassets');siPdf(d).save(siName(d,'pdf'));toast('PDF descargado')}catch(e){console.error(e);toast(e.message||'No se pudo generar el PDF')}}
async function siDoXls(d){try{await siXlsx(d,siName(d,'xlsx'));toast('Excel descargado')}catch(e){console.error(e);toast(e.message||'No se pudo generar el Excel')}}

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
    S.client=id;siRender();renderCtClients();toast('Cliente guardado');
  }catch(e){toast('No se pudo guardar el cliente')}
}
function siList(){
  $('#siList').innerHTML=siCat.length?siCat.map(r=>`<div class="card item" data-id="${esc(r.id)}"><div><b>${esc(r.consignee||'Sin consignatario')}</b><small>${esc(r.ref||'Sin referencia')} · ${esc(r.svc||'')} · ${esc(siDmy(r.date))}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="pdf">PDF</button><button class="btn gh sm" data-a="xls">Excel</button><button class="btn gh sm" data-a="edit">Editar</button><button class="btn gh sm" data-a="del">Eliminar</button></div></div>`).join(''):'<div class="card empty">No hay instrucciones guardadas.</div>';
}
function siBind(){
  $('#siForm').addEventListener('input',e=>{const p=e.target.dataset.p;if(p){siSet(S,p,e.target.value);if(p==='ship.mov')S.movAuto=false}});
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
    if(!S.ship.mov||S.movAuto){S.ship.mov=S.svc==='FCL'?'CY/CY':'CFS/CFS';S.movAuto=true}
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
  $('#siBlank').onclick=()=>siStart(null);
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

/* ---- lista de clientes: se carga al abrir la página (la usan Cotizaciones y Shipping) ---- */
async function clientsInit(){
  siLsGet(SI_LSC).forEach(c=>{const i=siClients.findIndex(x=>x.id===c.id);if(i>=0)siClients[i]=c;else siClients.push(c)});
  renderCtClients();
  if(!REMOTE)return;
  try{
    const cl=await siFetch('clientes','?select=*&order=name.asc');
    if(cl.length){siClients=SI_CLIENTS.filter(s=>!cl.some(c=>c.id===s.id)).concat(cl.map(c=>({id:c.id,name:c.name,rnc:c.rnc||''})));renderCtClients();if(siLoaded)siRender()}
  }catch(e){}
}
clientsInit();
