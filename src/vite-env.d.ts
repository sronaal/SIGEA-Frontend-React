/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SIGEA API. Defaults to `http://localhost:8080` when it is not set. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
