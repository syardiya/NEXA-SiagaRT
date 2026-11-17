// Peringatan dini cuaca BMKG (CAP XML) - sumber resmi, tanpa API key.
// Dokumentasi: https://data.bmkg.go.id/peringatan-dini-cuaca/
// Butuh Node 18+ (fetch bawaan). Tanpa dependensi tambahan.

const BASE = 'https://www.bmkg.go.id/alerts/nowcast/id';
const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };

const decode = (s = '') =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};
const tags = (xml, name) =>
  [...xml.matchAll(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'gi'))].map(m => decode(m[1]));

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'nexa-flood-app/1.0' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`BMKG ${res.status} untuk ${url}`);
  return res.text();
}

// Parser murni (mudah dites tanpa jaringan)
function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => ({
    title: tag(m[1], 'title'),
    link: tag(m[1], 'link'),
    description: tag(m[1], 'description'),
    pubDate: tag(m[1], 'pubDate'),
  }));
}

function parseCap(xml) {
  return {
    event: tag(xml, 'event'),
    severity: tag(xml, 'severity'),
    urgency: tag(xml, 'urgency'),
    certainty: tag(xml, 'certainty'),
    effective: tag(xml, 'effective'),
    expires: tag(xml, 'expires'),
    sender: tag(xml, 'senderName'),
    headline: tag(xml, 'headline'),
    description: tag(xml, 'description'),
    web: tag(xml, 'web'),
    areas: tags(xml, 'areaDesc'),
  };
}

// Ambil peringatan aktif untuk DKI Jakarta. Mengembalikan null jika tidak ada.
async function getJakartaAlert() {
  if (cache.data !== null && Date.now() - cache.at < CACHE_MS) return cache.data;
  const items = parseRss(await getText(BASE));
  const jkt = items.find(i => /jakarta/i.test(i.title + ' ' + i.description));
  let result = null;
  if (jkt && jkt.link) {
    const cap = parseCap(await getText(jkt.link));
    const expired = cap.expires && new Date(cap.expires) < new Date();
    if (!expired) result = { ...cap, sourceUrl: jkt.link, fetchedAt: new Date().toISOString(), source: 'BMKG CAP' };
  }
  cache = { at: Date.now(), data: result };
  return result;
}

export { getJakartaAlert, parseRss, parseCap };
