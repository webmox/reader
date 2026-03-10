export async function parseFile(file) {
  const name = file.name;
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  const title = name.slice(0, name.lastIndexOf('.')) || name;

  let text = '';

  if (ext === '.txt') {
    text = await readTextFile(file);
  } else if (ext === '.epub') {
    text = await parseEpub(file);
  } else if (ext === '.fb2') {
    text = await readTextFile(file);
    text = parseFb2Text(text);
  } else {
    throw new Error('Неподдерживаемый формат: ' + ext);
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    throw new Error('Файл пустой');
  }

  return { title, words };
}

/**
 * Read text file with encoding auto-detection.
 * Try UTF-8 first, if it contains replacement chars (U+FFFD) — fallback to Windows-1251.
 */
async function readTextFile(file) {
  // Try UTF-8
  let text = await file.text();

  // If no replacement characters, UTF-8 is fine
  if (!text.includes('\uFFFD')) {
    return text;
  }

  // Fallback: try Windows-1251 (common for Russian text files)
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder('windows-1251');
  text = decoder.decode(buffer);

  return text;
}

async function parseEpub(file) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip не загружен');
  }

  const zip = await JSZip.loadAsync(file);

  // Read container.xml to find .opf path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Не удалось прочитать EPUB: container.xml не найден');

  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
  const rootFile = containerDoc.querySelector('rootfile');
  const opfPath = rootFile?.getAttribute('full-path');
  if (!opfPath) throw new Error('Не удалось найти OPF файл');

  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  // Read .opf
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Не удалось прочитать OPF');

  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');

  // Get spine order
  const spineItems = opfDoc.querySelectorAll('spine itemref');
  const manifest = opfDoc.querySelectorAll('manifest item');
  const manifestMap = {};
  manifest.forEach(item => {
    manifestMap[item.getAttribute('id')] = item.getAttribute('href');
  });

  const textParts = [];

  for (const itemRef of spineItems) {
    const idref = itemRef.getAttribute('idref');
    const href = manifestMap[idref];
    if (!href) continue;

    const fullPath = opfDir + href;
    const content = await zip.file(fullPath)?.async('text');
    if (!content) continue;

    const doc = new DOMParser().parseFromString(content, 'text/html');
    const body = doc.body;
    if (body) {
      textParts.push(body.textContent);
    }
  }

  return textParts.join(' ');
}

function parseFb2Text(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const body = doc.querySelector('body');

  if (!body) throw new Error('Не удалось разобрать FB2');

  const paragraphs = body.querySelectorAll('p');
  const parts = [];
  paragraphs.forEach(p => {
    const t = p.textContent.trim();
    if (t) parts.push(t);
  });

  return parts.join(' ');
}
