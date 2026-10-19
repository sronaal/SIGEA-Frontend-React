/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SIGEA API. Defaults to `http://localhost:8080` when it is not set. */
  readonly VITE_API_URL?: string;
  /** Name shown in the application shell. Defaults to `SIGEA` when it is not set. */
  readonly VITE_INSTITUTION_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
