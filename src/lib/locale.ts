export type Language = "es" | "en";

let currentLanguage: Language = "es";

export function setCurrentLanguage(language: Language): void {
  currentLanguage = language;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function getCurrentLocale(): string {
  return currentLanguage === "en" ? "en-US" : "es-CO";
}
