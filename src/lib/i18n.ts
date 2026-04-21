import enMessages from "@/i18n/en.json";
import plMessages from "@/i18n/pl.json";

export type LanguageCode = "en" | "pl";

export const LANGUAGE_VALUES = ["en", "pl"] as const;

export const MESSAGES = {
  en: enMessages,
  pl: plMessages,
} as const;

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return value === "en" || value === "pl";
}

export function getLanguageFromSearchParam(
  value: string | string[] | null | undefined,
): LanguageCode {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isLanguageCode(candidate) ? candidate : "en";
}
