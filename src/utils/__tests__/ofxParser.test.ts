import { describe, it, expect } from 'vitest'
import { parseOFX } from '../ofxParser'

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240315
<TRNAMT>-85.50
<FITID>2024031501
<NAME>EDF ELECTRICITE
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240328120000
<TRNAMT>2500.00
<FITID>2024032801
<NAME>SALAIRE MARS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240310[+02:00]
<TRNAMT>-12.99
<FITID>2024031001
<MEMO>NETFLIX ABONNEMENT
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`

const OFX_XML = `<?xml version="1.0" encoding="utf-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240401</DTPOSTED>
            <TRNAMT>-950.00</TRNAMT>
            <FITID>xml-001</FITID>
            <NAME>LOYER AVRIL</NAME>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240402</DTPOSTED>
            <TRNAMT>-45.00</TRNAMT>
            <FITID>xml-002</FITID>
            <NAME>INTERNET FREE</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

describe('parseOFX — format SGML', () => {
  it('détecte le format SGML via OFXHEADER', () => {
    const txs = parseOFX(OFX_SGML)
    expect(txs.length).toBe(3)
  })

  it('parse correctement le montant négatif', () => {
    const txs = parseOFX(OFX_SGML)
    const edf = txs.find(t => t.external_id === '2024031501')
    expect(edf?.amount).toBe(-85.5)
  })

  it('parse correctement le montant positif', () => {
    const txs = parseOFX(OFX_SGML)
    const salaire = txs.find(t => t.external_id === '2024032801')
    expect(salaire?.amount).toBe(2500)
  })

  it('parse la date au format YYYYMMDD', () => {
    const txs = parseOFX(OFX_SGML)
    const edf = txs.find(t => t.external_id === '2024031501')
    expect(edf?.date).toBe('2024-03-15')
  })

  it('parse la date au format YYYYMMDDHHMMSS', () => {
    const txs = parseOFX(OFX_SGML)
    const salaire = txs.find(t => t.external_id === '2024032801')
    expect(salaire?.date).toBe('2024-03-28')
  })

  it('supprime le fuseau horaire [+02:00] de la date', () => {
    const txs = parseOFX(OFX_SGML)
    const netflix = txs.find(t => t.external_id === '2024031001')
    expect(netflix?.date).toBe('2024-03-10')
  })

  it('utilise MEMO si NAME est absent', () => {
    const txs = parseOFX(OFX_SGML)
    const netflix = txs.find(t => t.external_id === '2024031001')
    expect(netflix?.label).toBe('NETFLIX ABONNEMENT')
  })

  it('extrait le FITID comme external_id', () => {
    const txs = parseOFX(OFX_SGML)
    expect(txs.map(t => t.external_id)).toEqual(
      expect.arrayContaining(['2024031501', '2024032801', '2024031001'])
    )
  })

  it('ignore une transaction sans FITID', () => {
    const ofxSansId = OFX_SGML.replace('<FITID>2024031501\n', '')
    const txs = parseOFX(ofxSansId)
    expect(txs.find(t => t.amount === -85.5)).toBeUndefined()
  })

  it('retourne un tableau vide pour un fichier SGML sans transactions', () => {
    const txs = parseOFX('OFXHEADER:100\n<OFX></OFX>')
    expect(txs).toEqual([])
  })
})

describe('parseOFX — format XML', () => {
  it('parse le format XML', () => {
    const txs = parseOFX(OFX_XML)
    expect(txs.length).toBe(2)
  })

  it('parse correctement le montant XML', () => {
    const txs = parseOFX(OFX_XML)
    const loyer = txs.find(t => t.external_id === 'xml-001')
    expect(loyer?.amount).toBe(-950)
    expect(loyer?.label).toBe('LOYER AVRIL')
    expect(loyer?.date).toBe('2024-04-01')
  })

  it('extrait bien les deux transactions XML', () => {
    const txs = parseOFX(OFX_XML)
    expect(txs.map(t => t.external_id)).toEqual(['xml-001', 'xml-002'])
  })
})
