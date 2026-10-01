import toast from "react-hot-toast";

type ApiMessage = {
  error?: unknown;
  message?: unknown;
};

type ApiToastOptions = {
  success?: string;
  error?: string;
  successTone?: "success" | "error";
};

function getMessage(payload: unknown, preferError: boolean): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const value = payload as ApiMessage;
  const fields = preferError ? [value.error, value.message] : [value.message, value.error];
  const message = fields.find((field) => typeof field === "string" && field.trim());
  return typeof message === "string" ? message : undefined;
}

export async function toastApiResponse(
  response: Response,
  options: ApiToastOptions = {}
): Promise<void> {
  const payload = response.bodyUsed
    ? null
    : await response.clone().json().catch(() => null);
  const message = getMessage(payload, !response.ok);

  if (!response.ok || options.successTone === "error") {
    const fallback = response.ok ? options.success : options.error;
    toast.error(message || fallback || "The request could not be completed.");
  } else {
    toast.success(message || options.success || "Changes saved successfully.");
  }
}

export function toastApiSuccess(message: string): void {
  toast.success(message);
}

export function toastApiFailure(error: unknown, fallback: string): void {
  console.error(fallback, error);
  toast.error(
    error instanceof Error && !(error instanceof TypeError)
      ? error.message
      : fallback
  );
}
