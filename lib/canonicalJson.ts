const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)])
    );
  }
  return value;
};

/** Serialize JSON values with recursively sorted object keys. */
export const canonicalJson = (value: unknown): string => JSON.stringify(normalize(value));

export const canonicalJsonEqual = (left: unknown, right: unknown): boolean =>
  canonicalJson(left) === canonicalJson(right);
