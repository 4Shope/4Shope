// Configure o projeto Firebase aqui. Esses identificadores do app web são públicos;
// a segurança vem do Authentication e das regras do Firestore, não de esconder apiKey.
export const firebaseConfig = {
  apiKey: 'COLE_SUA_API_KEY',
  authDomain: 'SEU_PROJETO.firebaseapp.com',
  projectId: 'SEU_PROJETO',
  appId: 'COLE_SEU_APP_ID'
};
export const configured = firebaseConfig.apiKey !== 'COLE_SUA_API_KEY' && firebaseConfig.projectId !== 'SEU_PROJETO';
