# Development Guide

This guide provides information for developers working on the LLM Control Panel extension.

## Project Structure

```
src/
├── background/
│   └── tiny-background.ts      # Service worker implementation
├── content/
│   └── index.ts               # Content script for web page integration
├── core/
│   ├── providers/
│   │   └── onnx-provider.ts   # ONNX model provider
│   └── utils/
│       ├── model.list.ts      # Model configurations and fetching
│       ├── webnn-utils.ts     # WebNN provider detection
│       ├── fetchchunkstore.ts # IndexedDB model storage
│       └── fetchncache.ts     # Cache API integration
├── popup/
│   ├── components/            # UI components
│   ├── index.html            # Popup HTML
│   ├── index.ts              # Popup entry point
│   └── styles.css            # Popup styles
└── workers/
    └── onnx-worker.ts        # Web worker for model execution
```

## Development Setup

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager
- Chrome browser for testing

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd LLMControlPanel

# Install dependencies
npm install

# Build the extension
npm run build
```

### Development Workflow

1. **Make Changes**: Edit source files in `src/`
2. **Build**: Run `npm run build` to compile TypeScript and bundle files
3. **Test**: Load the extension in Chrome from the `dist/` directory
4. **Debug**: Use Chrome DevTools to inspect the service worker and popup

## Service Worker Development

### Key Concepts

- **Persistent Background Process**: The service worker runs continuously in the background
- **Message-Based Communication**: All interactions use Chrome runtime messaging
- **State Management**: Combines Chrome Storage API with IndexedDB for different data types
- **Provider Integration**: Leverages WebNN utilities for hardware acceleration

### Adding New Message Types

1. **Define the Message Interface**:
```typescript
interface NewMessageRequest {
  type: 'newMessage';
  data: any;
}
```

2. **Add Handler Function**:
```typescript
async function handleNewMessage(data: any): Promise<{success: boolean, result?: any}> {
  try {
    // Implementation logic
    return {success: true, result: 'success'};
  } catch (error) {
    console.error('[ServiceWorker] New message error:', error);
    return {success: false, message: error.message};
  }
}
```

3. **Update Message Listener**:
```typescript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'newMessage':
      handleNewMessage(message.data).then(sendResponse);
      return true; // Indicates async response
    // ... other cases
  }
});
```

### Storage Patterns

#### Chrome Storage (for configuration)
```typescript
// Save configuration
await chrome.storage.local.set({key: value});

// Load configuration
const result = await chrome.storage.local.get('key');
const value = result.key;
```

#### IndexedDB (for large data)
```typescript
// Use existing utilities
import {loadOrFetchModel, getModelMeta} from '../core/utils/fetchchunkstore';

// Store model data
const success = await loadOrFetchModel(url, modelId);

// Check model metadata
const meta = await getModelMeta(modelId);
```

## Model Management

### ModelConfig Interface

```typescript
interface ModelConfig {
  id: string;           // Unique identifier
  name: string;         // Display name
  url: string;          // Download URL
  size: string;         // Human-readable size
  description?: string; // Optional description
}
```

### Adding Default Models

1. **Edit model.list.ts**:
```typescript
export const defaultModels: ModelConfig[] = [
  {
    id: 'new-model',
    name: 'New Model',
    url: 'https://example.com/model.onnx',
    size: '1.2GB',
    description: 'A new language model'
  },
  // ... existing models
];
```

2. **The service worker will automatically include new default models**

### Model Download Process

1. **Validation**: Check model ID and configuration
2. **Fetch**: Use `loadOrFetchModel` for chunked download
3. **Storage**: Store in IndexedDB with metadata
4. **Status Update**: Update download status in service worker

## Provider Integration

### WebNN Utilities

The `WebNNUtils` class provides hardware acceleration detection:

```typescript
const webnnUtils = new WebNNUtils();

// Get available providers
const providers = await webnnUtils.getAvailableProviders();
// Returns: ['webnn', 'webgpu', 'wasm']

