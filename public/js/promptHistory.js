const PromptHistory = {
  prompts: [],
  maxPrompts: 50,
  listElement: null,
  sidebar: null,

  init() {
    this.listElement = document.getElementById('prompt-history-list');
    this.sidebar = document.getElementById('prompt-history-sidebar');

    document.getElementById('clear-prompt-history').addEventListener('click', () => {
      this.clear();
    });

    this.render();
  },

  add(prompt, type) {
    if (!prompt || !prompt.trim()) return;

    // Avoid duplicates at the top
    if (this.prompts.length > 0 && this.prompts[0].text === prompt) {
      return;
    }

    this.prompts.unshift({
      text: prompt,
      type: type,
      time: new Date()
    });

    // Limit history size
    if (this.prompts.length > this.maxPrompts) {
      this.prompts.pop();
    }

    this.render();
  },

  clear() {
    this.prompts = [];
    this.render();
  },

  render() {
    if (this.prompts.length === 0) {
      this.listElement.innerHTML = '<p class="prompt-history-empty">Noch keine Prompts in dieser Session.</p>';
      return;
    }

    this.listElement.innerHTML = this.prompts.map((item, index) => {
      const timeStr = item.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const typeLabel = item.type === 'video' ? 'Video' : 'Bild';

      return `
        <div class="prompt-history-item" data-index="${index}" title="Klicken zum Einfügen">
          <div class="prompt-text">${this.escapeHtml(item.text)}</div>
          <div class="prompt-meta">
            <span class="prompt-type ${item.type}">${typeLabel}</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind click events
    this.listElement.querySelectorAll('.prompt-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index, 10);
        this.usePrompt(index);
      });
    });
  },

  usePrompt(index) {
    const item = this.prompts[index];
    if (!item) return;

    // Determine which input to fill based on current tab or prompt type
    const currentTab = App.currentTab;

    if (currentTab === 'image') {
      document.getElementById('image-prompt').value = item.text;
      document.getElementById('image-prompt').focus();
    } else if (currentTab === 'video') {
      document.getElementById('video-prompt').value = item.text;
      document.getElementById('video-prompt').focus();
    } else {
      // If on history tab, switch to appropriate generator
      if (item.type === 'video') {
        App.switchToTab('video');
        document.getElementById('video-prompt').value = item.text;
      } else {
        App.switchToTab('image');
        document.getElementById('image-prompt').value = item.text;
      }
    }

    App.showNotification('Prompt eingefügt', 'success');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Show/hide sidebar based on tab
  updateVisibility(tab) {
    if (tab === 'history') {
      this.sidebar.classList.add('hidden');
    } else {
      this.sidebar.classList.remove('hidden');
    }
  }
};
