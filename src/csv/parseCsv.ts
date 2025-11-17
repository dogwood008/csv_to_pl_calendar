export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentFieldChars: string[] = [];
  let inQuotes = false;

  const flushField = (): string => {
    const field = currentFieldChars.join("");
    currentFieldChars = [];
    return field;
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentFieldChars.push('"');
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(flushField());
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(flushField());
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentFieldChars.push(char);
  }

  const remainingField = flushField();
  if (remainingField.length > 0 || currentRow.length > 0) {
    currentRow.push(remainingField);
    rows.push(currentRow);
  }

  return rows;
}
