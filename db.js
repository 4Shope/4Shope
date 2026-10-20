import {firebaseConfig,configured} from './firebase-config.js';
export {configured};
let app,db,auth,api;
if(configured){
  const [{initializeApp},{getFirestore,collection,doc,getDocs,getDoc,setDoc,addDoc,updateDoc,deleteDoc,query,orderBy,where},{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
  ]);
  app=initializeApp(firebaseConfig);db=getFirestore(app);auth=getAuth(app);
  api={collection,doc,getDocs,getDoc,setDoc,addDoc,updateDoc,deleteDoc,query,orderBy,where,signInWithEmailAndPassword,signOut,onAuthStateChanged};
}
export const getAuthInstance=()=>auth;
export async function loadPublic(){if(!configured)return {products:[],categories:[],settings:null};const [p,c,s]=await Promise.all([api.getDocs(api.query(api.collection(db,'products'),api.where('published','==',true))),api.getDocs(api.collection(db,'categories')),api.getDoc(api.doc(db,'settings','public'))]);return {products:p.docs.map(d=>({id:d.id,...d.data()})),categories:c.docs.map(d=>({id:d.id,...d.data()})),settings:s.exists()?s.data():null}}
export async function loadAdmin(){const [p,c,s]=await Promise.all([api.getDocs(api.collection(db,'products')),api.getDocs(api.collection(db,'categories')),api.getDoc(api.doc(db,'settings','public'))]);return {products:p.docs.map(d=>({id:d.id,...d.data()})),categories:c.docs.map(d=>({id:d.id,...d.data()})),settings:s.exists()?s.data():null}}
export const login=(email,password)=>api.signInWithEmailAndPassword(auth,email,password);
export const logout=()=>api.signOut(auth);
export const onAuth=(cb)=>api.onAuthStateChanged(auth,cb);
export async function saveProduct(data,id){if(id)return api.updateDoc(api.doc(db,'products',id),data);return api.addDoc(api.collection(db,'products'),data)}
export const removeProduct=(id)=>api.deleteDoc(api.doc(db,'products',id));
export async function saveCategory(data,id){if(id)return api.setDoc(api.doc(db,'categories',id),data);return api.addDoc(api.collection(db,'categories'),data)}
export const removeCategory=(id)=>api.deleteDoc(api.doc(db,'categories',id));
export const saveSettings=(data)=>api.setDoc(api.doc(db,'settings','public'),data);
