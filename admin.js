
/* =====================================================
   ORGANIZADOR DE PRODUTOS - 4SHOPE
   Mantém o cadastro, login e Firebase originais.
===================================================== */

(() => {
  const section = document.getElementById('tab-products');
  const editor = document.getElementById('productEditor');
  const rows = document.getElementById('productRows');
  const listCard = rows?.closest('.admin-card');

  if (!section || !editor || !rows || !listCard) return;

  // Formulário acima da lista para facilitar a edição.
  section.insertBefore(editor, listCard);

  const controls = document.createElement('div');
  controls.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0';

  controls.innerHTML = `
    <input class="field" id="productSearch"
      type="search" placeholder="🔎 Buscar produto..."
      aria-label="Buscar produto">

    <select class="field" id="productCategoryFilter">
      <option value="">Todas as categorias</option>
    </select>

    <select class="field" id="productStatusFilter">
      <option value="">Todos os status</option>
      <option value="published">Publicados</option>
      <option value="draft">Rascunhos</option>
    </select>
  `;

  const table = rows.closest('table');
  const tableContainer = table.parentElement;
  listCard.insertBefore(controls, tableContainer);

  const pagination = document.createElement('div');
  pagination.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:16px';

  pagination.innerHTML = `
    <span id="productPageInfo" style="font-size:12px"></span>
    <div>
      <button type="button" class="small-btn"
        id="productPrevPage">← Anterior</button>
      <button type="button" class="small-btn"
        id="productNextPage">Próxima →</button>
    </div>
  `;

  tableContainer.after(pagination);

  const search = document.getElementById('productSearch');
  const category = document.getElementById('productCategoryFilter');
  const status = document.getElementById('productStatusFilter');
  const info = document.getElementById('productPageInfo');
  const prev = document.getElementById('productPrevPage');
  const next = document.getElementById('productNextPage');

  const pageSize = 10;
  let page = 1;

  function updateCategories() {
    const selected = category.value;

    category.innerHTML =
      '<option value="">Todas as categorias</option>';

    categories.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      category.appendChild(option);
    });

    if ([...category.options].some(o => o.value === selected)) {
      category.value = selected;
    }
  }

  function updateList() {
    const term = search.value.trim().toLocaleLowerCase('pt-BR');

    const filtered = products.filter(p => {
      const name = String(p.name || '')
        .toLocaleLowerCase('pt-BR');

      const categoryIds = [
        ...(Array.isArray(p.categories) ? p.categories : []),
        p.category
      ];

      const matchName = name.includes(term);

      const matchCategory =
        !category.value || categoryIds.includes(category.value);

      const matchStatus =
        !status.value ||
        (status.value === 'published'
          ? p.published === true
          : p.published !== true);

      return matchName && matchCategory && matchStatus;
    });

    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / pageSize)
    );

    page = Math.max(1, Math.min(page, totalPages));

    const visibleIds = new Set(
      filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map(p => p.id)
    );

    rows.querySelectorAll('tr').forEach(tr => {
      const edit = tr.querySelector('[data-edit-p]');

      if (!edit) {
        tr.hidden = filtered.length > 0;
        return;
      }

      tr.hidden = !visibleIds.has(edit.dataset.editP);
    });

    info.textContent =
      `${filtered.length} produto(s) · Página ${page} de ${totalPages}`;

    prev.disabled = page <= 1;
    next.disabled = page >= totalPages;
  }

  // Preserva a função original de renderização.
  const originalRenderProducts = renderProducts;

  renderProducts = function () {
    originalRenderProducts();
    updateCategories();
    updateList();
  };

  function resetPage() {
    page = 1;
    updateList();
  }

  search.addEventListener('input', resetPage);
  category.addEventListener('change', resetPage);
  status.addEventListener('change', resetPage);

  prev.addEventListener('click', () => {
    if (page > 1) {
      page--;
      updateList();
    }
  });

  next.addEventListener('click', () => {
    page++;
    updateList();
  });
})();
