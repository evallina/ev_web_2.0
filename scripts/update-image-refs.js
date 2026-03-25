const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

function updateRefs(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped (not found): ${path.basename(filePath)}`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let updated = raw;
  let count = 0;

  // Replace .png and .jpg/.jpeg references with .webp, but ONLY if the .webp file exists
  updated = updated.replace(/("\/images\/[^"]+)\.(png|jpg|jpeg)"/g, (match, base, ext) => {
    const webpPath = path.join(PUBLIC, `${base.slice(1)}.webp`);  // remove leading /
    if (fs.existsSync(webpPath)) {
      count++;
      return `${base}.webp"`;
    }
    return match;  // keep original if .webp doesn't exist
  });

  if (count > 0) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`  Updated ${count} references in ${path.basename(filePath)}`);
  } else {
    console.log(`  No changes needed in ${path.basename(filePath)}`);
  }
}

console.log('\n=== UPDATING IMAGE REFERENCES ===');
updateRefs(path.join(DATA_DIR, 'projects.json'));
updateRefs(path.join(DATA_DIR, 'philosophyImages.json'));
updateRefs(path.join(DATA_DIR, 'categoryDescriptions.json'));
console.log('\nDone. Original image files are preserved alongside the new .webp files.');
console.log('You can delete the originals later once you confirm everything works.');
