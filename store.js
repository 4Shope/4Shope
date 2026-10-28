import {configured,loadPublic,recordProductEvent} from './db.js?v=20261027-aggregate1';
import {iconSVG} from './category-icons.js';
import {initialCategories,initialSettings,placeholder,currency,safeUrl,escapeHTML as esc,sanitizeId} from './data.js';
const $=id=>document.getElementById(id);let products=[],categories=initialCategories,settings=initialSettings;let favs=new Set(JSON.parse(localStorage.getItem('4shope-favorites')||'[]'));let term='';const themeKey='4shope-theme';
function setTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem(themeKey,t);document.querySelector('meta[name="theme-color"]').content=t==='dark'?'#101010':'#f8f8f6'}
setTheme(localStorage.getItem(themeKey)||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));$('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');$('year').textContent=new Date().getFullYear();
function toast(s){const e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>e.classList.remove('show'),2800)}
function image(src,alt,extra=''){const url=safeUrl(src)||placeholder;return `<img src="${esc(url)}" alt="${esc(alt)}" ${extra} onerror="this.onerror=null;this.src='${placeholder}'">`}

// Compartilha a página da 4Shope, nunca o link externo de afiliado.
async function shareProduct(id){
 const p=products.find(item=>item.id===id);if(!p)return;
 const url=new URL(location.pathname+'#produto/'+encodeURIComponent(p.id),location.origin).href;
 const data={title:p.name,text:'Olha este achadinho na 4Shope: '+p.name,url};
 if(navigator.share){try{await navigator.share(data);trackProduct(p.id,'share');return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(url);trackProduct(p.id,'share');toast('Link do produto copiado!')}
 catch{window.prompt('Copie o link do produto:',url)}
}
// Evita salvar imagens pelos gestos comuns, sem bloquear links e botões.
document.addEventListener('contextmenu',e=>{if(e.target.closest('img, picture, .product-media, .detail-photo, .mini-banner, .marketing-banner, .campaign-cover'))e.preventDefault()});
document.addEventListener('dragstart',e=>{if(e.target.closest('img, picture'))e.preventDefault()});
function productCard(p,eager=false){const id=esc(p.id);return `<article class="product-card"><a class="product-media" href="#produto/${encodeURIComponent(p.id)}">${image(p.images?.[0],p.name,eager?'loading="eager" fetchpriority="high" decoding="async"':'loading="lazy" decoding="async"')}${p.badge?`<span class="product-badge">${esc(p.badge)}</span>`:''}</a><button class="heart ${favs.has(p.id)?'is-fav':''}" data-fav="${id}" aria-label="${favs.has(p.id)?'Remover dos':'Adicionar aos'} favoritos">${favs.has(p.id)?'♥':'♡'}</button><div class="product-info"><span class="product-category">${esc(productCategoryNames(p))}</span><a href="#produto/${encodeURIComponent(p.id)}"><div class="product-title">${esc(p.name)}</div></a>${p.price!=null&&p.oldPrice!=null&&Number(p.oldPrice)>Number(p.price)?`<div class="product-old">${currency(p.oldPrice)}</div>`:''}${p.price!=null&&p.price!==''?`<div class="product-price"><small class="price-prefix">A partir de</small>${currency(p.price)}</div>`:''}<a class="product-action" href="#produto/${encodeURIComponent(p.id)}">Ver detalhes e comprar ↗</a><button type="button" class="product-share" data-share-product="${id}" aria-label="Compartilhar ${esc(p.name)}">↗ Compartilhar</button></div></article>`}
function categoryName(id){return categories.find(c=>c.id===id)?.name||'Achadinhos'}
function productCategoryIds(p){return [...new Set([...(Array.isArray(p.categories)?p.categories:[]),...(p.category?[p.category]:[])])].filter(Boolean)}
function productCategoryNames(p){return productCategoryIds(p).map(categoryName).join(' · ')||'Achadinhos'}
function empty(message){return `<div class="empty-state"><strong>Por enquanto, nada por aqui.</strong>${esc(message)}</div>`}
function renderGrid(id,items,message='Novos produtos aparecerão em breve.'){ $(id).innerHTML=items.length?items.map((p,i)=>productCard(p,id==='featuredGrid'&&i<4)).join(''):empty(message)}
let quickCategory='';
function renderQuickCategories(){const target=$('quickCategories');target.innerHTML='<button type="button" class="quick-chip '+(!quickCategory?'active':'')+'" data-quick-category="">Todos</button>'+categories.map(c=>`<button type="button" class="quick-chip ${quickCategory===c.id?'active':''}" data-quick-category="${esc(c.id)}"><span>${iconSVG(c.icon,c.name)}</span>${esc(c.name)}</button>`).join('');const matching=products.filter(p=>productCategoryIds(p).includes(quickCategory));$('quickProducts').hidden=!quickCategory;if(quickCategory)renderGrid('quickProducts',matching.slice(0,12),'Ainda não há produtos nesta categoria.');$('featuredGrid').hidden=!!quickCategory}
function categoryCard(c){const cover=safeUrl(c.image);return `<a class="category-card ${cover?'has-category-cover':''}" href="#produtos" data-category="${esc(c.id)}"><span class="cat-icon">${cover?`<img src="${esc(cover)}" alt="" loading="lazy" onerror="this.style.display='none'">`:iconSVG(c.icon,c.name)}</span><div><strong>${esc(c.name)}</strong><span class="cat-arrow">↗</span><small>Explorar seleção</small></div></a>`}
function renderInstagramPreview(){const box=$('instagramPreview');if(!box)return;const posts=(settings.instagramPosts||[]).filter(p=>safeUrl(p.image)&&safeUrl(p.link)).slice(0,6);box.innerHTML=posts.map(p=>`<a class="ig-post" href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer" aria-label="Ver publicação ${esc(p.caption||'no Instagram')}">${image(p.image,p.caption||'Publicação da 4Shope','loading="lazy"')}<span>↗</span></a>`).join('');box.hidden=!posts.length}
let popularMode='view';function renderPopular(){const area=$('popularGrid'),section=$('em-alta');if(!area)return;const data=settings.popularSnapshot||{};const ids=(data[popularMode]||[]).map(x=>typeof x==='string'?x:x.id);const chosen=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean).slice(0,8);section.hidden=!((data.view||[]).length||(data.buy||[]).length);renderGrid('popularGrid',chosen,'Nenhum produto nesse ranking ainda.');document.querySelectorAll('[data-popular]').forEach(b=>b.classList.toggle('active',b.dataset.popular===popularMode))}
document.querySelectorAll('[data-popular]').forEach(b=>b.onclick=()=>{popularMode=b.dataset.popular;renderPopular()});
function render(){renderMarketing();renderExtraPromos();setTimeout(watchAdViews,0);document.documentElement.style.setProperty('--accent-custom',/^#[0-9a-fA-F]{6}$/.test(settings.accent||'')?settings.accent:'#252525');const preset=['classic','gold','green','violet','rose','ocean'].includes(settings.themePreset)?settings.themePreset:'classic';document.documentElement.dataset.shopPalette=preset;document.documentElement.dataset.shopDensity=['comfortable','compact','spacious'].includes(settings.layoutDensity)?settings.layoutDensity:'comfortable';document.documentElement.style.setProperty('--shop-accent',preset==='classic'&&/^#[0-9a-fA-F]{6}$/.test(settings.accent||'')?settings.accent:'');for(const [id,value] of [['heroEditableTitle',settings.heroTitle],['heroEditableText',settings.heroText],['announcementEditable',settings.announcement]]){const el=document.getElementById(id);if(el&&value)el.textContent=value}const sorted=[...products].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));renderGrid('featuredGrid',(sorted.filter(p=>p.featured).length?sorted.filter(p=>p.featured):sorted).sort((a,b)=>Number(!!b.images?.[0])-Number(!!a.images?.[0])).slice(0,12),'Os produtos em destaque serão publicados em breve.');renderGrid('recentGrid',sorted.slice(0,homeLimit));$('loadMoreHome').hidden=homeLimit>=sorted.length;$('homeCategories').innerHTML=categories.map(categoryCard).join('');renderQuickCategories();renderGrid('discoverGrid',sorted.slice(0,16).sort((a,b)=>a.name.localeCompare(b.name)),'Em breve, mais descobertas.');$('allCategories').innerHTML=categories.map(categoryCard).join('');$('categoryFilter').innerHTML='<option value="">Todas as categorias</option>'+categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('aboutText').textContent=settings.about||initialSettings.about;renderPopular();renderInstagramPreview();const instagram=safeUrl(settings.instagram);$('instagramLink').href=instagram||'#contato';$('instagramLink').textContent=instagram?'Visitar nosso Instagram ↗':'Instagram em breve';$('instagramHandle').textContent=settings.instagramHandle||'Acompanhe nossas novidades em breve';let links='';if(safeUrl(settings.whatsapp))links+=`<a class="contact-row" href="${esc(safeUrl(settings.whatsapp))}" target="_blank" rel="noopener noreferrer">WhatsApp <span>↗</span></a>`;if(settings.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email))links+=`<a class="contact-row" href="mailto:${esc(settings.email)}">E-mail <span>↗</span></a>`;$('contactLinks').innerHTML=links||'<div class="contact-row">Canais de atendimento em breve <span>✦</span></div>';$('customBanners').innerHTML=(settings.banners||[]).filter(b=>b.title).slice(0,2).map(b=>`<div class="mini-banner" ${safeUrl(b.image)?`style="background-image:linear-gradient(90deg,rgba(0,0,0,.82),rgba(0,0,0,.25)),url('${esc(safeUrl(b.image))}')"`:''}><div><span>${esc(b.subtitle||'DESTAQUE 4SHOPE')}</span><strong>${esc(b.title)}</strong></div><a data-ad-view="${esc(b.id||'banner-personalizado')}" data-ad-id="${esc(b.id||'banner-personalizado')}" href="${esc(safeUrl(b.link)||'#produtos')}" ${safeUrl(b.link)?'target="_blank" rel="noopener noreferrer"':''} aria-label="Abrir destaque">↗</a></div>`).join('');renderCatalog();renderFavorites()}
let catalogPage=1;const catalogPageSize=24;let homeLimit=12;
// Busca tolerante a acentos, plural/singular, palavras fora de ordem e pequenos erros de digitação.
function normalizeSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim()}
function searchTokens(value){return normalizeSearch(value).split(/\s+/).filter(Boolean)}
function closeWord(query,word){
 if(word.includes(query)||query.includes(word)&&word.length>=3)return true;
 const stem=w=>w.endsWith('es')&&w.length>5?w.slice(0,-2):w.endsWith('s')&&w.length>4?w.slice(0,-1):w;
 if(stem(word).includes(stem(query))&&stem(query).length>=3)return true;
 if(query.length<5||Math.abs(query.length-word.length)>1)return false;
 // Uma troca, omissão ou inserção de letra.
 let i=0,j=0,errors=0;
 while(i<query.length&&j<word.length){
  if(query[i]===word[j]){i++;j++;continue}
  if(++errors>1)return false;
  if(query.length>word.length)i++;
  else if(word.length>query.length)j++;
  else{i++;j++}
 }
 return errors+Number(i<query.length||j<word.length)<=1
}
function productSearchScore(p,query){
 const wanted=searchTokens(query);
 if(!wanted.length)return 1;
 const name=searchTokens(p.name),category=searchTokens(productCategoryNames(p)),description=searchTokens(p.description);
 let score=0;
 for(const token of wanted){
  if(name.some(w=>closeWord(token,w)))score+=8;
  else if(category.some(w=>closeWord(token,w)))score+=4;
  else if(description.some(w=>closeWord(token,w)))score+=1;
  else return 0;
 }
 return score
}
function renderCatalog(){let list=products.filter(p=>(!term||productSearchScore(p,term)>0)&&(!$('categoryFilter').value||productCategoryIds(p).includes($('categoryFilter').value)));switch($('sortFilter').value){case'low':list.sort((a,b)=>(a.price==null?Infinity:a.price)-(b.price==null?Infinity:b.price));break;case'high':list.sort((a,b)=>(b.price==null?-Infinity:b.price)-(a.price==null?-Infinity:a.price));break;case'name':list.sort((a,b)=>a.name.localeCompare(b.name));break;default:list.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))}const totalPages=Math.max(1,Math.ceil(list.length/catalogPageSize));catalogPage=Math.min(Math.max(1,catalogPage),totalPages);renderGrid('catalogGrid',list.slice((catalogPage-1)*catalogPageSize,catalogPage*catalogPageSize),'Tente outra busca ou categoria.');$('resultCount').textContent=`${list.length} produto${list.length===1?'':'s'} encontrado${list.length===1?'':'s'}`;renderCatalogPager(totalPages,list.length)}
function renderCatalogPager(totalPages,count){
 let pager=$('catalogPager');
 if(!pager){pager=document.createElement('nav');pager.id='catalogPager';pager.className='catalog-pager';pager.setAttribute('aria-label','Páginas de produtos');$('catalogGrid').after(pager)}
 if(totalPages<=1){pager.replaceChildren();return}
 pager.innerHTML='<button type="button" class="small-btn" data-catalog-page="prev" '+(catalogPage===1?'disabled':'')+'>← Anterior</button><span>Página '+catalogPage+' de '+totalPages+'</span><button type="button" class="small-btn" data-catalog-page="next" '+(catalogPage===totalPages?'disabled':'')+'>Próxima →</button>';
 pager.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{catalogPage+=btn.dataset.catalogPage==='next'?1:-1;renderCatalog();$('resultCount').scrollIntoView({behavior:'smooth',block:'start'})});
}
function renderFavorites(){renderGrid('favoritesGrid',products.filter(p=>favs.has(p.id)),'Toque no coração dos produtos para salvá-los aqui.')}
function videoEmbed(s){if(!s)return '';try{const u=new URL(s);if(u.protocol!=='https:')return '';let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([\w-]+)/)?.[1]||'';if(u.hostname==='youtu.be')id=u.pathname.slice(1);if(id&&/^[\w-]{11}$/.test(id))return `<div class="product-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo do produto" loading="lazy" allowfullscreen></iframe></div>`;if(u.pathname.toLowerCase().endsWith('.mp4'))return `<div class="product-video"><video controls playsinline preload="none" src="${esc(u.href)}"></video></div>`}catch{}return ''}
const viewedInTab=new Set();
function trackProduct(id,type){
 if(type!=='view'&&type!=='buy')return;
 if(type==='view'){
  if(viewedInTab.has(id))return;
  viewedInTab.add(id);
  // Lembra visualizações nesta aba também depois de atualizar a página.
  // Não guarda IP, identidade, usuário nem cookie.
  try{
   const key='4shope-view:'+id;
   const previous=Number(sessionStorage.getItem(key)||0);
   if(previous&&Date.now()-previous<12*60*60*1000)return;
   sessionStorage.setItem(key,String(Date.now()));
  }catch{}
 }
 recordProductEvent(id,type).catch(()=>{});
}
function priceReportUrl(p){const raw=String(settings.whatsapp||'');const match=raw.match(/wa\.me\/(55\d{10,11})/);const digits=match?match[1]:raw.replace(/\D/g,'');const number=/^55\d{10,11}$/.test(digits)?digits:/^\d{10,11}$/.test(digits)?'55'+digits:'';if(!number)return '';const page=new URL(location.pathname+'#produto/'+encodeURIComponent(p.id),location.origin).href;const price=p.price!=null&&p.price!==''?currency(p.price):'não informado';const msg='Olá! Encontrei um preço diferente do anunciado na 4Shope. Poderiam verificar?\n\nProduto: '+p.name+'\nPreço anunciado: '+price+'\nLink: '+page+'\n\nPreço que encontrei na Shopee: ';return 'https://wa.me/'+number+'?text='+encodeURIComponent(msg)}
function couponWhatsapp(p,c,name){
 const raw=String(settings.whatsapp||'');
 const m=raw.match(/wa\.me\/(55\d{10,11})/);
 const digits=m?m[1]:raw.replace(/\D/g,'');
 const number=/^55\d{10,11}$/.test(digits)?digits:/^\d{10,11}$/.test(digits)?'55'+digits:'';
 if(!number)return '';
 const link=new URL(location.pathname+'#produto/'+encodeURIComponent(p.id),location.origin).href;
 const msg='Olá! Quero solicitar o resgate de uma promoção da 4Shope.\n\nNome: '+name+'\nCupom: '+c.code+'\nProduto: '+p.name+'\nLink: '+link+(c.message?'\nCondições: '+c.message:'')+'\n\nPor favor, confirmem a disponibilidade e as condições da promoção.';
 return 'https://wa.me/'+number+'?text='+encodeURIComponent(msg);
}
function couponBox(p){
 const available=(settings.coupons||[]).some(c=>c.active!==false&&(c.used||0)<(c.limit||0)&&(!c.productId||c.productId===p.id)&&(!c.categoryId||productCategoryIds(p).includes(c.categoryId)));
 if(!available)return '';
 return '<div class="product-coupon-box"><strong>Tem cupom promocional?</strong><p>Informe seu código e nome para solicitar a promoção. O resgate depende de confirmação pelo WhatsApp.</p><label for="couponInput">Código do cupom</label><input id="couponInput" class="field" autocomplete="off" placeholder="Seu cupom"><label for="couponCustomer">Seu nome</label><input id="couponCustomer" class="field" maxlength="80" autocomplete="name" placeholder="Nome para identificação"><button type="button" id="applyProductCoupon" class="small-btn">Aplicar cupom</button><p id="couponFeedback" class="admin-hint" role="status"></p></div>';
}
function connectCoupon(p){
 const btn=$('applyProductCoupon');if(!btn)return;
 btn.onclick=()=>{
  const code=($('couponInput').value||'').trim().toUpperCase(),name=($('couponCustomer').value||'').trim();
  const note=$('couponFeedback'),today=new Date().toISOString().slice(0,10);
  const c=(settings.coupons||[]).find(c=>c.code===code&&c.active!==false&&(!c.start||c.start<=today)&&(!c.end||c.end>=today)&&(!c.productId||c.productId===p.id)&&(!c.categoryId||productCategoryIds(p).includes(c.categoryId))&&(Number(c.used)||0)<Number(c.limit));
  if(!c){note.textContent='Cupom inválido, vencido, esgotado ou não aplicável a este produto.';return}
  if(name.length<2){note.textContent='Informe seu nome para se identificar ao solicitar a promoção.';return}
  const target=couponWhatsapp(p,c,name);
  if(!target){note.textContent='WhatsApp da loja indisponível. Entre em contato pelos canais da 4Shope.';return}
  const buy=$('buyLink');if(!buy)return;
  buy.href=target;buy.removeAttribute('data-buy-product');buy.querySelector('strong').textContent='Resgatar Promoção';buy.querySelector('small').textContent='Solicitar confirmação no WhatsApp';
  note.textContent='Cupom válido! Toque em Resgatar Promoção. A disponibilidade será confirmada no WhatsApp.';
 };
}
let lastViewed='';function renderDetail(id){const p=products.find(x=>x.id===id);if(!p){$('productDetail').innerHTML=empty('Este produto não está disponível.');return}if(lastViewed!==id){lastViewed=id;trackProduct(id,'view')}const imgs=(p.images||[]).filter(safeUrl);if(!imgs.length)imgs.push(placeholder);const link=safeUrl(p.affiliateUrl);$('productDetail').innerHTML=`<div class="detail-layout"><div><div class="detail-photo" id="detailPhoto">${image(imgs[0],p.name)}</div><div class="detail-thumbs">${imgs.map((s,i)=>`<button data-photo="${i}" aria-label="Ver foto ${i+1}">${image(s,p.name)}</button>`).join('')}</div></div><div class="detail-content"><span class="section-kicker">${esc(productCategoryNames(p))}</span><h1>${esc(p.name)}</h1>${Number(p.oldPrice)>Number(p.price)?`<div class="product-old">${currency(p.oldPrice)}</div>`:''}${p.price!=null&&p.price!==''?`<div class="product-price"><small class="price-prefix">A partir de</small>${currency(p.price)}</div>`:''}<details class="product-description-disclosure"><summary>Descrição do produto <span aria-hidden="true">⌄</span></summary><p class="detail-description">${esc(p.description||'Conheça este achado na Shopee.')}</p></details>${videoEmbed(p.videoUrl)}${couponBox(p)}<div class="detail-purchase">${link?`<a class="detail-buy-primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer sponsored" id="buyLink" data-buy-product="${esc(p.id)}"><span class="detail-buy-icon" aria-hidden="true">↗</span><span class="detail-buy-copy"><strong>Comprar agora</strong><small>Finalizar pedido na Shopee</small></span><span class="detail-buy-cart" aria-hidden="true"><svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l2.6 12.1a2 2 0 0 0 2 1.6h10a2 2 0 0 0 2-1.6L22 7H5"/></svg></span></a>`:'<div class="detail-buy-primary detail-buy-disabled">Link de compra indisponível</div>'}<p class="detail-buy-hint">Confira o valor final, as opções de frete e os cupons disponíveis antes de concluir.</p></div><div class="detail-actions detail-secondary-actions"><button class="btn" data-fav="${esc(p.id)}" style="border-color:var(--line);color:var(--ink)">${favs.has(p.id)?'♥ Salvo':'♡ Favoritar'}</button><button type="button" class="btn" data-share-product="${esc(p.id)}" aria-label="Compartilhar produto">↗ Compartilhar</button></div><div class="price-info-box"><strong>Sobre preços e disponibilidade</strong><p>Os valores são referências e podem variar conforme cor, tamanho, modelo, vendedor, promoções, estoque, região e frete. Confira sempre as condições finais na Shopee.</p>${priceReportUrl(p)?`<a class="price-report-link" href="${esc(priceReportUrl(p))}" target="_blank" rel="noopener noreferrer">Encontrou um preço diferente? Avise pelo WhatsApp ↗</a>`:``}</div><p class="detail-note"><a href="#sobre">Saiba como funciona a 4Shope ↗</a></p></div></div>`;$('productDetail').querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{$('detailPhoto').innerHTML=image(imgs[Number(b.dataset.photo)],p.name)});connectCoupon(p)}
let previousRoute=location.hash||'#inicio';
let productReturnRoute='';
let productReturnY=0;
function navigate(restore=false){
 let hash='inicio';try{hash=decodeURIComponent(location.hash.slice(1)||'inicio')}catch{hash='inicio'}
 const [section,...rest]=hash.split('/');
 const page=['inicio','produtos','categorias','favoritos','sobre','contato','produto','campanha'].includes(section)?section:'inicio';
 const currentRoute=location.hash||'#inicio';
 const enteringProduct=page==='produto'&&!previousRoute.startsWith('#produto/');
 if(enteringProduct){productReturnRoute=previousRoute;productReturnY=window.scrollY}
 const returning=previousRoute.startsWith('#produto/')&&currentRoute===productReturnRoute;
 document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===page));
 document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===page));
 if(page==='campanha')renderCampaign(sanitizeId(rest.join('/')));
 if(page==='produto'){
  renderDetail(sanitizeId(rest.join('/')));
  const back=$('produto').querySelector('.back-link');
  if(back){back.href=productReturnRoute||'#produtos';back.textContent='← Continuar de onde parei'}
 }
 if(page==='favoritos')renderFavorites();
 if(returning){
  const y=productReturnY;
  window.scrollTo({top:y,behavior:'instant'});
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'})));
 }else if(!restore)window.scrollTo({top:0,behavior:'instant'});
 previousRoute=currentRoute;
}
$('loadMoreHome').onclick=()=>{homeLimit+=12;render();$('loadMoreHome').scrollIntoView({behavior:'smooth',block:'center'})};$('searchForm').onsubmit=e=>{e.preventDefault();term=$('searchInput').value.trim();$('categoryFilter').value='';catalogPage=1;renderCatalog();location.hash='produtos';if(location.hash==='#produtos')navigate()};$('categoryFilter').onchange=()=>{catalogPage=1;renderCatalog()};$('sortFilter').onchange=()=>{catalogPage=1;renderCatalog()};$('clearFilters').onclick=()=>{term='';$('searchInput').value='';$('categoryFilter').value='';$('sortFilter').value='new';catalogPage=1;renderCatalog()};$('mobileFilterToggle').onclick=()=>$('categoryFilter').closest('.filter-panel').classList.toggle('open');document.addEventListener('click',e=>{const quick=e.target.closest('[data-quick-category]');if(quick){quickCategory=quick.dataset.quickCategory;renderQuickCategories();return}const share=e.target.closest('[data-share-product]');if(share){e.preventDefault();shareProduct(share.dataset.shareProduct);return}const buy=e.target.closest('[data-buy-product]');if(buy)trackProduct(buy.dataset.buyProduct,'buy');const ad=e.target.closest('[data-ad-id]');if(ad)trackProduct(ad.dataset.adId,'ad');const fav=e.target.closest('[data-fav]');if(fav){e.preventDefault();const id=fav.dataset.fav;favs.has(id)?favs.delete(id):favs.add(id);localStorage.setItem('4shope-favorites',JSON.stringify([...favs]));render();if(location.hash.startsWith('#produto/'))navigate();toast(favs.has(id)?'Adicionado aos favoritos':'Removido dos favoritos')}const cat=e.target.closest('[data-category]');if(cat){$('categoryFilter').value=cat.dataset.category;term='';$('searchInput').value='';catalogPage=1;renderCatalog()}});window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#produto/'))lastViewed='';navigate()});
(async()=>{
 if(configured){
  try{
   const data=await loadPublic();
   products=data.products;
   categories=data.categories.length?data.categories.sort((a,b)=>(a.order||0)-(b.order||0)):initialCategories;
   settings={...initialSettings,...(data.settings||{})};
  }catch(e){
   console.error('Falha ao carregar a vitrine:',e);
   toast('Não foi possível carregar os produtos. Tente atualizar.');
  }
 }
 render();
 navigate(true);
})();

