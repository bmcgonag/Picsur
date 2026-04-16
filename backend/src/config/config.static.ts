import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const ReportUrl = 'https://metrics.picsur.org';
export const ReportInterval = 1000 * 60 * 60;
export const EnvPrefix = 'PICSUR_';
export const DefaultName = 'picsur';

const mockPackageRoot = '/mock/package/root';

function getPackageRoot(): string {
  try {
    if (typeof import.meta.url !== 'undefined') {
      return resolve(dirname(fileURLToPath(import.meta.url)), '../../');
    }
  } catch {}
  return mockPackageRoot;
}

export const PackageRoot = getPackageRoot();
