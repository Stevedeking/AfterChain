     1|import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
     2|
     3|export default defineWorkersConfig({
     4|	test: {
     5|		watch: false,
     6|		include: ['test/**/*.test.ts'],
     7|		poolOptions: {
     8|			workers: {
     9|				main: './src/worker/index.ts',
    10|				wrangler: {
    11|					configPath: './wrangler.vitest.jsonc',
    12|				},
    13|				miniflare: {
    14|					compatibilityDate: '2026-01-07',
    15|					compatibilityFlags: ['nodejs_compat'],
    16|				},
    17|			},
    18|		},
    19|	},
    20|});
    21|