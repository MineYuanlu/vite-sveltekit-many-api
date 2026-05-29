<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';

	let schemaName = $state<string>();
</script>

<h3>Routes</h3>
<div style="display: flex; gap: 0.5rem;">
	{#each ['/openapi.json', '/doc', '/mcp'] as const as path (path)}
		<a
			style="display: block; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #ccc; cursor: pointer;"
			href={resolve(path)}
			target="_blank"
		>
			{path}
		</a>
	{/each}
</div>
<hr />
<h4>JSON Schemas</h4>
{#if browser}
	<div>
		<div style="display: flex; gap: 0.5rem;">
			{#await fetch(resolve('/schema')).then((resp) => resp.json())}
				LOADING
			{:then schemas}
				{#each schemas as schema (schema)}
					<button
						style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #ccc; cursor: pointer;"
						onclick={() => {
							schemaName = schema;
						}}
					>
						{schema}
					</button>
				{/each}
			{/await}
		</div>
		{#if schemaName}
			{#await fetch(resolve('/schema/[name].json', { name: schemaName })).then((resp) => resp.json())}
				LOADING
			{:then schema}
				<pre style="border: 1px solid #ccc; padding: 0.5rem; margin-top: 1rem; white-space: pre-wrap;">{JSON.stringify(
						schema,
						null,
						2,
					)}</pre>
			{/await}
		{/if}
	</div>
{/if}
