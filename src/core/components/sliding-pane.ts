export class SlidingPane extends HTMLElement {
  private shown = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }

  static get observedAttributes() {
    return ['shown']
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'shown') {
      this.shown = newValue === 'true'
      this.render()
    }
  }

  private render() {
    if (!this.shadowRoot) return

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        :host([shown]) {
          opacity: 1;
          visibility: visible;
        }
        
        .pane {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: white;
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
        }
        
        .dark .pane {
          background: #2d2d2d;
        }
        
        :host([shown]) .pane {
          transform: translateX(0);
        }
        
        .pane-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .dark .pane-header {
          border-bottom-color: #404040;
        }
        
        .pane-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .dark .pane-title {
          color: #e0e0e0;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .close-button:hover {
          background: #f0f0f0;
        }
        
        .dark .close-button:hover {
          background: #404040;
        }
        
        .pane-content {
          padding: 16px;
          height: calc(100% - 60px);
          overflow-y: auto;
        }
      </style>
      
      <div class="pane">
        <div class="pane-header">
          <h2 class="pane-title">
            <slot name="title">Settings</slot>
          </h2>
          <button class="close-button" id="close-pane">&times;</button>
        </div>
        <div class="pane-content">
          <slot></slot>
        </div>
      </div>
    `
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Close button
    this.shadowRoot.getElementById('close-pane')?.addEventListener('click', () => {
      this.hide()
    })

    // Close on backdrop click
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target === this.shadowRoot) {
        this.hide()
      }
    })
  }

  show() {
    this.setAttribute('shown', 'true')
  }

  hide() {
    this.removeAttribute('shown')
  }

  toggle() {
    if (this.shown) {
      this.hide()
    } else {
      this.show()
    }
  }
}

customElements.define('sliding-pane', SlidingPane) 