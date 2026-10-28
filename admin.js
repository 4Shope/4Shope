import {initAdminTools,renderAdminTools} from './admin-tools.js';
import {iconGroups,iconSVG,resolveIcon} from './category-icons.js';
import {configured,getAuthInstance,onAuth,login,logout,loadAdmin,saveProduct,removeProduct,saveCategory,removeCategory,saveSettings,loadAnalytics,loadProductStats,deleteAnalytics,clearLegacyEvents,clearMonthlyStatsBefore} from './db.js?v=20261027-cleanup1';
import {initialSettings,currency,safeUrl,escapeHTML as esc} from './data.js';
const $=id=>document.getElementById(id);let products=[],categories=[],settings={...initialSettings};
const say=(s,error=false)=>{const el=$('adminMessage');el.textContent=s;el.style.color=error?'#c44':'#28845a';clearTimeout(window._msg);window._msg=setTimeout(()=>el.textContent='',5000)};
if(!configured){$('configNotice').classList.remove('hidden');$('loginForm').querySelector('button[type=submit]').disabled=true}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';try{await login($('email').value,$('password').value)}catch(err){console.error('Erro de autenticação:',err);$('loginError').textContent=`Não foi possível autenticar: ${err?.code||err?.message||'erro desconhecido'}.`}};
if(configured)onAuth(async user=>{if(!user){$('loginView').classList.remove('hidden');$('adminView').classList.add('hidden');return}$('loginError').textContent='';$('loginView').classList.add('hidden');$('adminView').classList.remove('hidden');try{await refresh()}catch(err){console.error('Autenticação OK; falha ao carregar dados do painel:',err);const code=err?.code||err?.message||'erro desconhecido';say(`Login realizado, mas não foi possível carregar os dados: ${code}. Confira as regras do Firestore.`,true);let warning=$('adminLoadError');if(!warning){warning=document.createElement('div');warning.id='adminLoadError';warning.setAttribute('role','alert');warning.style.cssText='padding:14px;margin:12px 0;border:1px solid #c44;border-radius:8px;color:#c44;white-space:normal';$('adminView').prepend(warning)}warning.textContent=`Sua conta entrou, mas a leitura do Firestore falhou (${code}). Os produtos não foram alterados. Recarregue a página para tentar novamente.`}});
$('logoutBtn').onclick=()=>logout();
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.admin-section').forEach(s=>s.classList.toggle('active',s.id==='tab-'+name));$('adminTitle').textContent=({dashboard:'Visão geral',products:'Produtos',categories:'Categorias',marketing:'Marketing e campanhas',analytics:'Estatísticas e visitas',settings:'Minha loja',partners:'Parcerias',carousels:'Carrosséis',coupons:'Cupons'})[name]||'Painel'}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
document.querySelectorAll('.admin-quick-actions [data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
async function refresh(){const d=await loadAdmin();products=d.products;categories=d.categories.sort((a,b)=>(a.order||0)-(b.order||0));settings={...initialSettings,...(d.settings||{})};$('statProducts').textContent=products.length;$('statPublished').textContent=products.filter(p=>p.published).length;$('statCategories').textContent=categories.length;$('statDrafts').textContent=products.filter(p=>!p.published).length;$('statFeatured').textContent=products.filter(p=>p.featured).length;$('statMissingLinks').textContent=products.filter(p=>!safeUrl(p.affiliateUrl)).length;renderProducts();renderCategories();renderSettings();renderMarketing();renderPartners();renderCarousels();renderCoupons()}
function renderProducts(){const q=($('adminProductSearch').value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),filter=$('adminProductFilter').value;const visible=products.filter(p=>p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)&&(filter==='all'||filter==='published'&&p.published||filter==='draft'&&!p.published||filter==='featured'&&p.featured||filter==='missing'&&!safeUrl(p.affiliateUrl)));$('adminProductCount').textContent=visible.length+' de '+products.length+' produtos';$('productRows').innerHTML=visible.length?visible.map(p=>`<tr><td><img class="table-thumb" src="${esc(safeUrl(p.images?.[0])||'product-placeholder.svg')}" onerror="this.src='product-placeholder.svg'" alt=""></td><td>${esc(p.name)}</td><td>${currency(p.price)}</td><td>${p.published?'Publicado':'Rascunho'}</td><td><button class="small-btn" data-view-p="${esc(p.id)}">Prévia</button><button class="small-btn" data-edit-p="${esc(p.id)}">Editar</button><button class="small-btn danger" data-del-p="${esc(p.id)}">Excluir</button></td></tr>`).join(''):'<tr><td colspan="5">Nenhum produto cadastrado ainda.</td></tr>';$('pCategories').innerHTML=categories.map(c=>`<label class="checkline"><input type="checkbox" name="productCategories" value="${esc(c.id)}"> ${esc(c.name)}</label>`).join('');renderAdminTools()}
$('adminProductSearch').oninput=renderProducts;$('adminProductFilter').onchange=renderProducts;
function previewProductDraft(){const name=$('pName').value.trim()||'Nome do produto',price=$('pPrice').value,desc=$('pDescription').value.trim(),url=$('pImages').value.split('\n').map(x=>x.trim()).find(safeUrl);const box=$('productAdminPreview');box.classList.remove('hidden');box.innerHTML=`<div class="draft-preview-card"><img src="${esc(safeUrl(url)||'product-placeholder.svg')}" alt="Prévia" onerror="this.src='product-placeholder.svg'"><div><small>PRÉVIA ANTES DE PUBLICAR</small><h3>${esc(name)}</h3>${price?`<p>A partir de <strong>${currency(Number(price))}</strong></p>`:'<p>Preço não informado</p>'}<p>${esc(desc.slice(0,240)||'Adicione uma descrição para apresentar melhor o produto.')}</p><span class="small-btn">Ver detalhes e comprar ↗</span></div></div>`}
$('previewProductBtn').onclick=previewProductDraft;
function editProduct(id){const p=products.find(p=>p.id===id);$('productEditor').classList.remove('hidden');$('productEditorTitle').textContent=p?'Editar produto':'Cadastrar produto';$('productForm').reset();$('productAdminPreview').classList.add('hidden');$('pId').value=p?.id||'';$('pName').value=p?.name||'';const selected=new Set(Array.isArray(p?.categories)&&p.categories.length?p.categories:(p?.category?[p.category]:[]));$('pCategories').querySelectorAll('input[type="checkbox"]').forEach(el=>el.checked=selected.has(el.value));$('pPrice').value=p?.price??'';$('pOldPrice').value=p?.oldPrice??'';$('pVideo').value=p?.videoUrl||'';$('pDescription').value=p?.description||'';$('pImages').value=(p?.images||[]).join('\n');$('pLink').value=p?.affiliateUrl||'';$('pBadge').value=p?.badge||'';$('pFeatured').checked=!!p?.featured;$('pPublished').checked=p?p.published!==false:true;preview();$('productEditor').scrollIntoView({behavior:'smooth'})}
$('newProduct').onclick=()=>editProduct();$('cancelProduct').onclick=()=>$('productEditor').classList.add('hidden');function preview(){const urls=$('pImages').value.split('\n').map(s=>s.trim()).filter(safeUrl).slice(0,8);$('imagePreview').innerHTML=urls.map(s=>`<img src="${esc(safeUrl(s))}" style="width:70px;height:70px;object-fit:cover;border-radius:7px" onerror="this.style.display='none'" alt="Prévia">`).join('')}$('pImages').oninput=preview;
$('productForm').onsubmit=async e=>{e.preventDefault();const id=$('pId').value;const images=$('pImages').value.split('\n').map(s=>s.trim()).filter(Boolean);if(images.some(s=>!safeUrl(s))||!safeUrl($('pLink').value)){say('Use URLs http/https válidas nas imagens e no link de afiliado.',true);return}if($('pVideo').value.trim()&&!videoLink($('pVideo').value)){say('Link de vídeo inválido: use YouTube ou MP4 HTTPS.',true);return}const old=products.find(p=>p.id===id);const selectedCategories=[...$('pCategories').querySelectorAll('input:checked')].map(el=>el.value);if(!selectedCategories.length){say('Selecione pelo menos uma categoria.',true);return}const data={name:$('pName').value.trim(),category:selectedCategories[0],categories:selectedCategories,price:$('pPrice').value.trim()===''?null:Number($('pPrice').value),oldPrice:$('pOldPrice').value.trim()===''?null:Number($('pOldPrice').value),description:$('pDescription').value.trim(),images,videoUrl:videoLink($('pVideo').value),affiliateUrl:safeUrl($('pLink').value),badge:$('pBadge').value.trim(),featured:$('pFeatured').checked,published:$('pPublished').checked,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};try{await saveProduct(data,id);await refresh();$('productEditor').classList.add('hidden');say('Produto salvo com sucesso.')}catch(err){console.error(err);say('Erro ao salvar. Verifique suas permissões.',true)}};
$('productRows').onclick=async e=>{const view=e.target.closest('[data-view-p]');if(view){const p=products.find(x=>x.id===view.dataset.viewP);if(p){editProduct(p.id);previewProductDraft()}return}const edit=e.target.closest('[data-edit-p]');const del=e.target.closest('[data-del-p]');if(edit)editProduct(edit.dataset.editP);if(del&&confirm('Excluir definitivamente este produto?')){try{await removeProduct(del.dataset.delP);await refresh();say('Produto excluído.')}catch(err){console.error(err);say('Não foi possível excluir.',true)}}};
function renderCategories(){const q=($('categorySearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const visible=categories.filter(c=>c.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));$('categoryRows').innerHTML=visible.length?visible.map(c=>`<div class="contact-row"><span>${(safeUrl(c.image)||safeUrl(c.imageDark))?`<img class="category-admin-thumb" src="${esc(safeUrl(c.image)||safeUrl(c.imageDark))}" alt="" loading="lazy">`:iconSVG(c.icon,c.name)} ${esc(c.name)}</span><span><button class="small-btn" data-edit-c="${esc(c.id)}">Editar</button><button class="small-btn danger" data-del-c="${esc(c.id)}">Excluir</button></span></div>`).join(''):'<p style="font-size:12px;color:var(--muted)">Cadastre suas primeiras categorias abaixo.</p>'}
$('categorySearch').oninput=renderCategories;
function renderCategoryIcons(openGroup=''){
 const chosen=resolveIcon($('cIcon').value,$('cName').value);
 $('categoryIconChoices').innerHTML=Object.entries(iconGroups).map(([group,icons])=>`<details class="icon-group" ${openGroup===group?'open':''}><summary>${esc(group)} <span>${icons.length} ícones</span></summary><div class="icon-options">${icons.map(icon=>`<button type="button" class="icon-choice ${chosen===icon?'selected':''}" data-category-icon="${icon}" title="${icon}" aria-label="Escolher ícone ${icon}" aria-pressed="${chosen===icon}">${iconSVG(icon)}</button>`).join('')}</div></details>`).join('');
 $('selectedCategoryIcon').innerHTML=iconSVG(chosen);
}
$('categoryIconChoices').onclick=e=>{
 const b=e.target.closest('[data-category-icon]');if(!b)return;
 const group=b.closest('details')?.querySelector('summary')?.firstChild?.textContent?.trim()||'';
 $('cIcon').value=b.dataset.categoryIcon;
 renderCategoryIcons(group);
};
$('cIcon').oninput=renderCategoryIcons;
renderCategoryIcons();
function clearCategory(){$('categoryForm').reset();$('cId').value='';$('categoryEditorTitle').textContent='Nova categoria';renderCategoryIcons()}$('cancelCategory').onclick=clearCategory;
$('categoryRows').onclick=async e=>{const edit=e.target.closest('[data-edit-c]');const del=e.target.closest('[data-del-c]');if(edit){const c=categories.find(c=>c.id===edit.dataset.editC);$('cId').value=c.id;$('cName').value=c.name;$('cIcon').value=c.icon||'';$('cImage').value=c.image||'';$('cImageDark').value=c.imageDark||'';renderCategoryIcons();$('cOrder').value=c.order||0;$('categoryEditorTitle').textContent='Editar categoria'}if(del){if(products.some(p=>p.category===del.dataset.delC||(Array.isArray(p.categories)&&p.categories.includes(del.dataset.delC)))){say('Mova os produtos desta categoria antes de excluí-la.',true);return}if(confirm('Excluir esta categoria?'))try{await removeCategory(del.dataset.delC);await refresh();say('Categoria excluída.')}catch(err){console.error(err);say('Não foi possível excluir.',true)}}};
$('categoryForm').onsubmit=async e=>{e.preventDefault();const id=$('cId').value;const data={name:$('cName').value.trim(),icon:$('cIcon').value.trim()||'✦',image:safeUrl($('cImage').value.trim()),imageDark:safeUrl($('cImageDark').value.trim()),order:Number($('cOrder').value)||0};try{await saveCategory(data,id);clearCategory();await refresh();say('Categoria salva.')}catch(err){console.error(err);say('Não foi possível salvar categoria.',true)}};
function videoLink(s){if(!s.trim())return '';try{const u=new URL(s);const h=u.hostname.toLowerCase();return u.protocol==='https:'&&(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(h)||u.pathname.toLowerCase().endsWith('.mp4'))?u.href:''}catch{return ''}}

/* Prévia manual de posts: não depende da API privada do Instagram. */
function renderIgPosts(){const list=$('igPostRows');list.innerHTML=(settings.instagramPosts||[]).slice(0,6).map((p,i)=>igRow(p,i)).join('');}
function igRow(p={},i=0){return `<div class="ig-admin-row" data-ig-row><span class="ig-row-number">Post ${i+1}</span><label>URL da imagem<input class="field" data-ig-image type="url" placeholder="https://.../imagem.jpg" value="${esc(p.image||'')}"></label><label>Link do post no Instagram<input class="field" data-ig-link type="url" placeholder="https://www.instagram.com/p/..." value="${esc(p.link||'')}"></label><label>Legenda curta (opcional)<input class="field" data-ig-caption maxlength="100" value="${esc(p.caption||'')}"></label><button type="button" class="small-btn danger" data-remove-ig>Remover</button></div>`}
function collectIgPosts(){return [...document.querySelectorAll('[data-ig-row]')].map(row=>({image:row.querySelector('[data-ig-image]').value.trim(),link:row.querySelector('[data-ig-link]').value.trim(),caption:row.querySelector('[data-ig-caption]').value.trim()})).filter(p=>p.image||p.link||p.caption)}
$('addIgPost').onclick=()=>{const rows=$('igPostRows');if(rows.children.length>=6){say('Você pode mostrar até 6 publicações.',true);return}rows.insertAdjacentHTML('beforeend',igRow({},rows.children.length))};
$('igPostRows').onclick=e=>{if(e.target.closest('[data-remove-ig]')){e.target.closest('[data-ig-row]').remove();[...$('igPostRows').children].forEach((r,i)=>r.querySelector('.ig-row-number').textContent='Post '+(i+1))}};
$('jumpToBanners').onclick=()=>document.getElementById('marketingBannerRows').closest('.admin-card').scrollIntoView({behavior:'smooth',block:'start'});

function whatsappDigits(v){let d=String(v||'').replace(/\D/g,'');return d.startsWith('55')&&d.length>=12?d.slice(2):d}
function renderSettings(){$('sThemePreset').value=settings.themePreset||'classic';$('sLayoutDensity').value=settings.layoutDensity||'comfortable';renderIgPosts();$('sInstagram').value=settings.instagram||'';$('sHandle').value=settings.instagramHandle||'';$('sWhatsapp').value=whatsappDigits(settings.whatsapp);$('sEmail').value=settings.email||'';$('sAbout').value=settings.about||'';$('sHeroTitle').value=settings.heroTitle||'';$('sHeroText').value=settings.heroText||'';$('sAccent').value=/^#[0-9a-fA-F]{6}$/.test(settings.accent||'')?settings.accent:'#252525';$('sAnnouncement').value=settings.announcement||'';[0,1].forEach((i)=>{const b=settings.banners?.[i]||{};$('sBanner'+(i+1)).value=b.title||'';$('sBanner'+(i+1)+'Sub').value=b.subtitle||'';$('sBanner'+(i+1)+'Link').value=b.link||'';$('sBanner'+(i+1)+'Image').value=b.image||''})}
$('settingsForm').onsubmit=async e=>{e.preventDefault();const instagram=$('sInstagram').value.trim(),digits=whatsappDigits($('sWhatsapp').value),whatsapp=digits?'https://wa.me/55'+digits:'';if((instagram&&!safeUrl(instagram))||(digits&&!/^\d{10,11}$/.test(digits))){say('Confira o Instagram e o número do WhatsApp com DDD.',true);return}const igPosts=collectIgPosts();if(igPosts.some(p=>!safeUrl(p.image)||!safeUrl(p.link)||!/^https?:\/\/(?:www\.)?instagram\.com\//i.test(p.link))){say('Nos posts do Instagram, informe URLs de imagem válidas e links de publicações do instagram.com.',true);return}const banners=[1,2].map(i=>({title:$('sBanner'+i).value.trim(),subtitle:$('sBanner'+i+'Sub').value.trim(),link:safeUrl($('sBanner'+i+'Link').value.trim()),image:safeUrl($('sBanner'+i+'Image').value.trim())}));try{await saveSettings({...settings,instagram,instagramHandle:$('sHandle').value.trim(),whatsapp,email:$('sEmail').value.trim(),about:$('sAbout').value.trim(),heroTitle:$('sHeroTitle').value.trim(),heroText:$('sHeroText').value.trim(),accent:$('sAccent').value,themePreset:$('sThemePreset').value,layoutDensity:$('sLayoutDensity').value,instagramPosts:collectIgPosts(),announcement:$('sAnnouncement').value.trim(),banners});await refresh();say('Informações atualizadas.')}catch(err){console.error(err);say('Não foi possível salvar as configurações.',true)}};

/* Central de marketing: conteúdo salvo no documento público de configurações. */
const marketingId=()=>('m'+Date.now().toString(36)+Math.random().toString(36).slice(2,9));
const validMedia=u=>!u||!!safeUrl(u);
const validDestination=u=>!u||!!safeUrl(u)||/^#(?:campanha|produto)\/[a-zA-Z0-9_-]+$/.test(u)||['#produtos','#categorias','#inicio'].includes(u);
const activeToday=item=>{const d=new Date().toISOString().slice(0,10);return item.active!==false&&(!item.start||item.start<=d)&&(!item.end||item.end>=d)};
async function persistMarketing(patch){await saveSettings({...settings,...patch});await refresh()}
function renderMarketing(){
 const q=($('campaignSearch')?.value||'').toLocaleLowerCase('pt-BR');
 const bq=($('bannerSearch')?.value||'').toLocaleLowerCase('pt-BR');
 const campaigns=(settings.campaigns||[]).filter(c=>(c.name||'').toLocaleLowerCase('pt-BR').includes(q));
 $('campaignRows').innerHTML=campaigns.length?campaigns.map(c=>`<div class="contact-row"><span><strong>${esc(c.name)}</strong><br><small>${activeToday(c)?'No ar':'Inativa ou agendada'} · ${(c.productIds||[]).length} produtos</small></span><span><button class="small-btn" data-edit-campaign="${esc(c.id)}">Editar</button><button class="small-btn danger" data-delete-campaign="${esc(c.id)}">Excluir</button></span></div>`).join(''):'<p>Nenhuma campanha criada ainda.</p>';
 const banners=[...(settings.marketingBanners||[])].filter(b=>(b.title||'').toLocaleLowerCase('pt-BR').includes(bq)).sort((a,b)=>String(a.placement).localeCompare(String(b.placement))||(a.order||0)-(b.order||0));
 $('marketingBannerRows').innerHTML=banners.length?banners.map(b=>`<div class="contact-row"><span><strong>${esc(b.title)}</strong><br><small>${esc(({hero:'Topo',mid:'Entre vitrines',bottom:'Final'})[b.placement]||'Topo')} · ${activeToday(b)?'No ar':'Inativo ou agendado'}</small></span><span><button class="small-btn" data-move-banner="up" data-banner-id="${esc(b.id)}" title="Subir banner" aria-label="Subir banner">↑</button><button class="small-btn" data-move-banner="down" data-banner-id="${esc(b.id)}" title="Descer banner" aria-label="Descer banner">↓</button><button class="small-btn" data-edit-banner="${esc(b.id)}">Editar</button><button class="small-btn danger" data-delete-banner="${esc(b.id)}">Excluir</button></span></div>`).join(''):'<p>Nenhum banner de marketing cadastrado.</p>';
}
$('campaignSearch').oninput=renderMarketing;$('bannerSearch').oninput=renderMarketing;
function filterCampaignProducts(){
 const q=($('campaignProductSearch').value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cat=$('campaignProductCategory').value;
 let count=0;
 $('campaignProductChoices').querySelectorAll('label.marketing-choice').forEach(label=>{
  const input=label.querySelector('input');if(!input)return;
  if(input.checked)count++;
  const p=products.find(p=>p.id===input.value);
  const name=(p?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  label.hidden=!name.includes(q)||(cat&&!([...(p?.categories||[]),p?.category].includes(cat)));
 });
 $('campaignSelectedCount').textContent=count+' produtos selecionados';
}
$('campaignProductSearch').oninput=filterCampaignProducts;
$('campaignProductCategory').onchange=filterCampaignProducts;
$('campaignProductChoices').onchange=filterCampaignProducts;
function editCampaign(id){
 const c=(settings.campaigns||[]).find(x=>x.id===id);$('campaignForm').reset();$('campaignEditor').classList.remove('hidden');$('mCampaignId').value=c?.id||'';$('mCampaignName').value=c?.name||'';$('mCampaignType').value=c?.type||'collection';$('mCampaignText').value=c?.description||'';$('mCampaignImage').value=c?.image||'';$('mCampaignPlacement').value=c?.placement||'bottom';$('mCampaignOrder').value=c?.order??10;$('mCampaignStart').value=c?.start||'';$('mCampaignEnd').value=c?.end||'';$('mCampaignActive').checked=c?c.active!==false:true;
 $('campaignProductChoices').innerHTML=products.map(p=>`<label class="marketing-choice"><input type="checkbox" value="${esc(p.id)}" ${(c?.productIds||[]).includes(p.id)?'checked':''}><span>${esc(p.name)} ${p.published?'':'(rascunho)'}</span></label>`).join('')||'<p>Cadastre produtos antes de montar uma campanha.</p>';
 $('campaignProductSearch').value='';$('campaignProductCategory').innerHTML='<option value="">Todas as categorias</option>'+categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');filterCampaignProducts();
 $('campaignEditor').scrollIntoView({behavior:'smooth'});
}
$('newCampaign').onclick=()=>editCampaign();
$('cancelCampaign').onclick=()=>$('campaignEditor').classList.add('hidden');
$('campaignForm').onsubmit=async e=>{e.preventDefault();const image=$('mCampaignImage').value.trim(),start=$('mCampaignStart').value,end=$('mCampaignEnd').value;if(!validMedia(image)||(start&&end&&start>end)){say('Confira a URL da imagem e o período da campanha.',true);return}const id=$('mCampaignId').value||marketingId();const c={id,name:$('mCampaignName').value.trim(),placement:$('mCampaignPlacement').value,order:Number($('mCampaignOrder').value)||0,type:$('mCampaignType').value,description:$('mCampaignText').value.trim(),image:safeUrl(image),start,end,active:$('mCampaignActive').checked,productIds:[...$('campaignProductChoices').querySelectorAll('input:checked')].map(x=>x.value)};try{await persistMarketing({campaigns:[...(settings.campaigns||[]).filter(x=>x.id!==id),c]});$('campaignEditor').classList.add('hidden');say('Campanha salva.')}catch(err){console.error(err);say('Não foi possível salvar a campanha.',true)}};
$('campaignRows').onclick=async e=>{const edit=e.target.closest('[data-edit-campaign]'),del=e.target.closest('[data-delete-campaign]');if(edit)editCampaign(edit.dataset.editCampaign);if(del&&confirm('Excluir esta campanha?'))try{await persistMarketing({campaigns:(settings.campaigns||[]).filter(x=>x.id!==del.dataset.deleteCampaign)});say('Campanha excluída.')}catch(err){say('Erro ao excluir.',true)}};
function editBanner(id){const b=(settings.marketingBanners||[]).find(x=>x.id===id);$('bannerForm').reset();$('bannerEditor').classList.remove('hidden');$('mBannerId').value=b?.id||'';$('mBannerTitle').value=b?.title||'';$('mBannerImage').value=b?.image||'';$('mBannerMobile').value=b?.mobileImage||'';$('mBannerLink').value=b?.link||'';$('mBannerPlacement').value=b?.placement||'hero';$('mBannerOrder').value=b?.order??10;$('mBannerStart').value=b?.start||'';$('mBannerEnd').value=b?.end||'';$('mBannerActive').checked=b?b.active!==false:true;$('bannerEditor').scrollIntoView({behavior:'smooth'})}
$('newBanner').onclick=()=>editBanner();
$('cancelBanner').onclick=()=>$('bannerEditor').classList.add('hidden');
$('bannerForm').onsubmit=async e=>{e.preventDefault();const image=$('mBannerImage').value.trim(),mobileImage=$('mBannerMobile').value.trim(),link=$('mBannerLink').value.trim(),start=$('mBannerStart').value,end=$('mBannerEnd').value;if(!safeUrl(image)||!validMedia(mobileImage)||!validDestination(link)||(start&&end&&start>end)){say('Confira os links e as datas do banner.',true);return}const id=$('mBannerId').value||marketingId();const b={id,title:$('mBannerTitle').value.trim(),image:safeUrl(image),mobileImage:safeUrl(mobileImage),link,start,end,placement:$('mBannerPlacement').value,order:Number($('mBannerOrder').value)||0,active:$('mBannerActive').checked};try{await persistMarketing({marketingBanners:[...(settings.marketingBanners||[]).filter(x=>x.id!==id),b]});$('bannerEditor').classList.add('hidden');say('Banner salvo.')}catch(err){console.error(err);say('Não foi possível salvar o banner.',true)}};
$('marketingBannerRows').onclick=async e=>{const move=e.target.closest('[data-move-banner]');if(move){const all=[...(settings.marketingBanners||[])],current=all.find(x=>x.id===move.dataset.bannerId);if(!current)return;const peers=all.filter(x=>x.placement===current.placement).sort((a,b)=>(a.order||0)-(b.order||0));const i=peers.findIndex(x=>x.id===current.id),other=peers[i+(move.dataset.moveBanner==='up'?-1:1)];if(!other)return;peers.forEach((x,j)=>x.order=(j+1)*10);const tmp=current.order;current.order=other.order;other.order=tmp;try{await persistMarketing({marketingBanners:all});say('Ordem atualizada.')}catch(err){say('Erro ao reorganizar banners.',true)}return}const edit=e.target.closest('[data-edit-banner]'),del=e.target.closest('[data-delete-banner]');if(edit)editBanner(edit.dataset.editBanner);if(del&&confirm('Excluir este banner?'))try{await persistMarketing({marketingBanners:(settings.marketingBanners||[]).filter(x=>x.id!==del.dataset.deleteBanner)});say('Banner excluído.')}catch(err){say('Erro ao excluir.',true)}};

function analyticsPeriod(){
 const now=new Date(),from=new Date(now);
 switch($('analyticsPeriod').value){
  case 'week':from.setDate(from.getDate()-7);break;
  case 'month':from.setMonth(from.getMonth()-1);break;
  case 'semester':from.setMonth(from.getMonth()-6);break;
  case 'year':from.setFullYear(from.getFullYear()-1);break;
 }
 return [from.getTime(),now.getTime()];
}
let lastAnalytics=[];let rankingCache={view:[],buy:[]};
function rankingList(type){return rankingCache[type].slice(0,10).map((item,i)=>`<div class="rank-row"><span class="rank-number">${i+1}</span><span>${esc(products.find(p=>p.id===item.id)?.name||'Produto indisponível')}</span><strong>${item.count}</strong></div>`).join('')||'<p class="admin-hint">Sem dados neste período.</p>'}
$('publishPopular').onclick=async()=>{if(!rankingCache.view.length&&!rankingCache.buy.length){say('Atualize as estatísticas antes de publicar.',true);return}if(!confirm('Atualizar a vitrine Em alta com os rankings deste período?'))return;try{await saveSettings({...settings,popularSnapshot:{view:rankingCache.view.slice(0,8).map(x=>x.id),buy:rankingCache.buy.slice(0,8).map(x=>x.id),updatedAt:Date.now()}});await refresh();$('popularPublishStatus').textContent='Ranking publicado na loja.';say('Ranking publicado com sucesso.')}catch(e){console.error(e);say('Não foi possível publicar o ranking.',true)}};
function selectedStatMonths(){
 const now=new Date(),count={week:1,month:1,semester:6,year:12}[$('analyticsPeriod').value]||1;
 return Array.from({length:count},(_,i)=>new Date(Date.UTC(now.getFullYear(),now.getMonth()-i,1)).toISOString().slice(0,7).replace('-',''));
}
async function refreshAnalytics(){
 $('analyticsStatus').textContent='Carregando contadores mensais...';
 try{
  const stats=await loadProductStats(selectedStatMonths());
  const counts=new Map();let views=0,buys=0;
  for(const item of stats){
   const v=Number(item.views)||0,b=Number(item.buys)||0;
   if(!counts.has(item.productId))counts.set(item.productId,{view:0,buy:0});
   counts.get(item.productId).view+=v;counts.get(item.productId).buy+=b;views+=v;buys+=b;
  }
  const pub=new Set(products.filter(p=>p.published!==false).map(p=>p.id));
  const ranked=type=>[...counts].filter(([id])=>pub.has(id)).map(([id,v])=>({id,count:v[type]})).filter(v=>v.count>0).sort((a,b)=>b.count-a.count);
  rankingCache={view:ranked('view'),buy:ranked('buy')};
  $('rankingViews').innerHTML=rankingList('view');$('rankingBuys').innerHTML=rankingList('buy');
  $('metricViews').textContent=views.toLocaleString('pt-BR');
  $('metricBuys').textContent=buys.toLocaleString('pt-BR');
  $('popularPublishStatus').textContent='Período: '+$('analyticsPeriod').selectedOptions[0].textContent+'. Publique para atualizar a vitrine.';
  $('analyticsStatus').textContent=stats.length+' contadores mensais, '+views+' acessos e '+buys+' cliques em Comprar. Histórico antigo não incluído.';
 }catch(e){console.error(e);$('analyticsStatus').textContent='Erro ao ler contadores. Verifique as regras do Firebase.'}
}
// Preferencias locais deste navegador administrativo, sem gravacoes adicionais no Firestore.
const cleanKey='4shope-stats-clean-policy';
let cleanupBusy=false;
function cleanupPolicy(){
 try{const v=JSON.parse(localStorage.getItem(cleanKey)||'{}');return {enabled:v.enabled===true,months:[1,3,6,12,18,24,36].includes(Number(v.months))?Number(v.months):12,frequency:[1,7,15,30].includes(Number(v.frequency))?Number(v.frequency):7,lastRun:Number(v.lastRun)||0}}catch{return {enabled:false,months:12,frequency:7,lastRun:0}}
}
function initCleanupFields(){
 const p=cleanupPolicy();$('statsAutoClean').checked=p.enabled;$('statsRetention').value=p.months;$('statsFrequency').value=p.frequency;
}
function monthsCutoff(months){
 // Mantem o mes atual e os meses anteriores ate a retencao escolhida.
 const n=new Date(),d=new Date(Date.UTC(n.getFullYear(),n.getMonth()-(months-1),1));
 return d.toISOString().slice(0,7).replace('-','');
}
function saveCleanupPolicy(lastRun){
 const prev=cleanupPolicy(),v={enabled:$('statsAutoClean').checked,months:Number($('statsRetention').value),frequency:Number($('statsFrequency').value),lastRun:lastRun===undefined?prev.lastRun:lastRun};
 localStorage.setItem(cleanKey,JSON.stringify(v));return v;
}
async function runCleanup(auto=false){
 if(cleanupBusy)return;
 if(!auto&&!confirm('Excluir PERMANENTEMENTE os contadores mensais fora do prazo escolhido? Essa acao nao pode ser desfeita.'))return;
 cleanupBusy=true;const status=$('statsCleanupStatus');status.textContent='Consultando e removendo contadores vencidos...';
 try{
  const policy=cleanupPolicy(),cutoff=monthsCutoff(policy.months);
  const result=await clearMonthlyStatsBefore(cutoff);
  saveCleanupPolicy(result.complete?Date.now():undefined);
  status.textContent=result.removed+' contadores removidos (meses anteriores a '+cutoff.slice(0,4)+'/'+cutoff.slice(4)+').'+(result.complete?' Limpeza concluida.':' Ha mais registros; execute novamente.');
  if(result.removed)await refreshAnalytics();
 }catch(e){console.error(e);status.textContent='Erro na limpeza: '+(e.code||e.message)}
 finally{cleanupBusy=false}
}
async function maybeCleanupStats(){
 const p=cleanupPolicy();
 if(p.enabled&&Date.now()-p.lastRun>=p.frequency*86400000)await runCleanup(true);
}
$('saveStatsPolicy').onclick=()=>{
 const old=cleanupPolicy(),next=saveCleanupPolicy(old.months!==Number($('statsRetention').value)?0:undefined);
 $('statsCleanupStatus').textContent='Preferencias salvas neste navegador. '+(next.enabled?'A limpeza sera verificada quando abrir Estatisticas.':'Limpeza periodica desativada.');
};
$('runStatsCleanup').onclick=()=>runCleanup(false);
$('clearLegacyStats').onclick=async()=>{
 if(cleanupBusy)return;
 if(!confirm('Excluir TODOS os eventos antigos de analyticsEvents? Os novos contadores e produtos serao preservados.'))return;
 if(!confirm('CONFIRMA a exclusao definitiva do historico antigo? Nao ha como desfazer.'))return;
 cleanupBusy=true;const status=$('statsCleanupStatus');status.textContent='Apagando historico antigo em lotes...';
 try{const r=await clearLegacyEvents();status.textContent=r.removed+' eventos antigos apagados.'+(r.complete?' Limpeza completa.':' Ainda existem registros; clique novamente para continuar.')}
 catch(e){console.error(e);status.textContent='Erro: '+(e.code||e.message)}
 finally{cleanupBusy=false}
};
initCleanupFields();
document.querySelectorAll('[data-tab="analytics"]').forEach(b=>b.addEventListener('click',maybeCleanupStats));
$('refreshAnalytics').onclick=refreshAnalytics;
$('analyticsPeriod').onchange=refreshAnalytics;
document.querySelectorAll('[data-tab="analytics"]').forEach(b=>b.addEventListener('click',refreshAnalytics));

initAdminTools({products:()=>products,categories:()=>categories,refresh,say,edit:editProduct});


/* Central de parcerias, carrosseis e cupons */
function listEditRows(items,container,editAttr,removeAttr,label){
 $(container).innerHTML=items.length?items.map(x=>'<div class="contact-row"><span><strong>'+esc(label(x))+'</strong><br><small>'+esc(x.placement||x.type||'')+(x.active===false?' · Oculto':'')+'</small></span><span><button type="button" class="small-btn" '+editAttr+'="'+esc(x.id)+'">Editar</button> <button type="button" class="small-btn danger" '+removeAttr+'="'+esc(x.id)+'">Excluir</button></span></div>').join(''):'<p class="admin-hint">Nenhum cadastro ainda.</p>';
}
const makeId=()=> 'item_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
const field=id=>$(id).value.trim();
const validOptionalUrl=v=>!v||!!safeUrl(v);
function renderPartners(){
 const q=(field('partnerSearch')||'').toLowerCase();
 listEditRows((settings.partners||[]).filter(p=>(p.name||'').toLowerCase().includes(q)),'partnerRows','data-edit-partner','data-del-partner',p=>p.name||'Parceria sem nome');
}
function editPartner(id){
 const p=(settings.partners||[]).find(x=>x.id===id)||{};
 $('partnerForm').reset();$('partnerEditor').classList.remove('hidden');
 for(const [el,key] of [['partnerId','id'],['partnerName','name'],['partnerType','type'],['partnerDescription','description'],['partnerImage','image'],['partnerLink','link'],['partnerContact','contact'],['partnerSocial','social'],['partnerPlacement','placement'],['partnerOrder','order']])$(el).value=p[key]??(key==='order'?10:'');
 $('partnerActive').checked=p.active!==false;
 $('partnerEditor').scrollIntoView({behavior:'smooth'});
}
$('partnerSearch').oninput=renderPartners;
$('newPartner').onclick=()=>editPartner();
$('cancelPartner').onclick=()=>$('partnerEditor').classList.add('hidden');
$('partnerForm').onsubmit=async e=>{
 e.preventDefault();
 const p={id:field('partnerId')||makeId(),name:field('partnerName'),type:field('partnerType'),description:field('partnerDescription'),image:safeUrl(field('partnerImage')),link:field('partnerLink'),contact:field('partnerContact'),social:field('partnerSocial'),placement:field('partnerPlacement')||'mid',order:Number(field('partnerOrder'))||0,active:$('partnerActive').checked};
 if(!validOptionalUrl(field('partnerImage'))||!validCarouselLink(p.link)||!validOptionalUrl(p.social)){say('Confira os links da parceria.',true);return}
 try{await persistMarketing({partners:[...(settings.partners||[]).filter(x=>x.id!==p.id),p]});$('partnerEditor').classList.add('hidden');say('Parceria salva.')}catch(err){console.error(err);say('Erro ao salvar parceria.',true)}
};
$('partnerRows').onclick=async e=>{
 const edit=e.target.closest('[data-edit-partner]'),del=e.target.closest('[data-del-partner]');
 if(edit)editPartner(edit.dataset.editPartner);
 if(del&&confirm('Excluir esta parceria?')){await persistMarketing({partners:(settings.partners||[]).filter(x=>x.id!==del.dataset.delPartner)});say('Parceria excluída.')}
};
function renderCarousels(){
 const q=field('carouselSearch').toLowerCase();
 listEditRows((settings.carousels||[]).filter(x=>(x.name||'').toLowerCase().includes(q)),'carouselRows','data-edit-carousel','data-del-carousel',c=>(c.name||'Sem nome')+' · '+(c.slides||[]).length+' imagens');
}
function normalizedProductQuery(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
function slideLine(slide={}){
 const row=document.createElement('div');row.className='carousel-slide-editor';
 const options='<option value="">Outro destino / link personalizado</option><option value="#inicio">Início</option><option value="#produtos">Todos os produtos</option><option value="#categorias">Categorias</option>'+categories.map(c=>'<option value="#produtos?categoria='+esc(c.id)+'">Categoria: '+esc(c.name)+'</option>').join('');
 row.innerHTML='<div class="carousel-slide-header"><strong>Imagem do carrossel</strong><button type="button" class="small-btn danger" data-remove-slide>Remover</button></div><label>Foto (URL)</label><input class="field" data-slide-image type="url" placeholder="https://..."><label>Foto para celular (opcional)</label><input class="field" data-slide-mobile type="url" placeholder="https://..."><label>Destino geral</label><select class="field" data-slide-choice>'+options+'</select><label>Escolher UM produto para esta foto</label><input class="field" type="search" data-slide-product-search placeholder="🔎 Pesquisar produto pelo nome"><div class="marketing-choices slide-product-choices" data-slide-products></div><span class="admin-hint" data-slide-selection></span><label>Link personalizado (opcional)</label><input class="field" data-slide-link placeholder="https://... ou #campanha/ID"><label>Texto alternativo (opcional)</label><input class="field" data-slide-alt maxlength="100">';
 for(const [selector,key] of [['[data-slide-image]','image'],['[data-slide-mobile]','mobileImage'],['[data-slide-link]','link'],['[data-slide-alt]','alt']])row.querySelector(selector).value=slide[key]||'';
 const destination=row.querySelector('[data-slide-link]'),choice=row.querySelector('[data-slide-choice]'),list=row.querySelector('[data-slide-products]'),status=row.querySelector('[data-slide-selection]');
 let selected=(slide.link||'').match(/^#produto\/([A-Za-z0-9_-]+)$/)?.[1]||'';
 if(slide.link&&!selected&&[...choice.options].some(o=>o.value===slide.link))choice.value=slide.link;
 const draw=()=>{
  const q=normalizedProductQuery(row.querySelector('[data-slide-product-search]').value);
  list.innerHTML=products.filter(p=>normalizedProductQuery(p.name).includes(q)).map(p=>'<label class="marketing-choice"><input type="checkbox" value="'+esc(p.id)+'" '+(p.id===selected?'checked':'')+'><span>'+esc(p.name)+(p.published===false?' (rascunho)':'')+'</span></label>').join('')||'<p class="admin-hint">Nenhum produto encontrado.</p>';
  status.textContent=selected?'Selecionado: '+(products.find(p=>p.id===selected)?.name||selected):'Nenhum produto escolhido';
 };
 row.querySelector('[data-slide-product-search]').oninput=draw;
 list.onchange=e=>{
  if(!e.target.matches('input[type="checkbox"]'))return;
  selected=e.target.checked?e.target.value:'';
  if(selected){destination.value='#produto/'+selected;choice.value=''}
  else if(destination.value.startsWith('#produto/'))destination.value='';
  draw();
 };
 choice.onchange=()=>{selected='';destination.value=choice.value;draw()};
 destination.oninput=()=>{
  const match=destination.value.match(/^#produto\/([A-Za-z0-9_-]+)$/);
  selected=match?match[1]:'';
  choice.value=[...choice.options].some(o=>o.value===destination.value)?destination.value:'';
  draw();
 };
 row.querySelector('[data-remove-slide]').onclick=()=>row.remove();
 $('carouselSlides').append(row);draw();
}
function editCarousel(id){
 const c=(settings.carousels||[]).find(x=>x.id===id)||{};
 $('carouselForm').reset();$('carouselEditor').classList.remove('hidden');
 for(const [el,key] of [['carouselId','id'],['carouselName','name'],['carouselPlacement','placement'],['carouselOrder','order'],['carouselStart','start'],['carouselEnd','end']])$(el).value=c[key]??(key==='order'?10:'');
 $('carouselActive').checked=c.active!==false;
 $('carouselSlides').replaceChildren();
 (c.slides||[{}]).forEach(slideLine);
 $('carouselEditor').scrollIntoView({behavior:'smooth'});
}
$('carouselSearch').oninput=renderCarousels;
$('newCarousel').onclick=()=>editCarousel();
$('cancelCarousel').onclick=()=>$('carouselEditor').classList.add('hidden');
$('addCarouselSlide').onclick=()=>slideLine();
$('carouselForm').onsubmit=async e=>{
 e.preventDefault();
 const slides=[...$('carouselSlides').children].map(row=>({image:fieldFrom(row,'[data-slide-image]'),mobileImage:fieldFrom(row,'[data-slide-mobile]'),link:fieldFrom(row,'[data-slide-link]'),alt:fieldFrom(row,'[data-slide-alt]')})).filter(x=>x.image);
 if(!slides.length||slides.length>15||slides.some(x=>!safeUrl(x.image)||!validOptionalUrl(x.mobileImage)||!validCarouselLink(x.link))){say('Cadastre de 1 a 15 imagens e confira os links.',true);return}
 const c={id:field('carouselId')||makeId(),name:field('carouselName')||'Carrossel',placement:field('carouselPlacement')||'hero',order:Number(field('carouselOrder'))||0,start:field('carouselStart'),end:field('carouselEnd'),active:$('carouselActive').checked,slides};
 if(c.start&&c.end&&c.start>c.end){say('Confira as datas.',true);return}
 try{await persistMarketing({carousels:[...(settings.carousels||[]).filter(x=>x.id!==c.id),c]});$('carouselEditor').classList.add('hidden');say('Carrossel salvo.')}catch(err){console.error(err);say('Erro ao salvar carrossel.',true)}
};
const fieldFrom=(row,selector)=>row.querySelector(selector)?.value.trim()||'';
function validCarouselLink(v){return !v||!!safeUrl(v)||/^#(?:produto|campanha)\/[A-Za-z0-9_-]+$/.test(v)||['#inicio','#produtos','#categorias'].includes(v)||/^#produtos\?categoria=[A-Za-z0-9_-]+$/.test(v)}
$('carouselRows').onclick=async e=>{
 const edit=e.target.closest('[data-edit-carousel]'),del=e.target.closest('[data-del-carousel]');
 if(edit)editCarousel(edit.dataset.editCarousel);
 if(del&&confirm('Excluir o carrossel?')){await persistMarketing({carousels:(settings.carousels||[]).filter(x=>x.id!==del.dataset.delCarousel)});say('Carrossel excluído.')}
};
function renderCoupons(){
 listEditRows(settings.coupons||[],'couponRows','data-edit-coupon','data-del-coupon',c=>(c.code||'CUPOM')+' · '+Number(c.used||0)+'/'+Number(c.limit||0)+' confirmados');
 $('couponRows').querySelectorAll('[data-edit-coupon]').forEach(b=>{const confirm=document.createElement('button');confirm.type='button';confirm.className='small-btn';confirm.textContent='Confirmar resgate';confirm.dataset.confirmCoupon=b.dataset.editCoupon;b.parentElement.append(confirm)});
 $('couponHistory').innerHTML=(settings.couponHistory||[]).slice().reverse().map(h=>'<div class="contact-row"><span><strong>'+esc(h.code)+'</strong> · '+esc(h.customer||'Cliente não informado')+'<br><small>'+new Date(h.at).toLocaleString('pt-BR')+' · '+esc(h.productName||'')+'</small></span></div>').join('')||'<p class="admin-hint">Nenhum resgate confirmado.</p>';
}
function filterCouponProducts(){
 const q=normalizedProductQuery($('couponProductSearch').value);
 let n=0;
 $('couponProductChoices').querySelectorAll('label.marketing-choice').forEach(label=>{
  const chk=label.querySelector('input');if(chk.checked)n++;
  const product=products.find(p=>p.id===chk.value);
  label.hidden=!normalizedProductQuery(product?.name).includes(q);
 });
 $('couponSelectedCount').textContent=n+' produto(s) selecionado(s)'+(n===0?' · cupom aplicável a todos da categoria':'');
}
$('couponProductSearch').oninput=filterCouponProducts;
$('couponProductChoices').onchange=filterCouponProducts;
function editCoupon(id){
 const c=(settings.coupons||[]).find(x=>x.id===id)||{};
 $('couponForm').reset();$('couponEditor').classList.remove('hidden');
 $('couponCategory').innerHTML='<option value="">Todas as categorias</option>'+categories.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
 const chosen=new Set(c.productIds|| (c.productId?[c.productId]:[]));
 $('couponProductSearch').value='';
 $('couponProductChoices').innerHTML=products.map(p=>'<label class="marketing-choice"><input type="checkbox" value="'+esc(p.id)+'" '+(chosen.has(p.id)?'checked':'')+'><span>'+esc(p.name)+(p.published===false?' (rascunho)':'')+'</span></label>').join('');
 filterCouponProducts();
 for(const [el,key] of [['couponId','id'],['couponCode','code'],['couponLimit','limit'],['couponCategory','categoryId'],['couponMessage','message'],['couponStart','start'],['couponEnd','end']])$(el).value=c[key]??(key==='limit'?10:'');
 $('couponActive').checked=c.active!==false;
 $('couponEditor').scrollIntoView({behavior:'smooth'});
}
$('newCoupon').onclick=()=>editCoupon();
$('cancelCoupon').onclick=()=>$('couponEditor').classList.add('hidden');
$('couponForm').onsubmit=async e=>{
 e.preventDefault();
 const id=field('couponId')||makeId(),old=(settings.coupons||[]).find(x=>x.id===id);
 const code=field('couponCode').toUpperCase().replace(/\s/g,'');
 const limit=Number(field('couponLimit')),used=Number(old?.used||0);
 if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!Number.isSafeInteger(limit)||limit<1||limit<used){say('Informe um código válido e limite igual ou maior que os resgates.',true);return}
 if((settings.coupons||[]).some(c=>c.id!==id&&c.code===code)){say('Este código já existe.',true);return}
 const chosenIds=[...$('couponProductChoices').querySelectorAll('input:checked')].map(input=>input.value);const c={id,code,limit,used,categoryId:field('couponCategory'),productIds:chosenIds,productId:chosenIds.length===1?chosenIds[0]:'',message:field('couponMessage').slice(0,500),start:field('couponStart'),end:field('couponEnd'),active:$('couponActive').checked};
 if(c.start&&c.end&&c.start>c.end){say('Datas inválidas.',true);return}
 try{await persistMarketing({coupons:[...(settings.coupons||[]).filter(x=>x.id!==id),c]});$('couponEditor').classList.add('hidden');say('Cupom salvo.')}catch(err){console.error(err);say('Erro ao salvar cupom.',true)}
};
$('couponRows').onclick=async e=>{
 const edit=e.target.closest('[data-edit-coupon]'),del=e.target.closest('[data-del-coupon]'),conf=e.target.closest('[data-confirm-coupon]');
 if(conf){const c=(settings.coupons||[]).find(x=>x.id===conf.dataset.confirmCoupon);if(!c)return;if((c.used||0)>=c.limit){say('Esse cupom atingiu o limite.',true);return}const productName=prompt('Produto do resgate confirmado (opcional):','');if(productName===null)return;if(!confirm('Confirmar UM resgate de '+c.code+'? Faça isso apenas após receber e conferir a solicitação.'))return;const coupons=(settings.coupons||[]).map(x=>x.id===c.id?{...x,used:(Number(x.used)||0)+1}:x);const h={code:c.code,productName:productName.slice(0,120),at:Date.now()};try{await persistMarketing({coupons,couponHistory:[...(settings.couponHistory||[]),h].slice(-200)});say('Resgate confirmado e descontado.')}catch(err){console.error(err);say('Não foi possível confirmar resgate.',true)}return}
 if(edit){editCoupon(edit.dataset.editCoupon);return}
 if(del&&confirm('Excluir este cupom?')){await persistMarketing({coupons:(settings.coupons||[]).filter(x=>x.id!==del.dataset.delCoupon)});say('Cupom excluído.')}
};
$('clearCouponHistory').onclick=async()=>{if(!confirm('Excluir todo o histórico de resgates confirmados? Os totais utilizados serão preservados.'))return;await persistMarketing({couponHistory:[]});say('Histórico apagado.')};
