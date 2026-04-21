import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import { GroupBase } from "react-select";
import { LanguageCode, MESSAGES } from "@/lib/i18n";

export type CountryOption = {
  value: CountryCode;
  label: string;
  dialCode: string;
  countryName: string;
  flag: string;
};

export type TimezoneOption = {
  value: string;
  label: string;
};

export const DATE_OF_BIRTH_PATTERN = "[0-9]{2}-[0-9]{2}-[0-9]{4}";
export const PHONE_NUMBER_PATTERN = "[0-9]{6,15}";

export const TIMEZONE_REGION_ORDER = [
  "Europe",
  "Americas",
  "Asia",
  "Africa",
  "Pacific",
] as const;

type TimezoneRegionKey = (typeof TIMEZONE_REGION_ORDER)[number];

const TIMEZONE_TO_COUNTRY: Record<string, CountryCode> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Europe/Warsaw": "PL",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "Asia/Dubai": "AE",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
};

function detectCountryFromLocale(locale: string): string | null {
  if (!locale) {
    return null;
  }

  try {
    if (typeof Intl.Locale === "function") {
      const region = new Intl.Locale(locale).region;
      if (region?.length === 2) {
        return region.toUpperCase();
      }
    }
  } catch {
    // Continue to split-based parsing if Intl.Locale cannot parse the locale.
  }

  const localeParts = locale.split(/[-_]/);
  const regionCandidate = localeParts[localeParts.length - 1];
  return regionCandidate?.length === 2 ? regionCandidate.toUpperCase() : null;
}

function toFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function getUtcOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(new Date());

    const rawOffset = parts.find((part) => part.type === "timeZoneName")?.value;
    if (!rawOffset) {
      return "UTC+0";
    }

    const normalizedOffset = rawOffset.replace("GMT", "UTC");
    return normalizedOffset === "UTC" ? "UTC+0" : normalizedOffset;
  } catch {
    return "UTC+0";
  }
}

export function formatDateOfBirth(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let formatted = day;
  if (month) {
    formatted = `${formatted}-${month}`;
  }
  if (year) {
    formatted = `${formatted}-${year}`;
  }

  return formatted;
}

export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

export function buildCountryOptions(language: LanguageCode): CountryOption[] {
  const displayNames =
    typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames([language], { type: "region" })
      : null;

  return getCountries()
    .map((countryCode) => {
      try {
        const dialCode = `+${getCountryCallingCode(countryCode)}`;
        const countryName = displayNames?.of(countryCode) ?? countryCode;

        return {
          value: countryCode,
          dialCode,
          countryName,
          flag: toFlagEmoji(countryCode),
          label: `${toFlagEmoji(countryCode)} ${dialCode} ${countryName}`,
        };
      } catch {
        return null;
      }
    })
    .filter((option): option is CountryOption => option !== null)
    .sort((left, right) => left.countryName.localeCompare(right.countryName));
}

export function buildTimezoneGroups(
  language: LanguageCode,
): GroupBase<TimezoneOption>[] {
  const groupedTimezones: Record<TimezoneRegionKey, TimezoneOption[]> = {
    Europe: [],
    Americas: [],
    Asia: [],
    Africa: [],
    Pacific: [],
  };
  const groupLabels = MESSAGES[language].form.timezone.groups;

  const availableTimezones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  for (const timezone of availableTimezones) {
    if (timezone.startsWith("Europe/")) {
      groupedTimezones.Europe.push({
        value: timezone,
        label: `${timezone} (${getUtcOffsetLabel(timezone)})`,
      });
      continue;
    }

    if (timezone.startsWith("America/")) {
      groupedTimezones.Americas.push({
        value: timezone,
        label: `${timezone} (${getUtcOffsetLabel(timezone)})`,
      });
      continue;
    }

    if (timezone.startsWith("Asia/")) {
      groupedTimezones.Asia.push({
        value: timezone,
        label: `${timezone} (${getUtcOffsetLabel(timezone)})`,
      });
      continue;
    }

    if (timezone.startsWith("Africa/")) {
      groupedTimezones.Africa.push({
        value: timezone,
        label: `${timezone} (${getUtcOffsetLabel(timezone)})`,
      });
      continue;
    }

    if (timezone.startsWith("Pacific/")) {
      groupedTimezones.Pacific.push({
        value: timezone,
        label: `${timezone} (${getUtcOffsetLabel(timezone)})`,
      });
    }
  }

  groupedTimezones.Europe.unshift({
    value: "UTC",
    label: "UTC (UTC+0)",
  });

  return TIMEZONE_REGION_ORDER.map((groupKey) => ({
    label: groupLabels[groupKey],
    options: groupedTimezones[groupKey],
  })).filter((group) => group.options.length > 0);
}

export function detectLocaleCountry(): string {
  if (typeof navigator === "undefined") {
    return "US";
  }

  const timezoneCountry = TIMEZONE_TO_COUNTRY[detectBrowserTimezone()];
  if (timezoneCountry) {
    return timezoneCountry;
  }

  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter((value): value is string => Boolean(value));

  for (const locale of locales) {
    const localeCountry = detectCountryFromLocale(locale);
    if (localeCountry) {
      return localeCountry;
    }
  }

  return "US";
}

export function detectBrowserTimezone(): string {
  if (typeof Intl === "undefined") {
    return "UTC";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
