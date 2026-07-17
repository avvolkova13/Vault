import type {
  SupportCategory,
  SupportDraft,
  SupportDraftErrors,
  SupportDraftInput,
} from "@/types/support";

export const supportCategories: ReadonlyArray<{ value: SupportCategory; label: string }> = [
  { value: "payment", label: "Оплата" },
  { value: "steam", label: "Steam" },
  { value: "skins", label: "Игровые предметы" },
  { value: "refund", label: "Возврат" },
  { value: "other", label: "Другая проблема" },
];

const supportCategoryValues = new Set<SupportCategory>(supportCategories.map((category) => category.value));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function validateSupportDraft(input: SupportDraftInput): SupportDraftErrors {
  const errors: SupportDraftErrors = {};
  if (input.subject.trim().length < 5) errors.subject = "Опишите тему минимум в 5 символах.";
  if (input.message.trim().length < 20) errors.message = "Добавьте детали обращения — минимум 20 символов.";
  return errors;
}

export function normalizeSupportDraft(value: unknown): SupportDraft | null {
  if (!isRecord(value)) return null;
  if (typeof value.category !== "string" || !supportCategoryValues.has(value.category as SupportCategory)) return null;
  if (typeof value.orderId !== "string" || typeof value.subject !== "string" || typeof value.message !== "string") return null;
  if (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return null;

  const draft: SupportDraft = {
    category: value.category as SupportCategory,
    orderId: value.orderId.trim(),
    subject: value.subject.trim(),
    message: value.message.trim(),
    updatedAt: value.updatedAt,
  };
  return Object.keys(validateSupportDraft(draft)).length ? null : draft;
}
