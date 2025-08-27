import { ThemeManager } from '../../core/utils/theme-manager'

export class ChatView extends HTMLElement {
  private themeManager = ThemeManager.getInstance()
  private downloadedModels: string[] = []
  private worker?: Worker
  private currentModelId: string | null = null
  private modelLoaded = false

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

    if (this.downloadedModels.length > 0) {
      // Auto-select the first model if none selected
      this.currentModelId = this.currentModelId || this.downloadedModels[0]
      select.value = this.currentModelId!
      this.ensureWorker()
      this.loadSelectedModel()
    }
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
          <span id="model-status" style="font-size:12px; color:#666;"></span>
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

    const select = this.shadowRoot.querySelector('#model-select') as HTMLSelectElement
    select.addEventListener('change', () => {
      this.currentModelId = select.value || null
      this.modelLoaded = false
      this.updateModelStatus('Loading...')
      this.ensureWorker()
      this.loadSelectedModel()
    })

    send.addEventListener('click', () => this.handleSend())
  }

  private updateModelStatus(text: string) {
    const el = this.shadowRoot?.querySelector('#model-status') as HTMLSpanElement | null
    if (el) el.textContent = text
  }

  private ensureWorker() {
    if (this.worker) return
    try {
      this.worker = new Worker(chrome.runtime.getURL('onnx-worker.js'), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent<any>) => this.handleWorkerMessage(e.data)
      this.worker.onerror = (e) => {
        console.error('Chat worker error:', e)
        this.updateModelStatus('Worker error')
      }
    } catch (e) {
      console.error('Failed to start worker', e)
      this.updateModelStatus('Worker failed to start')
    }
  }

  private async loadSelectedModel() {
    if (!this.worker || !this.currentModelId) return
    try {
      // Load full model config from storage
      const result = await chrome.storage.local.get(['modelConfigs'])
      const list = Array.isArray(result.modelConfigs) ? result.modelConfigs : []
      const config = list.find((c: any) => c && c.modelId === this.currentModelId)
      if (!config) {
        this.updateModelStatus('Config not found')
        return
      }
      this.worker.postMessage({ type: 'loadModel', payload: config })
      this.updateModelStatus('Loading...')
    } catch (e) {
      console.error('Failed to load model config', e)
      this.updateModelStatus('Load failed')
    }
  }

  private handleWorkerMessage(msg: any) {
    if (!this.shadowRoot) return
    if (msg?.type === 'success' && msg?.payload?.loaded) {
      this.modelLoaded = true
      this.updateModelStatus('Ready')
      // Enable send if input has content
      const input = this.shadowRoot.querySelector('#input') as HTMLTextAreaElement
      const send = this.shadowRoot.querySelector('#send') as HTMLButtonElement
      send.disabled = input.value.trim().length === 0
      return
    }
    if (msg?.type === 'success' && typeof msg?.payload?.response === 'string') {
      const messages = this.shadowRoot.querySelector('#messages') as HTMLDivElement
      const div = document.createElement('div')
      div.textContent = `Assistant: ${msg.payload.response}`
      messages.appendChild(div)
      return
    }
    if (msg?.type === 'error') {
      console.error('Worker error:', msg?.payload)
      this.updateModelStatus('Error')
    }
  }

  private handleSend() {
    if (!this.shadowRoot) return
    const input = this.shadowRoot.querySelector('#input') as HTMLTextAreaElement
    const send = this.shadowRoot.querySelector('#send') as HTMLButtonElement
    const text = input.value.trim()
    if (!text || !this.worker || !this.modelLoaded) return
    const messages = this.shadowRoot.querySelector('#messages') as HTMLDivElement
    const div = document.createElement('div')
    div.textContent = `You: ${text}`
    messages.appendChild(div)
    input.value = ''
    send.disabled = true
    this.worker.postMessage({ type: 'inference', payload: { input: text } })
  }
}

customElements.define('chat-view', ChatView)


