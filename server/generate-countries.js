const fs = require('fs');
const path = require('path');

// Paths
const sourcePath = path.join(__dirname, '..', 'data', 'countries.json');
const targetPath = path.join(__dirname, '..', 'data', 'countries-simplified.json');

function main() {
  console.log('Reading source file:', sourcePath);

  if (!fs.existsSync(sourcePath)) {
    console.error('Source file not found:', sourcePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(sourcePath, 'utf-8');

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse JSON from', sourcePath);
    console.error(err);
    process.exit(1);
  }

  if (!Array.isArray(data)) {
    console.error('Expected an array in', sourcePath, 'but got', typeof data);
    process.exit(1);
  }

  const seenCodes = new Set();
  const simplified = [];

  for (const item of data) {
    const code = item && item.cca2 ? String(item.cca2).toUpperCase() : null;
    const nameCommon = item && item.name && item.name.common;
    const nameOfficial = item && item.name && item.name.official;

    if (!code) {
      // Skip entries without a 2-letter code
      continue;
    }

    if (seenCodes.has(code)) {
      // Avoid duplicates if any
      continue;
    }

    const name = nameCommon || nameOfficial || code;

    simplified.push({ code, name });
    seenCodes.add(code);
  }

  // Sort by name (basic English collation)
  simplified.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  // Write out with pretty formatting
  fs.writeFileSync(targetPath, JSON.stringify(simplified, null, 2), 'utf-8');

  console.log('Done.');
  console.log('Total source records:', data.length);
  console.log('Simplified records written:', simplified.length);
  console.log('Output file:', targetPath);
}

main();
