import { readFile } from 'node:fs/promises';
import path from 'node:path';

const payloadPath = process.argv[2] ?? './examples/sample-cpm.json';
const endpoint = process.argv[3] ?? 'http://localhost:3000/cpm';

async function main() {
  const resolvedPayloadPath = path.resolve(process.cwd(), payloadPath);
  const fileContent = await readFile(resolvedPayloadPath, 'utf8');
  const payload = JSON.parse(fileContent);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  console.log(`Status: ${response.status} ${response.statusText}`);

  try {
    const json = JSON.parse(responseText);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(responseText);
  }

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('CPM test request failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