// Get available devices
const devices = await webnnUtils.getAvailableDevices();
// Returns: ['cpu', 'gpu', 'npu']
```

### Adding New Providers

1. **Extend WebNNUtils**: Add detection logic for new providers
2. **Update Service Worker**: Include new providers in initialization
3. **Update ONNX Provider**: Add support for new execution providers

## UI Development

### Popup Components

The popup uses a component-based architecture:

- `settings-view.ts`: Settings interface (theme, providers list, quantization recommendation)
- `apps-view.ts`: Approved apps list and LLMs management (add/download/select models)
- `llm-control-panel.ts`: Main popup controller

### Adding New UI Features

1. **Create Component**: Add new TypeScript file in `popup/components/`
2. **Update Main Controller**: Import and initialize in `llm-control-panel.ts`
3. **Add Styles**: Update `popup/styles.css`
4. **Service Worker Integration**: Add message handlers for new features

### LLMs Tab (Apps View)

- Use `chrome.runtime.sendMessage({ type: 'status' })` to display model IDs, downloaded state, and selected model.
- Use `addModel`, `downloadModel`, and `setSelectedModel` message types to manage models.
- Store heavy model data in IndexedDB (handled by existing utilities and service worker).

### Settings Providers and Quantization

- Providers are listed from the `status` response (`availableProviders`).
- The quantization recommendation is derived in the UI (no new API), combining providers and `navigator.deviceMemory`:
  - WebGPU + >=16GB: `fp16`
  - WebGPU + 8–16GB: `q4f16`
  - WebGPU + <8GB: `q4`
  - WebNN (>=8GB): `q4f16`, else `q4`
  - WASM only (>=8GB): `q4f16`, else `q4`

## Testing

### Manual Testing

1. **Load Extension**: Use Chrome's "Load unpacked" feature
2. **Open Popup**: Click extension icon to test UI
3. **Check Service Worker**: Inspect background page in Chrome DevTools
4. **Test Messages**: Use the provided test script

### Automated Testing

```bash
# Run service worker tests
node test-service-worker.js

# Build and verify
npm run build
```

### Testing Checklist

- [ ] Service worker starts without errors
- [ ] All message types respond correctly
- [ ] Model addition and download work
- [ ] Provider detection functions
- [ ] Storage operations succeed
- [ ] UI components render properly
- [ ] Build completes without warnings

## Debugging

### Chrome DevTools

1. **Service Worker**: `chrome://extensions/` → "Inspect views: background page"
2. **Popup**: Right-click extension icon → "Inspect popup"
3. **Content Script**: Use regular page DevTools

### Common Issues

#### Service Worker Not Loading
- Check `manifest.json` background script path
- Verify TypeScript compilation
- Look for syntax errors in console

#### Messages Not Working
- Ensure `sendResponse` is called
- Return `true` for async handlers
- Check message format matches interface

#### Storage Issues
- Verify permissions in `manifest.json`
- Check Chrome storage quota
- Ensure proper error handling

#### Provider Detection Fails
- Check WebNN utilities integration
- Verify browser support for WebNN/WebGPU
- Test fallback to WASM provider

### Logging Best Practices

```typescript
// Use consistent prefixes
console.log('[ServiceWorker] Operation completed');
console.error('[ServiceWorker] Error:', error.message);
console.warn('[ServiceWorker] Warning: fallback used');

// Include context
console.log('[ServiceWorker] Model downloaded:', {modelId, size});
```

## Performance Optimization

### Service Worker

- Minimize memory usage in background process
- Use lazy loading for large data structures
- Implement efficient message handling

### Model Management

- Chunk large model downloads
- Use IndexedDB for persistent storage
- Implement progress tracking

### UI Responsiveness

- Async message handling
- Loading states for long operations
- Error boundaries for robustness

## Code Style Guidelines

### TypeScript

- Use strict type checking
- Define interfaces for all message types
- Prefer `async/await` over promises
- Use meaningful variable names

### Error Handling

```typescript
try {
  const result = await operation();
  return {success: true, result};
} catch (error) {
  console.error('[Component] Operation failed:', error);
  return {success: false, message: error.message};
}
```

### File Organization

- Group related functionality in modules
- Use clear, descriptive file names
- Keep components focused and small
- Document complex logic with comments

## Contributing

### Pull Request Process

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Make Changes**: Follow coding standards
3. **Test Thoroughly**: Ensure all functionality works
4. **Build Successfully**: Verify clean build
5. **Submit PR**: Include description of changes

### Code Review Requirements

- All builds must pass
- No functionality should be removed to fix build issues
- Follow existing patterns and conventions
- Include appropriate documentation updates
- Test edge cases and error conditions

### Release Process

1. **Version Bump**: Update version in `manifest.json` and `package.json`
2. **Build**: Create production build
3. **Test**: Comprehensive testing in clean environment
4. **Package**: Create extension package for distribution
5. **Deploy**: Upload to Chrome Web Store (if applicable)

## Future Roadmap

### Planned Features

- **Web Worker Integration**: Move model execution to dedicated worker
- **Model Quantization**: Support for compressed models
- **Batch Processing**: Handle multiple inference requests
- **Performance Monitoring**: Track usage and performance metrics
- **Advanced UI**: Enhanced model management interface

### Technical Improvements

- **Streaming Inference**: Real-time model responses
- **Model Caching**: Intelligent cache management
- **Provider Optimization**: Better hardware utilization
- **Error Recovery**: Robust error handling and recovery
- **Security Enhancements**: Additional security measures

This development guide should be updated as the project evolves and new features are added.