/* Banners e campanhas editáveis no painel. */
function marketingVisible(x){const d=new Date().toISOString().slice(0,10);return x.active!==false&&(!x.start||x.start<=d)&&(!x.end||x.end>=d)}
function bannerDestination(link){if(!link)return '';if(/^#(?:campanha|produto)\/[a-zA-Z0-9_-]+$/.test(link)||['#inicio','#produtos','#categorias'].includes(link))return link;return safeUrl(link)}
function bannerMarkup(b){const url=safeUrl(b.image);if(!url)return '';const mobile=safeUrl(b.mobileImage);const dest=bannerDestination(b.link);const picture=`<picture>${mobile?`<source media="(max-width: 650px)" srcset="${esc(mobile)}">`:''}<img loading="lazy" src="${esc(url)}" alt="${esc(b.title||'Campanha 4Shope')}" onerror="this.style.display='none'"></picture>`;return dest?`<a class="marketing-banner" data-ad-view="${esc(b.id||'banner')}" data-ad-id="${esc(b.id||'banner')}" href="${esc(dest)}" ${dest.startsWith('#')?'':'target="_blank" rel="noopener noreferrer sponsored"'} aria-label="${esc(b.title||'Ver campanha')}">${picture}</a>`:`<div class="marketing-banner">${picture}</div>`}
const seenAds=new Set();let adObserver;
function watchAdViews(){if(!('IntersectionObserver' in window))return;adObserver?.disconnect();adObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const id=entry.target.dataset.adView;if(id&&!seenAds.has(id)){seenAds.add(id);trackProduct(id,'adView')}adObserver.unobserve(entry.target)}},{threshold:.5});document.querySelectorAll('[data-ad-view]').forEach(el=>adObserver.observe(el))}
// Blocos opcionais do painel: nenhum efeito quando nao ha cadastros.
function promoLink(link){
 if(!link)return '';
 if(/^#produtos\?categoria=[A-Za-z0-9_-]+$/.test(link))return '#produtos';
 return bannerDestination(link);
}
function promotionBlock(item){
 const picture=safeUrl(item.image);
 const dest=promoLink(item.link);
 const img=picture?'<img src="'+esc(picture)+'" loading="lazy" decoding="async" alt="'+esc(item.name||'Parceria 4Shope')+'">':'';
 const text='<div class="partner-copy"><strong>'+esc(item.name||'Parceria especial')+'</strong>'+(item.description?'<p>'+esc(item.description)+'</p>':'')+'</div>';
 const body=img+text;
 const attr=item.link?.startsWith('#produtos?categoria=')?' data-promo-category="'+esc(item.link.split('=')[1])+'"':'';
 const main=dest?'<a class="partner-main" href="'+esc(dest)+'"'+attr+(dest.startsWith('#')?'':' target="_blank" rel="noopener noreferrer sponsored"')+'>'+body+'</a>':'<div class="partner-main">'+body+'</div>';
 const contact=item.contact?'<span class="partner-contact">Contato: '+esc(item.contact)+'</span>':'';
 const social=safeUrl(item.social)?'<a href="'+esc(safeUrl(item.social))+'" target="_blank" rel="noopener noreferrer">Rede social ↗</a>':'';
 return '<article class="partner-tile">'+main+'<div class="partner-links">'+contact+social+'</div></article>';
}
function carouselBlock(c){
 const slides=(c.slides||[]).filter(x=>safeUrl(x.image));if(!slides.length)return '';
 const cells=slides.map((slide,i)=>{
  const dest=promoLink(slide.link),cat=slide.link?.startsWith('#produtos?categoria=')?' data-promo-category="'+esc(slide.link.split('=')[1])+'"':'';
  const picture='<picture>'+(safeUrl(slide.mobileImage)?'<source media="(max-width: 650px)" srcset="'+esc(safeUrl(slide.mobileImage))+'">':'')+'<img src="'+esc(safeUrl(slide.image))+'" loading="lazy" decoding="async" alt="'+esc(slide.alt||c.name||'Promoção 4Shope')+'"></picture>';
  return '<div class="promo-slide">'+(dest?'<a href="'+esc(dest)+'"'+cat+(dest.startsWith('#')?'':' target="_blank" rel="noopener noreferrer sponsored"')+'>'+picture+'</a>':picture)+'</div>';
 }).join('');
 return '<section class="shop-carousel" aria-label="'+esc(c.name||'Carrossel')+'"><div class="shop-carousel-track">'+cells+'</div><div class="shop-carousel-controls"><button class="shop-carousel-prev" type="button" aria-label="Imagem anterior">‹</button><span class="shop-carousel-counter">1 / '+slides.length+'</span><button class="shop-carousel-next" type="button" aria-label="Próxima imagem">›</button></div></section>';
}
function renderExtraPromos(){
 const map={hero:'extraHeroPromos',mid:'extraMidPromos',bottom:'extraBottomPromos',product:'extraProductPromos',detail:'extraDetailPromos',categories:'extraCategoryPromos'};
 for(const [place,id] of Object.entries(map)){
  const host=$(id);if(!host)continue;
  const items=[...(settings.partners||[]).filter(p=>p.placement===place&&p.active!==false).map(p=>({...p,kind:'partner'})),...(settings.carousels||[]).filter(c=>c.placement===place&&marketingVisible(c)).map(c=>({...c,kind:'carousel'}))].sort((a,b)=>(a.order||0)-(b.order||0));
  host.innerHTML=items.map(x=>x.kind==='partner'?promotionBlock(x):carouselBlock(x)).join('');
 }
}
document.addEventListener('click',e=>{
 const cat=e.target.closest('[data-promo-category]');
 if(cat){e.preventDefault();const value=cat.dataset.promoCategory;if($('categoryFilter')){$('categoryFilter').value=value;term='';$('searchInput').value='';catalogPage=1;renderCatalog();}if(location.hash!=='#produtos')location.hash='#produtos';else navigate();return}
 const btn=e.target.closest('.shop-carousel-prev,.shop-carousel-next');if(!btn)return;
 const root=btn.closest('.shop-carousel'),track=root?.querySelector('.shop-carousel-track');if(!track)return;
 const slides=[...track.children],current=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));
 const next=btn.classList.contains('shop-carousel-next')?Math.min(slides.length-1,current+1):Math.max(0,current-1);
 track.scrollTo({left:next*track.clientWidth,behavior:'smooth'});
});
document.addEventListener('scroll',()=>{}, {passive:true});
function renderMarketing(){const banners=(settings.marketingBanners||[]).filter(marketingVisible).sort((a,b)=>(a.order||0)-(b.order||0));for(const [place,id] of [['hero','marketingHeroBanners'],['mid','marketingMidBanners'],['bottom','marketingBottomBanners']]){$(id).innerHTML=banners.filter(b=>b.placement===place).map(bannerMarkup).join('')}
 const campaigns=(settings.campaigns||[]).filter(marketingVisible);$('marketingCampaigns').innerHTML=campaigns.length?`<div class="section-head"><div><div class="section-kicker">SELEÇÕES ESPECIAIS</div><h2>Campanhas da 4Shope<span class="period">.</span></h2></div></div><div class="campaign-tiles">${campaigns.map(c=>`<a class="campaign-tile" data-ad-view="${esc(c.id)}" data-ad-id="${esc(c.id)}" href="#campanha/${encodeURIComponent(c.id)}">${safeUrl(c.image)?image(c.image,c.name,'loading="lazy"'):''}<div><small class="campaign-type">${esc(({collection:"Seleção especial",new:"Novidades",featured:"Destaques",seasonal:"Campanha temática",coupons:"Confira os cupons"})[c.type]||"Seleção especial")}</small><strong>${esc(c.name)}</strong><span>Explorar seleção ↗</span></div></a>`).join('')}</div>`:''}
