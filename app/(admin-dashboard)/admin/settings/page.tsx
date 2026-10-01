"use client";

import { useEffect, useState } from "react";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";

type Settings = {
  storeName: string;
  supportEmail: string;
};

type ApiError = {
  error?: string;
  errors?: Record<string, string>;
};

const initialSettings: Settings = {
  storeName: "BookStore",
  supportEmail: "",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/admin/settings", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load settings.");
        }

        if (active) {
          setSettings(data.settings);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load settings."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  function updateSetting(field: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setSaveError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setFieldErrors({});
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      await toastApiResponse(response, {
        success: "Settings saved successfully.",
        error: "Failed to save settings.",
      });
      const data = (await response.json()) as ApiError & {
        settings?: Settings;
        message?: string;
      };

      if (!response.ok) {
        setFieldErrors(data.errors ?? {});
        setSaveError(data.error || "Failed to save settings.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setSuccessMessage(data.message || "Settings saved successfully.");
    } catch (error) {
      setSaveError("Unable to reach the server. Check your connection and try again.");
      toastApiFailure(error, "Unable to reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Administration
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage the store name and customer support contact details.
        </p>
      </header>

      {loading ? (
        <div
          className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm"
          role="status"
        >
          Loading settings…
        </div>
      ) : loadError ? (
        <section
          className="rounded-xl border border-red-200 bg-white p-6 shadow-sm"
          aria-labelledby="settings-load-error"
        >
          <h2 id="settings-load-error" className="font-semibold text-red-800">
            Settings could not be loaded
          </h2>
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Try again
          </button>
        </section>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {saveError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {saveError}
            </div>
          )}
          {successMessage && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {successMessage}
            </div>
          )}

          <section
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="store-profile-heading"
          >
            <div className="mb-6 border-b border-gray-100 pb-5">
              <h2
                id="store-profile-heading"
                className="text-xl font-semibold text-gray-900"
              >
                Store profile
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Keep your store identity and customer support contact up to date.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="storeName"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Store name
                </label>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  autoComplete="organization"
                  maxLength={100}
                  required
                  value={settings.storeName}
                  onChange={(event) =>
                    updateSetting("storeName", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors.storeName)}
                  aria-describedby={
                    fieldErrors.storeName ? "storeName-error" : "storeName-help"
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <p id="storeName-help" className="mt-2 text-sm text-gray-500">
                  Maximum 100 characters.
                </p>
                {fieldErrors.storeName && (
                  <p id="storeName-error" className="mt-2 text-sm text-red-700">
                    {fieldErrors.storeName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="supportEmail"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Support email
                </label>
                <input
                  id="supportEmail"
                  name="supportEmail"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={settings.supportEmail}
                  onChange={(event) =>
                    updateSetting("supportEmail", event.target.value)
                  }
                  aria-invalid={Boolean(fieldErrors.supportEmail)}
                  aria-describedby={
                    fieldErrors.supportEmail
                      ? "supportEmail-error"
                      : "supportEmail-help"
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <p id="supportEmail-help" className="mt-2 text-sm text-gray-500">
                  Customers can use this address to contact your support team.
                </p>
                {fieldErrors.supportEmail && (
                  <p
                    id="supportEmail-error"
                    className="mt-2 text-sm text-red-700"
                  >
                    {fieldErrors.supportEmail}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
