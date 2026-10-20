
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
      writeBatch
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

// Registrar visualizações e cliques em Comprar
export async function recordProductEvent(productId,type){
  if(
    !configured ||
    !['view','buy'].includes(type) ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)
  ){
    return;
  }

  return api.addDoc(
    api.collection(db,'analyticsEvents'),
    {
      productId,
      type,
      createdAt:Date.now()
    }
  );
}

// Consultar as análises
export async function loadAnalytics(){
  const snap=await api.getDocs(
    api.query(
      api.collection(db,'analyticsEvents'),
      api.orderBy('createdAt','desc'),
      api.limit(2000)
    )
  );

  return snap.docs.map(d=>d.data());
}

// Excluir registros de análises
export async function deleteAnalytics(from,to,type){
  let removed=0;

  for(let i=0;i<1000;i++){
    const filters=[];

    if(from){
      filters.push(
        api.where('createdAt','>=',from)
      );
    }

    if(to){
      filters.push(
        api.where('createdAt','<=',to)
      );
    }

    if(type&&type!=='all'){
      filters.push(
        api.where('type','==',type)
      );
    }

    const snap=await api.getDocs(
      api.query(
        api.collection(db,'analyticsEvents'),
        ...filters,
        api.limit(350)
      )
    );

    if(snap.empty){
      break;
    }

    const batch=api.writeBatch(db);

    snap.docs.forEach(d=>{
      batch.delete(d.ref);
    });

    await batch.commit();

    removed+=snap.size;
  }

  return removed;
}
