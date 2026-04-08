     1|import { env, SELF } from 'cloudflare:test';
     2|import { describe, expect, it } from 'vitest';
     3|
     4|describe('webapp worker loader bootstrap', () => {
     5|	it('serves the health endpoint inside a Workers runtime', async () => {
     6|		expect(env).toBeDefined();
     7|
     8|		const response = await SELF.fetch('http://example.com/api/health');
     9|
    10|		expect(response.status).toBe(200);
    11|		await expect(response.json()).resolves.toMatchObject({
    12|			status: 'ok',
    13|		});
    14|	});
    15|
    16|	it('executes worker request handlers with request bodies', async () => {
    17|		const response = await SELF.fetch('http://example.com/api/echo', {
    18|			method: 'POST',
    19|			headers: {
    20|				'content-type': 'application/json',
    21|			},
    22|			body: JSON.stringify({ value: 'loader-check' }),
    23|		});
    24|
    25|		expect(response.status).toBe(200);
    26|		await expect(response.json()).resolves.toMatchObject({
    27|			echo: {
    28|				value: 'loader-check',
    29|			},
    30|		});
    31|	});
    32|});
    33|