function renderCampaign(id){const c=(settings.campaigns||[]).find(x=>x.id===id&&marketingVisible(x));if(!c){$('campaignDetail').innerHTML=empty('Esta campanha não está disponível.');return}const chosen=products.filter(p=>(c.productIds||[]).includes(p.id));$('campaignDetail').innerHTML=`<div class="page-heading"><div class="section-kicker">CAMPANHA 4SHOPE</div><h1>${esc(c.name)}</h1><p>${esc(c.description||'Uma seleção especial de produtos para você.')}</p></div>${safeUrl(c.image)?`<div class="campaign-cover">${image(c.image,c.name)}</div>`:''}<div class="campaign-share"><button id="shareCampaign" class="small-btn">Compartilhar campanha ↗</button></div><div class="product-grid">${chosen.length?chosen.map(productCard).join(''):empty('Em breve, novos produtos nesta campanha.')}</div>`;const btn=$('shareCampaign');btn.onclick=()=>{const u=location.href;if(navigator.share)navigator.share({title:c.name,url:u}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(()=>toast('Link copiado!')).catch(()=>toast('Copie o endereço desta página.'));else toast('Copie o endereço desta página.')} }

// Métricas agregáveis sem identificador de visitante, cookies analíticos ou armazenamento de rastreamento.
