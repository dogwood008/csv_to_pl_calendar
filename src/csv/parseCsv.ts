import { parse } from "csv-parse/browser/esm/sync";

export function parseCsv(content: string): string[][] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  return parse(content, {
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    record_delimiter: ["\r\n", "\n", "\r"],
  }) as string[][];
}
