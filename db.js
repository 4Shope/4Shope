
import {firebaseConfig,configured} from './firebase-config.js';
export {configured};

let app,db,auth,api;

if(configured){
  const [
    {initializeApp},
    {
      getFirestore,
      collection,
      doc,
      getDocs,
      getDoc,
      setDoc,
      addDoc,
      updateDoc,
      deleteDoc,
      query,
      orderBy,
      where,
      limit,
      writeBatch,
      startAfter
    },
    {
      getAuth,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged
    }
  ]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
  ]);

  app=initializeApp(firebaseConfig);
  db=getFirestore(app);
  auth=getAuth(app);

  api={
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    limit,
    writeBatch,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  };
}

export const getAuthInstance=()=>auth;

export async function loadPublic(){
  if(!configured){
    return {products:[],categories:[],settings:null};
  }

  const [p,c,s]=await Promise.all([
    api.getDocs(
      api.query(
        api.collection(db,'products'),
        api.where('published','==',true)
      )
    ),
    api.getDocs(api.collection(db,'categories')),
    api.getDoc(api.doc(db,'settings','public'))
  ]);

  return {
    products:p.docs.map(d=>({id:d.id,...d.data()})),
    categories:c.docs.map(d=>({id:d.id,...d.data()})),
    settings:s.exists()?s.data():null
  };
}

export async function loadAdmin(){
  const [p,c,s]=await Promise.all([
    api.getDocs(api.collection(db,'products')),
    api.getDocs(api.collection(db,'categories')),
    api.getDoc(api.doc(db,'settings','public'))
  ]);

  return {
    products:p.docs.map(d=>({id:d.id,...d.data()})),
    categories:c.docs.map(d=>({id:d.id,...d.data()})),
    settings:s.exists()?s.data():null
  };
}

export const login=(email,password)=>
  api.signInWithEmailAndPassword(auth,email,password);

export const logout=()=>api.signOut(auth);

export const onAuth=(cb)=>
  api.onAuthStateChanged(auth,cb);

export async function saveProduct(data,id){
  if(id){
    return api.updateDoc(api.doc(db,'products',id),data);
  }

  return api.addDoc(api.collection(db,'products'),data);
}

export const removeProduct=(id)=>
  api.deleteDoc(api.doc(db,'products',id));

export async function saveCategory(data,id){
  if(id){
    return api.setDoc(api.doc(db,'categories',id),data);
  }

  return api.addDoc(api.collection(db,'categories'),data);
}

export const removeCategory=(id)=>
  api.deleteDoc(api.doc(db,'categories',id));

export const saveSettings=(data)=>
  api.setDoc(api.doc(db,'settings','public'),data);

// Eventos sem IP, usuário, cookie, fingerprint ou identificador de sessão.
export async function recordProductEvent(productId,type){
 if(!configured||!['visit','view','buy','share','ad','adView'].includes(type)||!/^[a-zA-Z0-9_-]{1,100}$/.test(productId))return;
 await api.addDoc(api.collection(db,'analyticsEvents'),{productId,type,createdAt:Date.now()});
}
// Consulta limitada ao intervalo solicitado; paginação para não truncar períodos longos.
export async function loadAnalytics(from,to){
 const out=[];let cursor;
 for(let page=0;page<40;page++){
  const clauses=[api.where('createdAt','>=',from),api.where('createdAt','<=',to),api.orderBy('createdAt','desc'),api.limit(500)];
  if(cursor)clauses.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'analyticsEvents'),...clauses));
  out.push(...snap.docs.map(d=>({id:d.id,...d.data()})));
  if(snap.size<500)return {events:out,truncated:false};
  cursor=snap.docs[snap.docs.length-1];
 }
 return {events:out,truncated:true};
}
export async function deleteAnalytics(from,to,types=['visit','view','buy','share','ad','adView']){
 const allowed=new Set(['visit','view','buy','share','ad','adView']);if(!Array.isArray(types)||!types.length||types.some(t=>!allowed.has(t)))throw Error('Seleção de eventos inválida');
 const selected=new Set(types);let cursor;let removed=0;
 // Pagina pelo intervalo, filtrando os tipos no cliente para não exigir novos índices Firestore.
 for(let i=0;i<10000;i++){
  const clauses=[api.where('createdAt','>=',from),api.where('createdAt','<=',to),api.orderBy('createdAt','desc'),api.limit(350)];if(cursor)clauses.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'analyticsEvents'),...clauses));if(snap.empty)break;
  const batch=api.writeBatch(db);let count=0;for(const d of snap.docs){if(selected.has(d.data().type)){batch.delete(d.ref);count++}}
  if(count){await batch.commit();removed+=count}
  cursor=snap.docs[snap.docs.length-1];if(snap.size<350)break;
 }
 return removed;
}
/* Legacy deletion removed below. */
export async function deleteAnalyticsLegacy(from,to){
 let removed=0;
 for(let i=0;i<1000;i++){
  const snap=await api.getDocs(api.query(api.collection(db,'analyticsEvents'),api.where('createdAt','>=',from),api.where('createdAt','<=',to),api.limit(350)));
  if(snap.empty)break;
  const batch=api.writeBatch(db);snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();removed+=snap.size;
 }
 return removed;
}

/* Atualiza apenas campos escolhidos, em lotes pequenos, preservando o restante. */
export async function updateProductsBulk(items){
 if(!configured)throw Error('Firebase não configurado');
 if(!Array.isArray(items)||!items.length||items.length>500)throw Error('Seleção inválida');
 for(let start=0;start<items.length;start+=200){
  const batch=api.writeBatch(db);
  for(const item of items.slice(start,start+200)){
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(item.id)||!item.patch||typeof item.patch!=='object')throw Error('Produto inválido');
   const allowed=['published','featured','category','categories','updatedAt'];
   if(Object.keys(item.patch).some(k=>!allowed.includes(k)))throw Error('Campo não autorizado');
   batch.update(api.doc(db,'products',item.id),item.patch);
  }
  await batch.commit();
 }
}
