"use client";

import { CSSObjectWithLabel } from "react-select";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Select, { SingleValue } from "react-select";
import { getLanguageFromSearchParam, isLanguageCode, LanguageCode, MESSAGES } from "@/lib/i18n";
import {
  buildCountryOptions,
  buildTimezoneGroups,
  CountryOption,
  DATE_OF_BIRTH_PATTERN,
  detectBrowserTimezone,
  detectLocaleCountry,
  formatDateOfBirth,
  normalizePhoneNumber,
  PHONE_NUMBER_PATTERN,
  TimezoneOption,
} from "@/lib/register-form";

const selectStyles = {
  control: (
    base: CSSObjectWithLabel,
    state: { isFocused: boolean },
  ): CSSObjectWithLabel => ({
    ...base,
    minHeight: 48,
    borderRadius: 12,
    borderColor: state.isFocused ? "#0f766e" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(20, 184, 166, 0.15)" : "none",
    paddingRight: 2,
    ":hover": { borderColor: "#0f766e" },
  }),
  indicatorsContainer: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    paddingRight: 8,
  }),
  dropdownIndicator: (
    base: CSSObjectWithLabel,
    state: { isFocused: boolean },
  ): CSSObjectWithLabel => ({
    ...base,
    padding: 6,
    color: state.isFocused ? "#0f766e" : "#64748b",
    ":hover": { color: "#0f766e" },
  }),
  indicatorSeparator: (): CSSObjectWithLabel => ({
    display: "none",
  }),
  menu: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({ ...base, zIndex: 20 }),
  placeholder: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    color: "#64748b",
  }),
};

function RegisterPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryOption["value"] | null>(
    null,
  );
  const [selectedTimezoneValue, setSelectedTimezoneValue] = useState<string | null>(null);

  const language = getLanguageFromSearchParam(searchParams.get("lang"));
  const messages = MESSAGES[language];

  const languageOptions = useMemo(
    () => [
      { value: "en", label: messages.languageOptions.en },
      { value: "pl", label: messages.languageOptions.pl },
    ],
    [messages.languageOptions.en, messages.languageOptions.pl],
  );

  const countryOptions = useMemo(() => buildCountryOptions(language), [language]);

  const timezoneGroups = useMemo(() => buildTimezoneGroups(language), [language]);
  const timezoneOptions = useMemo(
    () => timezoneGroups.flatMap((group) => group.options),
    [timezoneGroups],
  );

  const defaultCountryOption = useMemo(() => {
    const localeCountry = detectLocaleCountry();
    const matchedCountry = countryOptions.find((country) => country.value === localeCountry);
    const fallbackCountry = countryOptions.find((country) => country.value === "US");

    return matchedCountry ?? fallbackCountry ?? null;
  }, [countryOptions]);

  const selectedCountry = useMemo(() => {
    const userSelectedCountry = countryOptions.find(
      (country) => country.value === selectedCountryCode,
    );

    return userSelectedCountry ?? defaultCountryOption;
  }, [countryOptions, defaultCountryOption, selectedCountryCode]);

  const detectedTimezone = useMemo(() => detectBrowserTimezone(), []);
  const defaultTimezoneOption = useMemo(() => {
    const matchedTimezone = timezoneOptions.find(
      (timezone) => timezone.value === detectedTimezone,
    );
    const fallbackTimezone = timezoneOptions.find((timezone) => timezone.value === "UTC");

    return matchedTimezone ?? fallbackTimezone ?? null;
  }, [detectedTimezone, timezoneOptions]);

  const selectedTimezone = useMemo(() => {
    const userSelectedTimezone = timezoneOptions.find(
      (timezone) => timezone.value === selectedTimezoneValue,
    );

    return userSelectedTimezone ?? defaultTimezoneOption;
  }, [defaultTimezoneOption, selectedTimezoneValue, timezoneOptions]);

  const syncLanguageInUrl = useCallback(
    (nextLanguage: LanguageCode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lang", nextLanguage);
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onLanguageChange = useCallback(
    (nextLanguage: LanguageCode) => {
      syncLanguageInUrl(nextLanguage);
    },
    [syncLanguageInUrl],
  );

  useEffect(() => {
    if (isLanguageCode(searchParams.get("lang"))) {
      return;
    }

    syncLanguageInUrl("en");
  }, [searchParams, syncLanguageInUrl]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleDateOfBirthChange = useCallback(
    (value: string) => {
      setDateOfBirth(formatDateOfBirth(value));
    },
    [setDateOfBirth],
  );

  const handlePhoneChange = useCallback((value: string) => {
    const digitsOnly = normalizePhoneNumber(value);
    setPhoneNumber(digitsOnly);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!acceptedTerms || isSubmitting || !selectedCountry || !selectedTimezone) {
        return;
      }

      setIsSubmitting(true);

      const payload = {
        firstName,
        lastName,
        dateOfBirth,
        email,
        phoneNumber: `${selectedCountry.dialCode}${phoneNumber}`,
        password,
        timezone: selectedTimezone.value,
        language,
      };

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Registration request failed");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      acceptedTerms,
      dateOfBirth,
      email,
      firstName,
      isSubmitting,
      language,
      lastName,
      password,
      phoneNumber,
      selectedCountry,
      selectedTimezone,
    ],
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900 sm:px-6">
      <main className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <header className="max-w-sm">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {messages.header.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {messages.header.subtitlePrefix}{" "}
                <Link
                  href={`/login?lang=${language}`}
                  className="font-semibold text-teal-700 transition hover:text-teal-600"
                >
                  {messages.header.subtitleLink}
                </Link>
              </p>
            </header>

            <div className="w-full max-w-48 shrink-0">
              <label
                htmlFor="language-top"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {messages.languageLabel}
              </label>
              <Select
                instanceId="language-top"
                inputId="language-top"
                value={languageOptions.find((option) => option.value === language)}
                onChange={(option: SingleValue<{ value: string; label: string }>) => {
                  if (option && isLanguageCode(option.value)) {
                    onLanguageChange(option.value);
                  }
                }}
                options={languageOptions}
                isSearchable={false}
                aria-label={messages.languageLabel}
                classNamePrefix="react-select"
                styles={selectStyles}
              />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-slate-700">
                  {messages.form.firstName.label}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={messages.form.firstName.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-slate-700">
                  {messages.form.lastName.label}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={messages.form.lastName.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dateOfBirth" className="mb-2 block text-sm font-medium text-slate-700">
                  {messages.form.dateOfBirth.label}
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern={DATE_OF_BIRTH_PATTERN}
                  minLength={10}
                  maxLength={10}
                  autoComplete="bday"
                  value={dateOfBirth}
                  onChange={(event) => handleDateOfBirthChange(event.target.value)}
                  placeholder={messages.form.dateOfBirth.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  {messages.form.email.label}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  minLength={6}
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={messages.form.email.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-slate-700">
                {messages.form.phoneNumber.label}
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                <Select
                  instanceId="countryCode"
                  inputId="countryCode"
                  value={selectedCountry}
                  onChange={(option: SingleValue<CountryOption>) =>
                    setSelectedCountryCode(option?.value ?? null)
                  }
                  options={countryOptions}
                  isSearchable
                  aria-label={messages.form.phoneNumber.label}
                  placeholder=""
                  noOptionsMessage={() => messages.select.noOptions}
                  classNamePrefix="react-select"
                  formatOptionLabel={(option, meta) => {
                    if (meta.context === "value") {
                      return (
                        <span>
                          {option.flag} {option.dialCode}
                        </span>
                      );
                    }

                    return (
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-800">
                          {option.flag} {option.dialCode}
                        </span>
                        <span className="truncate text-xs text-slate-500">{option.countryName}</span>
                      </div>
                    );
                  }}
                  styles={selectStyles}
                />
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern={PHONE_NUMBER_PATTERN}
                  minLength={6}
                  maxLength={15}
                  value={phoneNumber}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  placeholder={messages.form.phoneNumber.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                {messages.form.password.label}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={messages.form.password.placeholder}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-800 outline-none ring-teal-200 transition focus:border-teal-600 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={
                    isPasswordVisible ? messages.form.password.hide : messages.form.password.show
                  }
                >
                  {isPasswordVisible ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M3 3L21 21M10.58 10.58A2 2 0 0013.42 13.42M9.88 4.24A10.94 10.94 0 0112 4C16.5 4 20.27 6.94 21.54 11C21.06 12.53 20.2 13.9 19.07 15M14.12 19.76A10.94 10.94 0 0112 20C7.5 20 3.73 17.06 2.46 13C3.06 11.08 4.27 9.4 5.93 8"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M2.46 12C3.73 7.94 7.5 5 12 5C16.5 5 20.27 7.94 21.54 12C20.27 16.06 16.5 19 12 19C7.5 19 3.73 16.06 2.46 12Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="timezone" className="mb-2 block text-sm font-medium text-slate-700">
                {messages.form.timezone.label}
              </label>
              <Select
                instanceId="timezone"
                inputId="timezone"
                value={selectedTimezone}
                onChange={(option: SingleValue<TimezoneOption>) =>
                  setSelectedTimezoneValue(option?.value ?? null)
                }
                options={timezoneGroups}
                isSearchable
                aria-label={messages.form.timezone.label}
                placeholder={messages.form.timezone.placeholder}
                noOptionsMessage={() => messages.select.noOptions}
                classNamePrefix="react-select"
                styles={selectStyles}
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="text-sm text-slate-700">
                {messages.form.terms.prefix}{" "}
                <span className="font-semibold text-slate-800">{messages.form.terms.tos}</span>{" "}
                {messages.form.terms.middle}{" "}
                <span className="font-semibold text-slate-800">{messages.form.terms.privacy}</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={!acceptedTerms || isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isSubmitting ? messages.button.submitting : messages.button.register}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900 sm:px-6">
          <main className="mx-auto flex w-full max-w-5xl items-center justify-center">
            <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            </section>
          </main>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
