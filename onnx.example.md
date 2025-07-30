```ts
import { AutoTokenizer } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';

const tokenizer = await AutoTokenizer.from_pretrained('YourModelPathOrHubID');
const encoded = await tokenizer('Hello world!', { return_tensors: 'np' });

const session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
const ortInputs = { input_ids: encoded.input_ids, attention_mask: encoded.attention_mask };
const outputs = await session.run(ortInputs);

// Optionally decode:
const decoding = await tokenizer.decode(outputs.logits /* or generated ids */);
```