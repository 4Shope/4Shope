
/* Melhorias na organização dos produtos */
(() => {
  const section = document.getElementById('tab-products');
  const editor = document.getElementById('productEditor');
  const rows = document.getElementById('productRows');
  const listCard = rows?.closest('.admin-card');

  if (!section || !editor || !rows || !listCard) return;

  // Coloca o formulário acima da lista de produtos.
  section.insertBefore(editor, listCard);

  // Adiciona os controles sem alterar o HTML existente.
  const controls = document.createElement('div');
  controls.className = 'product-manager-controls';
  controls.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0';

  controls.innerHTML = `
    <input id="productSearch" class="field"
      type="search" placeholder="Buscar produto pelo nome..."
      aria-label="Buscar produtos">

    <select id="productCategoryFilter" class="field"
      aria-label="Filtrar categoria">
      <option value="">Todas as categorias</option>
    </select>

    <select id="productStatusFilter" class="field"
      aria-label="Filtrar status">
      <option value="">Todos os produtos</option>
      <option value="published">Publicados</option>
      <option value="draft">Rascunhos</option>
    </select>
  `;

  const tableContainer = rows.closest('table').parentElement;
  listCard.insertBefore(controls, tableContainer);

  const pagination = document.createElement('div');
  pagination.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px';

  pagination.innerHTML = `
    <span id="productPageInfo"></span>
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

  function updateCategoryOptions() {
    const previous = category.value;

    category.innerHTML =
      '<option value="">Todas as categorias</option>';

    categories.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      category.appendChild(option);
    });

    category.value = previous;
  }

  function updateList() {
    const term = search.value.trim().toLocaleLowerCase('pt-BR');

    const filtered = products.filter(p => {
      const matchesName =
        String(p.name || '').toLocaleLowerCase('pt-BR')
          .includes(term);

      const productCategories = Array.isArray(p.categories)
        ? [...p.categories, p.category]
        : [p.category];

      const matchesCategory =
        !category.value ||
        productCategories.includes(category.value);

      const matchesStatus =
        !status.value ||
        (status.value === 'published'
          ? p.published === true
          : p.published !== true);

      return matchesName && matchesCategory && matchesStatus;
    });

    const totalPages = Math.max(
      1, Math.ceil(filtered.length / pageSize)
    );

    page = Math.min(page, totalPages);

    const visibleIds = new Set(
      filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map(p => p.id)
    );

    rows.querySelectorAll('tr').forEach(tr => {
      const button = tr.querySelector('[data-edit-p]');

      if (!button) {
        tr.style.display = filtered.length ? 'none' : '';
        return;
      }

      tr.style.display =
        visibleIds.has(button.dataset.editP) ? '' : 'none';
    });

    info.textContent =
      `${filtered.length} produto(s) · Página ${page} de ${totalPages}`;

    prev.disabled = page <= 1;
    next.disabled = page >= totalPages;
  }

  // Mantém a renderização original e aplica os filtros.
  const originalRenderProducts = renderProducts;

  renderProducts = function () {
    originalRenderProducts();
    updateCategoryOptions();
    updateList();
  };

  search.addEventListener('input', () => {
    page = 1;
    updateList();
  });

  category.addEventListener('change', () => {
    page = 1;
    updateList();
  });

  status.addEventListener('change', () => {
    page = 1;
    updateList();
  });

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
