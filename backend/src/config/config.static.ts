import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export const ReportUrl = 'https://metrics.picsur.org';
export const ReportInterval = 1000 * 60 * 60;
export const EnvPrefix = 'PICSUR_';
export const DefaultName = 'picsur';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const PackageRoot = resolve(__dirname, '../../');
