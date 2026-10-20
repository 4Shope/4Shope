# 4Shope — versão simplificada para GitHub pelo celular

**Todos os arquivos ficam na mesma pasta (raiz do repositório).** Não crie pastas `assets` ou `js`. O ZIP é apenas para transportar os arquivos: **o GitHub não descompacta ZIP enviado como arquivo**.

## Publicar pelo celular

1. Baixe este ZIP e extraia os arquivos no celular (app Arquivos / Meus Arquivos).
2. Entre em https://github.com no navegador, faça login e crie um repositório público chamado `4shope` (ou use o que já criou).
3. Abra o repositório > **Add file** > **Upload files**. Se o botão não aparecer, ative **Site para computador** no navegador.
4. Toque em **choose your files**, abra a pasta extraída e **selecione todos os arquivos de uma vez**. No Android, pode ser necessário pressionar um arquivo e marcar os demais. Se o seletor não permitir múltiplos, envie em grupos; **não é preciso criar pastas**.
5. Confirme **Commit changes**. `index.html` precisa ficar diretamente na raiz, não dentro de `4Shope-facil-github`.
6. No repositório: **Settings > Pages > Build and deployment > Deploy from a branch > main > /(root) > Save**.
7. Aguarde a publicação e abra `https://SEU_USUARIO.github.io/4shope/` (o endereço exato depende do nome do repositório).

**Atenção:** a vitrine só exibirá produtos reais depois de configurar o Firebase, conforme abaixo. O painel `admin.html` exige login autorizado. Nunca publique senhas nem chaves privadas.

---

# 4Shope — Loja de afiliados

Projeto pronto para publicar como site estático no GitHub Pages. **A vitrine funciona visualmente antes da configuração, mas produtos e alterações só são persistidos quando você configurar o Firebase.** Nenhuma venda ou pagamento é processado neste site: os clientes compram na Shopee por meio do seu link de afiliado.

## Arquivos

- `index.html`: loja pública, responsiva e com modo claro/escuro.
- `admin.html`: painel privado de produtos, categorias, banners, Instagram e apresentação.
- `style.css`: visual da marca.
- `logo-dark.webp`: sua logo preta, usada no tema claro.
- `logo-light.webp`: sua logo branca, usada no tema escuro.
- `firebase-config.js`: configuração do seu projeto Firebase.
- `firestore.rules`: regras de segurança **obrigatórias**.

## 1. Criar Firebase

1. Entre em https://console.firebase.google.com/ e crie um projeto para a 4Shope.
2. No projeto, clique no ícone de engrenagem > Configurações do projeto > Seus apps > Adicionar app Web (`</>`).
3. Registre o app e copie os campos `apiKey`, `authDomain`, `projectId` e `appId`.
4. Abra `firebase-config.js` e substitua os quatro valores de exemplo pelos seus.
5. Em **Build > Authentication > Sign-in method**, ative **E-mail/senha**.
6. Em **Authentication > Users**, adicione sua conta administrativa (e-mail e senha fortes). Não cadastre clientes como administradores.
7. Copie o **UID** da sua conta em Authentication > Users.
8. Em **Build > Firestore Database**, crie um banco de dados (escolha uma região próxima de seus clientes). **Não deixe regras de teste abertas.**
9. Abra `firestore.rules`, substitua `SUBSTITUA_PELO_SEU_UID` pelo UID exato da sua conta e cole as regras na aba **Firestore Database > Rules**. Clique em **Publicar**.
10. Em Authentication > Settings > Authorized domains, confirme o domínio do GitHub Pages usado pelo site (por exemplo `seuusuario.github.io`) se o Firebase exigir autorização. Para teste local, adicione `localhost` se necessário.

**Importante:** A `apiKey` do Firebase para aplicativos Web não é senha e ficará visível no navegador. A proteção real depende de Authentication + regras de segurança. Nunca coloque credenciais de serviço, chaves privadas, senhas ou tokens de administração no GitHub.

