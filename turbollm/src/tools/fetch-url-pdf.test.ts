import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFetchUrl } from './builtin'

function smallPdf() {
  const stream = 'BT /F1 12 Tf 20 60 Td (Hello PDF web fetch) Tj ET\\n'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\\nstream\\n${stream}endstream`,
  ]
  let pdf = '%PDF-1.4\\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\\n${objects[i]}\\nendobj\\n`
  }
  const startXref = Buffer.byteLength(pdf)
  pdf += `xref\\n0 ${offsets.length}\\n0000000000 65535 f \\n`
  for (const n of offsets.slice(1)) pdf += `${String(n).padStart(10, '0')} 00000 n \\n`
  pdf += `trailer\\n<< /Size ${offsets.length} /Root 1 0 R >>\\nstartxref\\n${startXref}\\n%%EOF\\n`
  return Buffer.from(pdf)
}

async function withMockFetch(data: Uint8Array | string, contentType: string, callback: () => Promise<void>) {
  const previous = globalThis.fetch
  globalThis.fetch = (async () => new Response(data, { headers: { 'content-type': contentType } })) as typeof fetch
  try { await callback() } finally { globalThis.fetch = previous }
}

test('fetch_url extracts PDF text without decoding binary streams', async () => {
  await withMockFetch(smallPdf(), 'application/pdf', async () => {
    const result = await execFetchUrl({ url: 'http://203.0.113.7/doc.pdf' })
    assert.match(result, /Hello PDF web fetch/)
    assert.match(result, /^Retrieved: /)
  })
})

test('fetch_url can extract PDF from application/octet-stream when URL ends in PDF', async () => {
  await withMockFetch(smallPdf(), 'application/octet-stream', async () => {
    assert.match(await execFetchUrl({ url: 'http://203.0.113.7/doc.pdf' }), /Hello PDF web fetch/)
  })
})

test('fetch_url rejects invalid PDF data with misleading MIME type', async () => {
  await withMockFetch('not a pdf', 'application/pdf', async () => {
    assert.match(await execFetchUrl({ url: 'http://203.0.113.7/doc.pdf' }), /did not return a PDF/)
  })
})

test('fetch_url refuses PDFs over the 2 MiB fetch budget', async () => {
  await withMockFetch(new Uint8Array(2 * 1024 * 1024 + 1), 'application/pdf', async () => {
    assert.match(await execFetchUrl({ url: 'http://203.0.113.7/doc.pdf' }), /exceeds the 2 MiB/)
  })
})
