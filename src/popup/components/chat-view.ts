import { ThemeManager } from '../../core/utils/theme-manager'

export class ChatView extends HTMLElement {
  private themeManager = ThemeManager.getInstance()
  private downloadedModels: string[] = []

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    this.fetchDownloadedModels()
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (!this.shadowRoot) return
    if (theme === 'dark') this.shadowRoot.host.classList.add('dark')
    else this.shadowRoot.host.classList.remove('dark')
  }

  private async fetchDownloadedModels() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'status' })
      if (response && response.success && response.data) {
        const { downloadedModels } = response.data as { downloadedModels: string[] }
        this.downloadedModels = Array.isArray(downloadedModels) ? downloadedModels : []
        this.updateModelOptions()
      }
    } catch {
      // ignore errors for UI-only pass
    }
  }

  private updateModelOptions() {
    if (!this.shadowRoot) return
    const select = this.shadowRoot.querySelector('#model-select') as HTMLSelectElement | null
    if (!select) return
    select.innerHTML = this.downloadedModels.length > 0
      ? this.downloadedModels.map(id => `<option value="${id}">${id}</option>`).join('')
      : '<option value="" disabled selected>No downloaded models</option>'
  }

  private render() {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .chat-container { display:flex; flex-direction:column; gap:12px; height:100%; }
        .toolbar { display:flex; gap:8px; align-items:center; }
        .select { padding:6px 8px; border:1px solid #e0e0e0; border-radius:6px; background:white; color:#333; }
        .dark .select { background:#2d2d2d; color:#e0e0e0; border-color:#404040; }
        .chat-area { flex:1; display:flex; flex-direction:column; gap:8px; border:1px solid #e0e0e0; border-radius:8px; background:white; overflow:hidden; }
        .dark .chat-area { background:#2d2d2d; border-color:#404040; }
        .messages { flex:1; padding:12px; overflow:auto; color:#333; }
        .dark .messages { color:#e0e0e0; }
        .composer { display:flex; gap:8px; border-top:1px solid #e0e0e0; padding:8px; }
        .dark .composer { border-top-color:#404040; }
        .input { flex:1; resize:none; min-height:44px; padding:8px; border:1px solid #e0e0e0; border-radius:6px; font-family:inherit; }
        .dark .input { background:#1f1f1f; color:#e0e0e0; border-color:#404040; }
        .send { padding:8px 12px; border:none; border-radius:6px; background:#007AFF; color:white; cursor:pointer; }
        .send:disabled { opacity:.6; cursor:default; }
      </style>
      <div class="chat-container">
        <div class="toolbar">
          <label for="model-select" style="font-size:12px; color:#666;">Model</label>
          <select id="model-select" class="select" aria-label="Select downloaded model"></select>
        </div>
        <div class="chat-area">
          <div class="messages" id="messages"></div>
          <div class="composer">
            <textarea id="input" class="input" placeholder="Type a message..." ></textarea>
            <button id="send" class="send" disabled>Send</button>
          </div>
        </div>
      </div>
    `

    // theme sync
    this.applyTheme(this.themeManager.getTheme())
    this.themeManager.addListener((t) => this.applyTheme(t))

    const input = this.shadowRoot.querySelector('#input') as HTMLTextAreaElement
    const send = this.shadowRoot.querySelector('#send') as HTMLButtonElement
    input.addEventListener('input', () => {
      send.disabled = input.value.trim().length === 0
    })

    // UI-only stub for send
    send.addEventListener('click', () => {
      const msg = input.value.trim()
      if (!msg) return
      const messages = this.shadowRoot?.querySelector('#messages') as HTMLDivElement
      const div = document.createElement('div')
      div.textContent = `You: ${msg}`
      messages.appendChild(div)
      input.value = ''
      send.disabled = true
    })
  }
}

customElements.define('chat-view', ChatView)


