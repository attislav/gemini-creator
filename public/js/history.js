const History = {
  grid: null,
  filterSelect: null,
  refreshButton: null,
  loadMoreButton: null,
  emptyMessage: null,
  currentPage: 1,
  hasMore: false,
  currentFilter: '',
  itemsData: {},

  init() {
    this.grid = document.getElementById('history-grid');
    this.filterSelect = document.getElementById('history-filter');
    this.refreshButton = document.getElementById('refresh-history');
    this.loadMoreButton = document.getElementById('load-more');
    this.emptyMessage = document.getElementById('history-empty');

    this.bindEvents();
  },

  bindEvents() {
    this.filterSelect.addEventListener('change', () => {
      this.currentFilter = this.filterSelect.value;
      this.currentPage = 1;
      this.load(true);
    });

    this.refreshButton.addEventListener('click', () => {
      this.currentPage = 1;
      this.load(true);
    });

    this.loadMoreButton.addEventListener('click', () => {
      this.currentPage++;
      this.load(false);
    });
  },

  async load(replace = true) {
    try {
      const data = await API.getHistory(this.currentPage, 20, this.currentFilter);

      if (replace) {
        this.grid.innerHTML = '';
      }

      if (data.items.length === 0 && this.currentPage === 1) {
        this.emptyMessage.hidden = false;
        this.loadMoreButton.hidden = true;
        return;
      }

      this.emptyMessage.hidden = true;
      data.items.forEach(item => this.renderItem(item));

      this.hasMore = this.currentPage < data.pagination.totalPages;
      this.loadMoreButton.hidden = !this.hasMore;
    } catch (error) {
      App.showNotification(error.message, 'error');
    }
  },

  renderItem(item) {
    // Store item data for modal access
    this.itemsData[item.id] = item;

    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.id = item.id;

    const isVideo = item.type === 'video';
    const thumbnailSrc = item.file_path || '';
    const date = new Date(item.created_at).toLocaleDateString('de-DE');

    div.innerHTML = `
      <div class="history-thumbnail-wrapper">
        ${isVideo
          ? `<video class="history-thumbnail" src="${thumbnailSrc}" muted></video>`
          : `<img class="history-thumbnail" src="${thumbnailSrc}" alt="${item.prompt}">`
        }
      </div>
      <div class="history-info">
        <p class="history-prompt">${this.escapeHtml(item.prompt)}</p>
        <div class="history-meta">
          <span class="history-type">${isVideo ? 'Video' : 'Bild'}</span>
          <span>${date}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="btn-secondary btn-download" data-id="${item.id}">Download</button>
        <button class="btn-delete" data-id="${item.id}">X</button>
      </div>
    `;

    // Click on thumbnail opens modal
    const thumbnailWrapper = div.querySelector('.history-thumbnail-wrapper');
    thumbnailWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      App.openModal(item);
    });

    const downloadBtn = div.querySelector('.btn-download');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadItem(item.id);
    });

    const deleteBtn = div.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteItem(item.id, div);
    });

    if (isVideo) {
      const video = div.querySelector('video');
      thumbnailWrapper.addEventListener('mouseenter', () => video.play());
      thumbnailWrapper.addEventListener('mouseleave', () => {
        video.pause();
        video.currentTime = 0;
      });
    }

    this.grid.appendChild(div);
  },

  downloadItem(id) {
    window.location.href = API.getDownloadUrl(id);
  },

  async deleteItem(id, element) {
    if (!confirm('Wirklich löschen?')) return;

    try {
      await API.deleteGeneration(id);
      element.remove();
      App.showNotification('Erfolgreich gelöscht', 'success');

      if (this.grid.children.length === 0) {
        this.emptyMessage.hidden = false;
      }
    } catch (error) {
      App.showNotification(error.message, 'error');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
