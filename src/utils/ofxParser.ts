import type { RawTransaction } from '@/types'

function parseOFXDate(raw: string): string {
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  const s = raw.replace(/\[.*\]/, '').trim()
  const year = s.slice(0, 4)
  const month = s.slice(4, 6)
  const day = s.slice(6, 8)
  return `${year}-${month}-${day}`
}

function parseSGML(content: string): RawTransaction[] {
  const transactions: RawTransaction[] = []
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]

    const get = (tag: string): string => {
      const m = new RegExp(`<${tag}>([^<\r\n]+)`, 'i').exec(block)
      return m ? m[1].trim() : ''
    }

    const fitid = get('FITID')
    const dtposted = get('DTPOSTED')
    const trnamt = get('TRNAMT')
    const name = get('NAME') || get('MEMO')

    if (!fitid || !dtposted || !trnamt) continue

    transactions.push({
      external_id: fitid,
      date: parseOFXDate(dtposted),
      amount: parseFloat(trnamt),
      label: name
    })
  }

  return transactions
}

function parseXML(content: string): RawTransaction[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'application/xml')
  const stmtTrns = doc.querySelectorAll('STMTTRN')
  const transactions: RawTransaction[] = []

  stmtTrns.forEach(trn => {
    const get = (tag: string) => trn.querySelector(tag)?.textContent?.trim() ?? ''
    const fitid = get('FITID')
    const dtposted = get('DTPOSTED')
    const trnamt = get('TRNAMT')
    const name = get('NAME') || get('MEMO')

    if (!fitid || !dtposted || !trnamt) return

    transactions.push({
      external_id: fitid,
      date: parseOFXDate(dtposted),
      amount: parseFloat(trnamt),
      label: name
    })
  })

  return transactions
}

export function parseOFX(content: string): RawTransaction[] {
  if (content.trimStart().startsWith('OFXHEADER:')) {
    return parseSGML(content)
  }
  return parseXML(content)
}
