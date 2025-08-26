/** @fileoverview
 * This file contains the code for the model list
 *      Model Config list is used to store/manage approved models
 */
import type { PreTrainedTokenizer } from '@huggingface/transformers';
import { storeData, loadData, loadOrFetchModel, hasModelData } from './fetchchunkstore.ts';
import { fetchAndCache } from './fetchncache.ts';
export interface ModelConfig {
    modelId:string; // We assume  the modelId is the in `<user>/<repo>` format
    urlBase: string; // The base url of the model default will be huggingface
    onnxDir: string; // The directory of the onnx model default will be `onnx`
    configFileName: string;
    repoBase: string;
    modelFileName: string;
    modelExDataFileName?: string;
    metainfo?: {
        pipelineType?: string; // text-generation, etc..
        lastModified?: string;
        private?: boolean;
        gated?: boolean;
        passedOnnx?: boolean;
    }
    // Note: Heavy data fields (configData, modelData, externalData) removed
    // Use fetchchunkstore functions to load model data on-demand
}

export const OnnxModelConfigFill = (id: string, override?: Partial<ModelConfig>): ModelConfig => {
    return {
        modelId: id,
        urlBase: "https://huggingface.co",
        onnxDir: "onnx",
        configFileName: "config.json",
        repoBase: "resolve/main",
        modelFileName: "model.onnx",
        modelExDataFileName: undefined,
        metainfo: undefined,
        ...override,
    }
}

// Helper function to store model config data
const storeModelConfig = async (modelId: string, configData: any): Promise<void> => {
    await storeData(`${modelId}_config`, configData);
};

// Helper function to load model config data
export const loadModelConfig = async (modelId: string): Promise<any> => {
    return await loadData(`${modelId}_config`);
};

export const OnnxModelFetch = async (config: ModelConfig, progressFn?: (progress: {type:string, msg: string, progress: number, part: string}) => void): Promise<void> => {
    const { modelId, urlBase, onnxDir, configFileName, repoBase, modelFileName, modelExDataFileName } = config;
    const repoUrl = `${urlBase}/${modelId}/${repoBase}`;
    const configUrl = `${repoUrl}/${configFileName}`;
    const modelFileUrl = `${repoUrl}/${onnxDir}/${modelFileName}`;
    const modelExDataUrl = `${repoUrl}/${onnxDir}/${modelExDataFileName}`;
    
    // Download and store model data in IndexedDB using fetchchunkstore
    await Promise.all([
        // @ts-ignore
        loadOrFetchModel(modelFileUrl, modelId, progressFn),
        // Store config data separately with a config-specific key
        fetchAndCache(configUrl).then(res => res.json()).then(configData => {
            // Store config in IndexedDB with a special key
            return storeModelConfig(modelId, configData);
        }),
        // @ts-ignore
        modelExDataFileName ? loadOrFetchModel(modelExDataUrl, `${modelId}_external`, progressFn) : Promise.resolve(),
    ]);
}

export const SoftcheckWithHF = async (modelId: string): Promise<ModelConfig['metainfo']> => {
    const metadataUrl = `https://huggingface.co/api/models/${modelId}`;
    const res = await fetch(metadataUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    });
    const metadata = await res.json();
    if(!('pipeline_tag' in metadata)) {
        console.warn(`Model ${modelId} has no pipeline tag`);
        return undefined;
    } else if('disabled' in metadata && metadata.disabled) {
        console.error(`Model ${modelId} is disabled -- We likely cannot use it`);
    }
    let passedOnnx = false;
    if('tags' in metadata) {
        const temp = metadata.tags as string[];
        passedOnnx = temp.includes('onnx') || !!(temp.find(t => t.includes('onnx')));
    }
    if('gated' in metadata && metadata.gated) console.warn(`Model ${modelId} is gated -- Not set up at the moment`);
    return {
        pipelineType: metadata.pipeline_tag,
        lastModified: metadata.lastModified,
        private: metadata.private,
        gated: metadata.gated,
        passedOnnx
    }
}

/**
 * The class to manage the approved model data lists
 * w/abilty to add new models
 */
export class ModelDataList {
    public readonly modelListId: number;
    private modelConfigs: Map<string, ModelConfig> = new Map();

    constructor(private modelList: ModelConfig[]) {
        this.modelListId = Date.now();
        this.modelList.forEach(config => {
            this.modelConfigs.set(config.modelId, config);
        });
    }

    getModelConfig(modelId: string): ModelConfig | undefined {
        return this.modelConfigs.get(modelId);
    }

    get currentModelList(): string[] {
        return Array.from(this.modelConfigs.keys());
    }

    async addModel(modelId:string, options?: Partial<ModelConfig>, softcheck = true): Promise<ModelConfig> {
        const config = OnnxModelConfigFill(modelId, options);
        if(softcheck) {
            const metainfo = await SoftcheckWithHF(modelId);
            if(metainfo) {
                config.metainfo = metainfo;
            }
        }
        this.modelConfigs.set(modelId, config);
        return config;
    }

    async loadModel(modelId: string, progressFn?: (progress: {type:string, msg: string, progress: number, part: string}) => void): Promise<ModelConfig> {
        const config = this.getModelConfig(modelId);
        if (!config) {
            throw new Error(`Model ${modelId} not found`);
        }
        // Check if model data is already stored in IndexedDB
        const modelExists = await hasModelData(modelId);
        if (modelExists) {
            return config; // Model data exists in storage
        }
        // Download and store model data
        await OnnxModelFetch(config, progressFn);
        return config;
    }

    /**
     * Get the tokenizer for the model
     * @param modelId The model id
     * @returns The tokenizer
     */
    async getTokenizer(modelId: string): Promise<PreTrainedTokenizer> {
        const config = this.getModelConfig(modelId);
        if (!config) {
            throw new Error(`Model ${modelId} not found`);
        }
        return await import('@huggingface/transformers').then(async m => await m.AutoTokenizer.from_pretrained(modelId));
    }
}