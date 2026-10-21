import {saveProduct,updateProductsBulk} from './db.js';
import {safeUrl,escapeHTML as esc} from './data.js';
let api,selection=new Set(),page=1,size=10,busy=false;
const $=id=>document.getElementById(id);
const cats=p=>Array.isArray(p.categories)&&p.categories.length?p.categories:(p.category?[p.category]:[]);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function build(){
 const rows=$('productRows'),card=rows.closest('.admin-card'),section=$('tab-products'),editor=$('productEditor');
 section.insertBefore(editor,card);
 const old=$('productSearch')?.parentElement;if(old&&old.querySelector('#productStatusFilter'))old.remove();
 const pager=$('productPageInfo')?.parentElement;if(pager)pager.remove();
 const table=rows.closest('table');table.querySelector('thead tr').insertAdjacentHTML('afterbegin','<th><input id="selectPage" type="checkbox" aria-label="Selecionar página"></th>');
 const bar=document.createElement('div');bar.className='product-tools';bar.innerHTML=
 '<div class="product-tool-filters"><input class="field" id="productSearch" type="search" placeholder="Buscar produto, descrição ou categoria"><select class="field" id="productCategoryFilter"><option value="">Todas as categorias</option></select><select class="field" id="productStatusFilter"><option value="">Todos os status</option><option value="published">Publicados</option><option value="draft">Rascunhos</option></select><select class="field" id="productSort"><option value="new">Mais recentes</option><option value="name">Nome A-Z</option><option value="priceAsc">Menor preço</option><option value="priceDesc">Maior preço</option></select><select class="field" id="productSize"><option value="10">10 por página</option><option value="25">25 por página</option><option value="50">50 por página</option></select></div>'+
 '<div class="product-tool-actions"><span id="selectionCount">0 selecionados</span><select class="field" id="bulkAction"><option value="">Ação em massa</option><option value="publish">Publicar</option><option value="draft">Ocultar</option><option value="featured">Destacar</option><option value="unfeatured">Remover destaque</option><option value="category">Adicionar categoria</option></select><select class="field hidden" id="bulkCategory"></select><button class="small-btn" type="button" id="applyBulk">Aplicar</button><button class="small-btn" type="button" id="clearSelection">Limpar seleção</button></div>'+
 '<div class="product-tool-actions"><button class="small-btn" type="button" id="exportCsv">Exportar backup CSV</button><label class="small-btn" for="importCsv">Importar CSV</label><input class="hidden" type="file" id="importCsv" accept=".csv,text/csv"><button class="small-btn" type="button" id="verifyLinks">Verificar links</button></div><div id="toolReport" class="product-tool-report hidden" role="status"></div>';
 card.insertBefore(bar,table.parentElement);
 const nav=document.createElement('div');nav.className='product-tool-pager';nav.innerHTML='<span id="productPageInfo"></span><div><button class="small-btn" type="button" id="prevProducts">Anterior</button> <button class="small-btn" type="button" id="nextProducts">Próxima</button></div>';table.parentElement.after(nav);
 for(const id of ['productSearch','productCategoryFilter','productStatusFilter','productSort','productSize'])$(id).addEventListener(id==='productSearch'?'input':'change',()=>{page=1;renderAdminTools()});
 $('bulkAction').onchange=()=> $('bulkCategory').classList.toggle('hidden',$('bulkAction').value!=='category');
 $('applyBulk').onclick=bulk;
 $('clearSelection').onclick=()=>{selection.clear();renderAdminTools()};
 $('selectPage').onchange=e=>{visible().forEach(p=>e.target.checked?selection.add(p.id):selection.delete(p.id));renderAdminTools()};
 rows.addEventListener('change',e=>{if(e.target.matches('[data-select-p]')){e.target.checked?selection.add(e.target.dataset.selectP):selection.delete(e.target.dataset.selectP);updateCount()}});
 $('prevProducts').onclick=()=>{page=Math.max(1,page-1);renderAdminTools()};
 $('nextProducts').onclick=()=>{page++;renderAdminTools()};
 $('exportCsv').onclick=exportCsv;
 $('importCsv').onchange=e=>{const f=e.target.files[0];if(f)importCsv(f).catch(err=>api.say('Erro na importação: '+err.message,true)).finally(()=>e.target.value='')};
 $('verifyLinks').onclick=verifyLinks;
}
function categories(){
 for(const [id,label] of [['productCategoryFilter','Todas as categorias'],['bulkCategory','Selecione a categoria']]){
  const el=$(id),old=el.value;el.replaceChildren(new Option(label,''));api.categories().forEach(c=>el.add(new Option(c.name,c.id)));if([...el.options].some(o=>o.value===old))el.value=old;
 }
}
function filtered(){
 const q=norm($('productSearch').value),c=$('productCategoryFilter').value,st=$('productStatusFilter').value,sort=$('productSort').value,cn=new Map(api.categories().map(x=>[x.id,x.name]));
 const arr=api.products().filter(p=>(!q||norm([p.name,p.description,...cats(p).map(id=>cn.get(id))].join(' ')).includes(q))&&(!c||cats(p).includes(c))&&(!st||(st==='published'?p.published!==false:p.published===false)));
 arr.sort((a,b)=>sort==='name'?String(a.name||'').localeCompare(String(b.name||''),'pt-BR'):sort==='priceAsc'?Number(a.price??Infinity)-Number(b.price??Infinity):sort==='priceDesc'?Number(b.price??-1)-Number(a.price??-1):String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 return arr;
}
function visible(){return filtered().slice((page-1)*size,page*size)}
function updateCount(){
 const current=new Set(api.products().map(p=>p.id));for(const id of selection)if(!current.has(id))selection.delete(id);
 $('selectionCount').textContent=selection.size+' selecionado(s)';
 const vis=visible(),head=$('selectPage');head.checked=vis.length>0&&vis.every(p=>selection.has(p.id));head.indeterminate=vis.some(p=>selection.has(p.id))&&!head.checked;
}
export function initAdminTools(context){api=context;build()}
export function renderAdminTools(){
 if(!api||!$('productSearch'))return;categories();size=Number($('productSize').value)||10;
 const arr=filtered(),total=Math.max(1,Math.ceil(arr.length/size));page=Math.min(page,total);
 const ids=new Set(visible().map(p=>p.id));
 for(const tr of $('productRows').querySelectorAll('tr')){
  const edit=tr.querySelector('[data-edit-p]');
  if(!edit){tr.style.display=arr.length?'none':'';const cell=tr.querySelector('td');if(cell)cell.colSpan=6;continue}
  const id=edit.dataset.editP;
  if(!tr.querySelector('[data-select-p]')){const td=document.createElement('td'),input=document.createElement('input');input.type='checkbox';input.dataset.selectP=id;input.setAttribute('aria-label','Selecionar produto');td.append(input);tr.prepend(td)}
  tr.querySelector('[data-select-p]').checked=selection.has(id);tr.style.display=ids.has(id)?'':'none';
 }
 $('productPageInfo').textContent=arr.length+' produtos · Página '+page+' de '+total;
 $('prevProducts').disabled=page===1;$('nextProducts').disabled=page===total;updateCount();
}
async function bulk(){
 if(busy)return;const ids=[...selection].filter(id=>api.products().some(p=>p.id===id)),act=$('bulkAction').value,cat=$('bulkCategory').value;
 if(!ids.length||!act){api.say('Selecione produtos e uma ação.',true);return}
 if(act==='category'&&!cat){api.say('Selecione a categoria.',true);return}
 if(!confirm('Aplicar '+$('bulkAction').selectedOptions[0].text+' a '+ids.length+' produto(s)?'))return;
 const items=ids.map(id=>{const p=api.products().find(x=>x.id===id),patch=act==='publish'?{published:true}:act==='draft'?{published:false}:act==='featured'?{featured:true}:act==='unfeatured'?{featured:false}:{categories:[...new Set([...cats(p),cat])],category:cats(p)[0]||cat};return {id,patch:{...patch,updatedAt:new Date().toISOString()}}});
 busy=true;$('applyBulk').disabled=true;
 try{await updateProductsBulk(items);selection.clear();await api.refresh();api.say('Atualizados '+ids.length+' produtos.')}catch(e){console.error(e);api.say('Erro: '+(e.code||e.message)+'. Recarregue e confira os dados.',true)}
 finally{busy=false;$('applyBulk').disabled=false}
}
const fields=['name','price','oldPrice','description','images','categories','affiliateUrl','badge','featured','published'];
const csvEscape=v=>{const s=String(v??'');return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
function exportCsv(){
 const names=new Map(api.categories().map(c=>[c.id,c.name]));
 const lines=[fields.join(';'),...api.products().map(p=>fields.map(k=>csvEscape(k==='images'?(p.images||[]).join('|'):k==='categories'?cats(p).map(id=>names.get(id)||id).join('|'):p[k])).join(';'))];
 const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='4shope-produtos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseCsv(text){
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
 const rows=[],row=[];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===sep&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push([...row]);row.length=0;cell=''}else cell+=c}
 if(quoted)throw Error('Aspas não fechadas no CSV');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 const header=(rows.shift()||[]).map(x=>x.trim());return rows.map((r,i)=>({line:i+2,data:Object.fromEntries(header.map((h,j)=>[h,(r[j]||'').trim()]))}));
}
const boolean=v=>['sim','true','1','yes'].includes(norm(v));
function price(v){if(!v)return null;let s=v.replace(/[R$\s]/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');const n=Number(s);if(!Number.isFinite(n)||n<0)throw Error('Preço inválido');return n}
function report(html){$('toolReport').innerHTML=html;$('toolReport').classList.remove('hidden')}
async function importCsv(file){
 if(busy)return;if(file.size>2000000){api.say('CSV acima de 2 MB.',true);return}
 const rows=parseCsv(await file.text());if(!rows.length||rows.length>500){api.say('CSV precisa ter de 1 a 500 linhas.',true);return}
 const categoryMap=new Map(api.categories().map(c=>[norm(c.name),c.id])),existing=new Set(api.products().map(p=>norm(p.affiliateUrl)).filter(Boolean)),seen=new Set(),valid=[],errors=[];
 for(const {line,data:d} of rows){try{
  if(!d.name||!safeUrl(d.affiliateUrl))throw Error('Nome ou link inválido');
  const url=norm(d.affiliateUrl);if(existing.has(url)||seen.has(url))throw Error('Link duplicado');
  const images=(d.images||'').split('|').map(x=>x.trim()).filter(Boolean);if(images.some(x=>!safeUrl(x)))throw Error('Imagem inválida');
  const categoryNames=(d.categories||d.category||'').split('|').map(x=>x.trim()).filter(Boolean),ids=categoryNames.map(x=>categoryMap.get(norm(x))||api.categories().find(c=>c.id===x)?.id);
  if(!ids.length||ids.some(x=>!x))throw Error('Categoria não cadastrada');
  valid.push({name:d.name.slice(0,160),price:price(d.price),oldPrice:price(d.oldPrice),description:(d.description||'').slice(0,5000),images,categories:[...new Set(ids)],category:ids[0],affiliateUrl:safeUrl(d.affiliateUrl),badge:(d.badge||'').slice(0,30),featured:boolean(d.featured),published:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});seen.add(url);
 }catch(e){errors.push('Linha '+line+': '+e.message)}}
 report('<strong>Prévia:</strong> '+valid.length+' válidos; '+errors.length+' com erro. Importação sempre em rascunho.'+(errors.length?'<details><summary>Ver erros</summary>'+errors.slice(0,40).map(esc).join('<br>')+'</details>':''));
 if(!valid.length||!confirm('Criar '+valid.length+' produtos como RASCUNHO?'))return;
 busy=true;let ok=0;const failures=[];
 try{for(const p of valid){try{await saveProduct(p);ok++}catch(e){failures.push(e.code||e.message)}}
 await api.refresh();report('<strong>Importação concluída:</strong> '+ok+' criados; '+failures.length+' falhas.'+(failures.length?'<p>'+failures.slice(0,10).map(esc).join('<br>')+'</p>':''));
 }finally{busy=false}
}
function verifyLinks(){
 const products=api.products(),seen=new Map(),issues=[];
 for(const p of products){
  const u=String(p.affiliateUrl||'').trim();if(!u||!safeUrl(u)){issues.push([p,'Link ausente ou inválido']);continue}
  if(seen.has(u))issues.push([p,'Link duplicado']);else seen.set(u,p.id);
  if(!(p.images||[]).length)issues.push([p,'Sem imagens']);else if(p.images.some(x=>!safeUrl(x)))issues.push([p,'URL de imagem inválida']);
 }
 report('<strong>Verificação local:</strong> '+products.length+' produtos; '+issues.length+' alertas. Não confirma estoque ou disponibilidade na Shopee.'+(issues.length?'<div class="product-link-results">'+issues.slice(0,100).map(([p,reason])=>'<div>'+esc(p.name)+' — '+esc(reason)+' <button class="small-btn" data-tool-edit="'+esc(p.id)+'">Editar</button></div>').join('')+'</div>':'<p>Nenhum problema de formato encontrado.</p>'));
 $('toolReport').querySelectorAll('[data-tool-edit]').forEach(b=>b.onclick=()=>api.edit(b.dataset.toolEdit));
}
