import * as d3 from 'd3';
import type { DataValidationResult, VisualFramework } from './types';

export type RawFormat = 'json' | 'csv';

/**
 * Parses a raw text payload (JSON array/object or CSV table with auto-typed numbers/booleans)
 * and runs it through the active VisualFramework's `validateData` contract.
 */
export function parseAndValidateFrameworkData<TData, TConfig>(
  rawText: string,
  format: RawFormat,
  framework: VisualFramework<TData, TConfig>
): DataValidationResult<TData> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      valid: false,
      errors: ['Data payload is empty. Provide valid JSON or CSV records.'],
    };
  }

  try {
    let parsed: unknown;
    if (format === 'json') {
      parsed = JSON.parse(trimmed);
    } else {
      // Parse CSV with D3 autoType (converts numeric strings, booleans, dates automatically)
      parsed = d3.csvParse(trimmed, d3.autoType);
    }

    return framework.validateData(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [`Failed to parse ${format.toUpperCase()}: ${message}`],
    };
  }
}

/**
 * Serializes a dataset to formatted JSON or CSV for editing in the Data Injection Workbench.
 */
export function serializeFrameworkData<TData>(data: TData, format: RawFormat): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (Array.isArray(data)) {
    return d3.csvFormat(data as Record<string, unknown>[]);
  }

  // If the framework uses a nested object rather than a flat array, fallback to JSON
  return JSON.stringify(data, null, 2);
}
