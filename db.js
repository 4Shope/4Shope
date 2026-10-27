
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
      startAfter,
      increment
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
    onAuthStateChanged,
    increment
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

// Agregados mensais: um documento por produto por mês, sem histórico individual.
// Cada interação gera somente uma gravação; relatórios leem apenas os agregados.
export async function recordProductEvent(productId,type){
 if(!configured||!['view','buy'].includes(type)||!/^[a-zA-Z0-9_-]{1,100}$/.test(productId))return;
 const month=new Date().toISOString().slice(0,7).replace('-','');
 const ref=api.doc(db,'productStatsMonthly',productId+'_'+month);
 await api.setDoc(ref,{productId,month,views:api.increment(type==='view'?1:0),buys:api.increment(type==='buy'?1:0)},{merge:true});
}
export async function loadProductStats(months){
 if(!configured)return [];
 const all=await Promise.all([...new Set(months)].map(month=>
  api.getDocs(api.query(api.collection(db,'productStatsMonthly'),api.where('month','==',month)))
 ));
 return all.flatMap(snapshot=>snapshot.docs.map(d=>({id:d.id,...d.data()})));
}
// Compatibilidade com eventos antigos: disponível para migração/limpeza futura, sem
// consultar estes registros automaticamente ao abrir o painel.
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
 const allowed=new Set(['visit','view','buy','share','ad','adView']);
 if(!Array.isArray(types)||!types.length||types.some(t=>!allowed.has(t)))throw Error('Seleção inválida');
 let removed=0;
 for(let page=0;page<10000;page++){
  const snap=await api.getDocs(api.query(api.collection(db,'analyticsEvents'),api.where('createdAt','>=',from),api.where('createdAt','<=',to),api.limit(350)));
  if(snap.empty)break;
  const selected=snap.docs.filter(d=>types.includes(d.data().type));
  if(!selected.length)break;
  const batch=api.writeBatch(db);selected.forEach(d=>batch.delete(d.ref));await batch.commit();removed+=selected.length;
 }
 return removed;
}
// Limpeza em lotes. Exclusao so funciona para admin autenticado.
export async function clearLegacyEvents(maxBatches=100){
 let removed=0;
 for(let i=0;i<maxBatches;i++){
  const snap=await api.getDocs(api.query(api.collection(db,'analyticsEvents'),api.limit(300)));
  if(snap.empty)return {removed,complete:true};
  const batch=api.writeBatch(db);snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();removed+=snap.size;
 }
 return {removed,complete:false};
}
export async function clearMonthlyStatsBefore(cutoff,maxBatches=100){
 if(!/^20\\d{4}$/.test(cutoff))throw Error('Periodo invalido');
 let removed=0;
 for(let i=0;i<maxBatches;i++){
  const snap=await api.getDocs(api.query(api.collection(db,'productStatsMonthly'),api.where('month','<',cutoff),api.limit(300)));
  if(snap.empty)return {removed,complete:true};
  const batch=api.writeBatch(db);snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();removed+=snap.size;
 }
 return {removed,complete:false};
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
