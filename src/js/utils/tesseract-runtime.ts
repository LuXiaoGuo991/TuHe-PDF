import Tesseract from 'tesseract.js';
import {
  assertTesseractLanguagesAvailable,
  TESSERACT_AVAILABLE_LANGUAGES_ENV_KEY,
} from './tesseract-language-availability.js';

const TESSERACT_RUNTIME_ENV_KEYS = [
  'VITE_TESSERACT_WORKER_URL',
  'VITE_TESSERACT_CORE_URL',
  'VITE_TESSERACT_LANG_URL',
  TESSERACT_AVAILABLE_LANGUAGES_ENV_KEY,
] as const;

type TesseractRuntimeEnvKey = (typeof TESSERACT_RUNTIME_ENV_KEYS)[number];

export type TesseractAssetEnv = Partial<
  Pick<ImportMetaEnv, TesseractRuntimeEnvKey>
>;

export interface TesseractAssetConfig {
  workerPath: string;
  corePath: string;
  langPath: string;
}

export type TesseractLoggerMessage = Tesseract.LoggerMessage;
export type TesseractWorkerOptions = Partial<Tesseract.WorkerOptions>;
export type TesseractWorker = Tesseract.Worker;

function getDefaultTesseractAssetEnv(): TesseractAssetEnv {
  return import.meta.env;
}

export function resolveTesseractAssetConfig(
  _env: TesseractAssetEnv = getDefaultTesseractAssetEnv()
): TesseractAssetConfig {
  return {
    workerPath: '/wasm/tesseract/worker.min.js',
    corePath: '/wasm/tesseract/core',
    langPath: '/wasm/tesseract/lang',
  };
}

export function hasConfiguredTesseractOverrides(
  config: TesseractAssetConfig = resolveTesseractAssetConfig()
): boolean {
  return Boolean(config.workerPath && config.corePath && config.langPath);
}

export function hasCompleteTesseractOverrides(
  config: TesseractAssetConfig = resolveTesseractAssetConfig()
): boolean {
  return Boolean(config.workerPath && config.corePath && config.langPath);
}

export function getIncompleteTesseractOverrideKeys(
  _config: TesseractAssetConfig = resolveTesseractAssetConfig()
): Array<
  | 'VITE_TESSERACT_WORKER_URL'
  | 'VITE_TESSERACT_CORE_URL'
  | 'VITE_TESSERACT_LANG_URL'
> {
  return [];
}

export function buildTesseractWorkerOptions(
  logger?: TesseractWorkerOptions['logger'],
  env: TesseractAssetEnv = getDefaultTesseractAssetEnv()
): TesseractWorkerOptions {
  const config = resolveTesseractAssetConfig(env);

  return {
    ...(logger ? { logger } : {}),
    workerPath: config.workerPath,
    corePath: config.corePath,
    langPath: config.langPath,
    gzip: true,
  };
}

export async function createConfiguredTesseractWorker(
  language: string,
  oem: Tesseract.OEM,
  logger?: TesseractWorkerOptions['logger'],
  env: TesseractAssetEnv = getDefaultTesseractAssetEnv()
): Promise<TesseractWorker> {
  assertTesseractLanguagesAvailable(language, env);

  return Tesseract.createWorker(
    language,
    oem,
    buildTesseractWorkerOptions(logger, env)
  );
}
