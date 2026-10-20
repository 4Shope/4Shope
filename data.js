export const initialCategories=[{id:'tecnologia',name:'Tecnologia',icon:'⌘',order:1},{id:'casa',name:'Casa & Decoração',icon:'⌂',order:2},{id:'moda',name:'Moda & Estilo',icon:'✧',order:3},{id:'beleza',name:'Beleza & Cuidados',icon:'✿',order:4},{id:'acessorios',name:'Acessórios',icon:'◈',order:5},{id:'outros',name:'Outros achados',icon:'✦',order:6}];
export const initialSettings={instagram:'',instagramHandle:'',whatsapp:'',email:'',about:'A 4Shope é uma vitrine independente de divulgação de produtos. Reunimos indicações e achadinhos em um só lugar para ajudar você a descobrir o que procura.',banners:[],heroTitle:'Boas escolhas. Grandes descobertas.',heroText:'Uma seleção de produtos para você explorar sem perder tempo. A compra acontece na Shopee.',accent:'#252525',announcement:'Descubra. Escolha. Compre com segurança na Shopee.',campaigns:[],marketingBanners:[]};
export const placeholder='product-placeholder.svg';
export const currency=(n)=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function sanitizeId(v){return String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100)}
