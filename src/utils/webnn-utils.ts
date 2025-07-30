export interface WebNNDevice {
  name: string
  type: 'npu' | 'gpu' | 'cpu'
  supported: boolean
  performance?: number
}

export interface WebNNProviderConfig {
  deviceType: 'npu' | 'gpu' | 'cpu'
  deviceName?: string
  optimizationLevel?: 'all' | 'basic' | 'disabled'
  enableQuantization?: boolean
  enablePruning?: boolean
}

export class WebNNUtils {
  private static instance: WebNNUtils
  private devices: WebNNDevice[] = []
  private initialized = false

  private constructor() { }

  static getInstance(): WebNNUtils {
    if (!WebNNUtils.instance) {
      WebNNUtils.instance = new WebNNUtils()
    }
    return WebNNUtils.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Check if we're in a service worker context or if navigator.ml is not available
      if (typeof navigator === 'undefined' || typeof (navigator as any).ml === 'undefined') {
        console.log('Running in service worker context or WebNN not available, using mock WebNN devices')
        this.devices = [
          { name: 'NPU (Mock)', type: 'npu', supported: true, performance: 100 },
          { name: 'GPU (Mock)', type: 'gpu', supported: true, performance: 80 },
          { name: 'CPU (Mock)', type: 'cpu', supported: true, performance: 60 }
        ]
        this.initialized = true
        return
      }

      // Get available devices
      await this.detectDevices()
      this.initialized = true
      console.log('WebNN initialized with devices:', this.devices)
    } catch (error) {
      console.error('Failed to initialize WebNN:', error)
      // Fallback to mock devices on any error
      this.devices = [
        { name: 'NPU (Mock)', type: 'npu', supported: true, performance: 100 },
        { name: 'GPU (Mock)', type: 'gpu', supported: true, performance: 80 },
        { name: 'CPU (Mock)', type: 'cpu', supported: true, performance: 60 }
      ]
      this.initialized = true
    }
  }

  private async detectDevices(): Promise<void> {
    try {
      // Check for NPU devices first (highest priority)
      const npuDevices = await this.checkNPUDevices()
      this.devices.push(...npuDevices)

      // Check for GPU devices
      const gpuDevices = await this.checkGPUDevices()
      this.devices.push(...gpuDevices)

      // Check for CPU device
      const cpuDevice = await this.checkCPUDevice()
      this.devices.push(cpuDevice)

      // Sort devices by priority: npu > gpu > cpu
      this.devices.sort((a, b) => {
        const priority = { npu: 3, gpu: 2, cpu: 1 }
        return priority[b.type] - priority[a.type]
      })
    } catch (error) {
      console.error('Error detecting WebNN devices:', error)
    }
  }

  private async checkNPUDevices(): Promise<WebNNDevice[]> {
    const npuDevices: WebNNDevice[] = []

    try {
      // Check if WebNN API is available
      if (typeof (navigator as any).ml !== 'undefined') {
        const ml = (navigator as any).ml

        // Try to get available contexts which may indicate NPU support
        if (ml.getContext) {
          try {
            // Check for NPU-specific context options
            const npuContext = await ml.getContext({
              deviceType: 'npu',
              powerPreference: 'high-performance'
            })

            if (npuContext) {
              const device: WebNNDevice = {
                name: 'NPU (WebNN)',
                type: 'npu',
                supported: true,
                performance: 100
              }
              npuDevices.push(device)
            }
          } catch (error) {
            // NPU context not available
          }
        }

        // Check for specific NPU device names using WebNN API
        const npuDeviceNames = [
          'qualcomm-npu', 'snapdragon-npu', 'mediatek-npu', 'dimensity-npu',
          'apple-neural-engine', 'ane', 'neural-engine', 'tensor-core',
          'ai-accelerator', 'ml-accelerator', 'neural-processor'
        ]

        for (const deviceName of npuDeviceNames) {
          try {
            const context = await ml.getContext({
              deviceType: 'npu',
              deviceName: deviceName
            })

            if (context) {
              const device: WebNNDevice = {
                name: deviceName,
                type: 'npu',
                supported: true,
                performance: 95
              }
              npuDevices.push(device)
            }
          } catch (error) {
            // This specific NPU device not available
          }
        }
      }

      // Check for hardware concurrency and user agent hints for NPU detection
      if (navigator.hardwareConcurrency) {
        // Some systems may report NPU cores in hardware concurrency
        const cores = navigator.hardwareConcurrency
        if (cores > 8) {
          // High core count might indicate NPU presence
          const device: WebNNDevice = {
            name: 'NPU (High Core Count)',
            type: 'npu',
            supported: true,
            performance: 85
          }
          npuDevices.push(device)
        }
      }

      // Check user agent for known NPU platforms
      const userAgent = navigator.userAgent.toLowerCase()
      const npuPlatforms = [
        { name: 'apple-neural-engine', pattern: /iphone|ipad|mac/ },
        { name: 'qualcomm-snapdragon', pattern: /snapdragon/ },
        { name: 'mediatek-dimensity', pattern: /mediatek|dimensity/ }
      ]

      for (const platform of npuPlatforms) {
        if (platform.pattern.test(userAgent)) {
          const device: WebNNDevice = {
            name: platform.name,
            type: 'npu',
            supported: true,
            performance: 90
          }
          npuDevices.push(device)
        }
      }

    } catch (error) {
      console.warn('NPU detection failed:', error)
    }

    return npuDevices
  }

  private async checkGPUDevices(): Promise<WebNNDevice[]> {
    const gpuDevices: WebNNDevice[] = []

    try {
      // Check for WebGPU support
      if (typeof (navigator as any).gpu !== 'undefined') {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter({
            powerPreference: 'high-performance'
          })

          if (adapter) {
            const adapterInfo = await adapter.requestAdapterInfo()
            const device: WebNNDevice = {
              name: adapterInfo.name || 'GPU (WebGPU)',
              type: 'gpu',
              supported: true,
              performance: 85
            }
            gpuDevices.push(device)
          }
        } catch (error) {
          console.warn('WebGPU adapter request failed:', error)
        }
      }

      // Check for WebGL support (fallback for GPU detection)
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)

          const device: WebNNDevice = {
            name: `GPU (${renderer})`,
            type: 'gpu',
            supported: true,
            performance: 75
          }
          gpuDevices.push(device)
        } else {
          // WebGL available but no debug info
          const device: WebNNDevice = {
            name: 'GPU (WebGL)',
            type: 'gpu',
            supported: true,
            performance: 70
          }
          gpuDevices.push(device)
        }
      }

      // Check for WebNN GPU context
      if (typeof (navigator as any).ml !== 'undefined') {
        const ml = (navigator as any).ml

        try {
          const gpuContext = await ml.getContext({
            deviceType: 'gpu',
            powerPreference: 'high-performance'
          })

          if (gpuContext) {
            const device: WebNNDevice = {
              name: 'GPU (WebNN)',
              type: 'gpu',
              supported: true,
              performance: 80
            }
            gpuDevices.push(device)
          }
        } catch (error) {
          // WebNN GPU context not available
        }
      }

      // Check for hardware acceleration hints
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection && connection.effectiveType === '4g') {
          // High-speed connection might indicate better GPU performance
          const device: WebNNDevice = {
            name: 'GPU (High Performance)',
            type: 'gpu',
            supported: true,
            performance: 80
          }
          gpuDevices.push(device)
        }
      }

    } catch (error) {
      console.warn('GPU detection failed:', error)
    }

    return gpuDevices
  }

  private async checkCPUDevice(): Promise<WebNNDevice> {
    let performance = 30 // Base CPU performance
    let name = 'CPU'

    try {
      // Check hardware concurrency for CPU cores
      if (navigator.hardwareConcurrency) {
        const cores = navigator.hardwareConcurrency
        name = `CPU (${cores} cores)`

        // Adjust performance based on core count
        if (cores >= 16) {
          performance = 50
        } else if (cores >= 8) {
          performance = 40
        } else if (cores >= 4) {
          performance = 35
        } else {
          performance = 30
        }
      }

      // Check for WebNN CPU context
      if (typeof (navigator as any).ml !== 'undefined') {
        const ml = (navigator as any).ml

        try {
          const cpuContext = await ml.getContext({
            deviceType: 'cpu',
            powerPreference: 'balanced'
          })

          if (cpuContext) {
            name = 'CPU (WebNN)'
            performance = 35
          }
        } catch (error) {
          // WebNN CPU context not available, using fallback
        }
      }

      // Check for advanced CPU features
      if (navigator.userAgent.includes('x86_64') || navigator.userAgent.includes('amd64')) {
        name = 'CPU (x86_64)'
        performance += 5
      } else if (navigator.userAgent.includes('arm64') || navigator.userAgent.includes('aarch64')) {
        name = 'CPU (ARM64)'
        performance += 10 // ARM64 often has better ML performance
      }

      // Check for high-performance mode indicators
      if ('deviceMemory' in navigator) {
        const memory = (navigator as any).deviceMemory
        if (memory >= 8) {
          performance += 5
        }
      }

      // Check for battery status (mobile devices)
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          if (battery && battery.charging) {
            // Charging devices might have better performance
            performance += 2
          }
        } catch (error) {
          // Battery API not available
        }
      }

    } catch (error) {
      console.warn('CPU detection failed:', error)
    }

    return {
      name: name,
      type: 'cpu',
      supported: true,
      performance: Math.min(performance, 60) // Cap CPU performance at 60
    }
  }

  getAvailableDevices(): WebNNDevice[] {
    return [...this.devices]
  }

  getPreferredDevice(): WebNNDevice | null {
    // Return the first available device (already sorted by priority)
    return this.devices.find(device => device.supported) || null
  }

  getDeviceByName(name: string): WebNNDevice | null {
    return this.devices.find(device => device.name === name) || null
  }

  getDevicesByType(type: 'npu' | 'gpu' | 'cpu'): WebNNDevice[] {
    return this.devices.filter(device => device.type === type && device.supported)
  }

  isWebNNAvailable(): boolean {
    return typeof (navigator as any).ml !== 'undefined'
  }

  async createWebNNContext(config?: WebNNProviderConfig): Promise<any> {
    if (!this.isWebNNAvailable()) {
      throw new Error('WebNN not available')
    }

    const device = config?.deviceName
      ? this.getDeviceByName(config.deviceName)
      : this.getPreferredDevice()

    if (!device) {
      throw new Error('No suitable WebNN device found')
    }

    // In a real implementation, you would create a WebNN context
    // with the specified device and configuration
    console.log(`Creating WebNN context with device: ${device.name} (${device.type})`)

    return {
      device: device.name,
      type: device.type,
      config: config || {}
    }
  }

  getDeviceCapabilities(deviceName: string): any {
    const device = this.getDeviceByName(deviceName)
    if (!device) {
      return null
    }

    // Mock capabilities based on device type
    const capabilities = {
      npu: {
        maxBatchSize: 32,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: true,
        pruning: true
      },
      gpu: {
        maxBatchSize: 16,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: true,
        pruning: false
      },
      cpu: {
        maxBatchSize: 8,
        supportedOps: ['conv2d', 'matmul', 'add', 'mul', 'relu'],
        quantization: false,
        pruning: false
      }
    }

    return capabilities[device.type] || capabilities.cpu
  }
} 