## 2. Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `4shope`.
2. Envie **o conteúdo desta pasta** para a raiz do repositório (`index.html`, `admin.html`, todos os arquivos sem criar pastas).
3. Em **Settings > Pages**, selecione **Deploy from a branch**, branch `main`, pasta `/(root)` e salve.
4. Aguarde a publicação. O endereço será semelhante a `https://seuusuario.github.io/4shope/`.
5. O painel fica em `https://seuusuario.github.io/4shope/admin.html`.

**Segurança:** O endereço do painel é público, mas as operações de edição são protegidas no Firestore. O GitHub Pages não executa código privado no servidor.

## 3. Primeira configuração pelo painel

1. Acesse `admin.html` e entre com o usuário criado no Firebase.
2. Em **Categorias**, cadastre suas categorias reais (ex.: Tecnologia, Casa, Moda, Beleza, Acessórios). O site mostra categorias de exemplo enquanto não houver categorias no Firestore; elas não são gravadas automaticamente.
3. Em **Produtos**, clique em **Novo produto**, preencha os campos e cole **URLs diretas** das fotos, uma por linha. Cole seu link de afiliado da Shopee e marque **Publicar**.
4. Em **Minha loja**, cadastre Instagram, WhatsApp opcional, e-mail, texto institucional e dois banners.
5. Abra a loja pública e confira as páginas em celular e computador.

## 4. Cuidados com links e preços

- URLs de páginas de produto não são URLs de imagem. Use links diretos para arquivos de imagem, testados em uma aba anônima. Algumas imagens da Shopee podem bloquear incorporação externa.
- Utilize imagens cuja divulgação seja permitida pelo programa de afiliados e demais titulares.
- Confirme periodicamente se preços, estoque, frete e ofertas permanecem atuais. O site não sincroniza esses dados automaticamente.
- Cole links de afiliado válidos. A comissão depende das regras e elegibilidade do programa.
- O aviso de transparência está presente em “Nossa história” e na página de cada produto.
- Para dúvidas de pedidos, o cliente deve falar com o vendedor ou suporte da Shopee.

## 5. O que está implementado

- Home editorial, produtos em destaque, novidades, categorias e banners de texto.
- Catálogo com pesquisa, filtro por categoria e ordenação por preço/nome/data.
- Página individual com galeria, descrição, preço, preço anterior e botão de afiliado.
- Favoritos armazenados **no navegador do visitante** (não sincronizados entre dispositivos).
- Sobre nós, explicação da relação de afiliados, Instagram e contato.
- Tema claro/escuro com logos diferentes e preferência salva.
- Painel privado com login, cadastro/edição/exclusão, publicação/rascunho, categorias e ajustes.
- Banco de dados Firestore com regras de leitura pública de produtos publicados e edição exclusiva do UID administrador.
- Manifesto básico PWA (atalho de tela inicial). **Não inclui cache offline ou notificações.** Para compatibilidade máxima de instalação em dispositivos, ícones PNG de 192/512 px podem ser acrescentados futuramente.

## 6. Limites desta versão

- Sem sincronização automática de preços, estoque ou imagens com a Shopee.
- Sem métricas reais de cliques ou vendas. O painel mostra contagens de produtos/categorias.
- Sem carrinho, checkout ou pagamentos próprios.
- Sem upload de arquivos de imagem: use URLs.
- Banners editáveis são de texto (não há upload de arte de banner).
- O painel é preparado para **uma conta de administrador**, identificada pelo UID nas regras.
- Não há conteúdo de produto fictício publicado: você cadastra os produtos reais.

## 7. Testar segurança antes de divulgar

- Sem login: a loja deve listar produtos publicados, mas não deve permitir gravações.
- Sem login: um produto em rascunho não deve ser acessível pelo Firestore.
- Logado com usuário diferente: deve falhar ao ler produtos não publicados e ao criar/editar/excluir qualquer documento.
- Logado com UID autorizado: o painel deve funcionar.
- No Firestore Rules Playground, simule operações de leitura e escrita com autenticação e sem autenticação.

Se encontrar erro de permissão, confira o UID publicado nas regras e a conta com que entrou. Não altere as regras para `allow read, write: if true`.
