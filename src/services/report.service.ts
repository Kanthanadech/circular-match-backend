// src/services/report.service.ts
// Generates a production-quality ESG PDF Report using Puppeteer
// The HTML template is rendered headlessly → exported as PDF

import puppeteer from "puppeteer";
import { ESGReportData } from "../types";
import { carbonToCreditValue } from "../utils/carbon";

// ─── HTML Template ────────────────────────────────────────────────────────────
function buildReportHtml(data: ESGReportData): string {
  const { company, period, metrics, matchLog, generatedAt } = data;
  const creditValue = carbonToCreditValue(metrics.totalCarbonSavedKg);

  const tableRows = matchLog
    .map(
      (m, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td>${m.date}</td>
      <td>${m.wasteTitle}</td>
      <td><span class="cat-badge cat-${m.category.toLowerCase()}">${m.category}</span></td>
      <td class="num">${m.weightKg.toFixed(1)}</td>
      <td class="num">${m.distanceKm.toFixed(1)}</td>
      <td class="num green-bold">${m.carbonSavedKg.toFixed(3)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', sans-serif; color: #1a2310; background: #fff; font-size: 11pt; }

  /* PAGE */
  .page { padding: 40px 48px; max-width: 900px; margin: 0 auto; }

  /* HEADER */
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2d6a1f; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-circle { width: 48px; height: 48px; background: #2d6a1f; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
  .brand-name { font-size: 22pt; font-weight: 700; color: #1a2310; letter-spacing: -0.5px; }
  .brand-sub { font-size: 9pt; color: #5a6a50; }
  .report-tag { text-align: right; }
  .report-tag-label { font-size: 9pt; color: #5a6a50; text-transform: uppercase; letter-spacing: 1px; }
  .report-tag-title { font-size: 14pt; font-weight: 700; color: #2d6a1f; }

  /* HERO BANNER */
  .hero-banner { background: #0d1208; color: white; border-radius: 12px; padding: 28px 32px; margin-bottom: 24px; position: relative; overflow: hidden; }
  .hero-watermark { position: absolute; right: 20px; bottom: -20px; font-size: 90pt; font-weight: 900; color: rgba(255,255,255,0.04); line-height: 1; }
  .hero-company { font-size: 9pt; color: #8ec63f; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
  .hero-title { font-size: 20pt; font-weight: 700; margin-bottom: 6px; }
  .hero-period { font-size: 10pt; color: rgba(255,255,255,0.5); }

  /* METRICS */
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric-card { border: 1.5px solid #d0cab8; border-radius: 10px; padding: 16px; text-align: center; }
  .metric-icon { font-size: 20pt; margin-bottom: 6px; }
  .metric-value { font-size: 20pt; font-weight: 700; color: #2d6a1f; line-height: 1; margin-bottom: 4px; }
  .metric-value.amber { color: #c97b1a; }
  .metric-label { font-size: 8pt; color: #5a6a50; line-height: 1.3; }

  /* SECTION TITLE */
  .section-title { font-size: 12pt; font-weight: 700; color: #1a2310; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1.5px solid #e4dfd2; display: flex; align-items: center; gap: 8px; }

  /* TABLE */
  .match-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 24px; }
  .match-table th { background: #0d1208; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 9pt; }
  .match-table th.num, .match-table td.num { text-align: right; }
  .row-even td { background: #fff; }
  .row-odd td { background: #f8f5ef; }
  .match-table td { padding: 9px 12px; border-bottom: 1px solid #e4dfd2; }
  .green-bold { color: #2d6a1f; font-weight: 700; }
  .cat-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 8pt; font-weight: 700; }
  .cat-organic { background: #e8f5e0; color: #2d6a1f; }
  .cat-wood { background: #f5ead0; color: #7a4a10; }
  .cat-oil { background: #fdf0d0; color: #7a5a10; }
  .cat-plastic { background: #d8eef8; color: #1a4a7a; }
  .cat-paper { background: #ede8f5; color: #4a2a7a; }

  /* METHODOLOGY */
  .methodology { background: #f8f5ef; border: 1px solid #d0cab8; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .methodology-title { font-size: 10pt; font-weight: 700; margin-bottom: 8px; }
  .formula-code { background: #0d1208; color: #8ec63f; font-family: 'Courier New', monospace; font-size: 9pt; padding: 10px 14px; border-radius: 6px; line-height: 1.8; }
  .formula-comment { color: rgba(255,255,255,0.3); }

  /* CREDIT BOX */
  .credit-box { background: linear-gradient(135deg, #e8f5e0, #f0fae8); border: 1.5px solid #a8d880; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .credit-label { font-size: 10pt; color: #2d6a1f; font-weight: 600; }
  .credit-value { font-size: 22pt; font-weight: 700; color: #2d6a1f; }
  .credit-rate { font-size: 9pt; color: #5a6a50; }

  /* FOOTER */
  .report-footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #d0cab8; display: flex; justify-content: space-between; font-size: 8pt; color: #8a9a7a; }
  .compliance-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .badge { background: #e8f5e0; color: #2d6a1f; border: 1px solid #a8d880; padding: 3px 10px; border-radius: 4px; font-size: 8pt; font-weight: 600; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <div class="logo-area">
      <div class="logo-circle">♻</div>
      <div>
        <div class="brand-name">CircularMatch</div>
        <div class="brand-sub">Waste-to-Resource Platform</div>
      </div>
    </div>
    <div class="report-tag">
      <div class="report-tag-label">Official Report</div>
      <div class="report-tag-title">ESG Carbon Report</div>
    </div>
  </div>

  <!-- HERO -->
  <div class="hero-banner">
    <div class="hero-watermark">ESG</div>
    <div class="hero-company">GHG Protocol Scope 3 · Category 5 · Carbon Reduction Report</div>
    <div class="hero-title">${company.name}</div>
    <div class="hero-period">รายงานประจำ${period} · สร้างเมื่อ ${generatedAt}</div>
  </div>

  <!-- METRICS -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon">🌿</div>
      <div class="metric-value">${metrics.totalCarbonSavedKg.toFixed(2)}</div>
      <div class="metric-label">kgCO₂e<br>ลดได้สุทธิ</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">♻</div>
      <div class="metric-value">${metrics.totalWasteRecycledKg.toFixed(1)}</div>
      <div class="metric-label">กก. วัสดุ<br>เบี่ยงเบนจากหลุมฝังกลบ</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">🤝</div>
      <div class="metric-value">${metrics.matchesCompleted}</div>
      <div class="metric-label">การจับคู่<br>สำเร็จ</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">💰</div>
      <div class="metric-value amber">฿${creditValue.toLocaleString()}</div>
      <div class="metric-label">มูลค่าคาร์บอนเครดิต<br>โดยประมาณ</div>
    </div>
  </div>

  <!-- CREDIT BOX -->
  <div class="credit-box">
    <div>
      <div class="credit-label">💰 มูลค่าคาร์บอนเครดิต (Thailand Voluntary Carbon Market)</div>
      <div class="credit-rate">อัตรา ฿5.00 / kgCO₂e · มาตรฐาน GHG Protocol Scope 3</div>
    </div>
    <div class="credit-value">฿${creditValue.toLocaleString()}</div>
  </div>

  <!-- MATCH LOG TABLE -->
  <div class="section-title">📋 รายละเอียดการจับคู่ทั้งหมด</div>
  <table class="match-table">
    <thead>
      <tr>
        <th>วันที่</th>
        <th>รายการวัสดุ</th>
        <th>หมวดหมู่</th>
        <th class="num">น้ำหนัก (กก.)</th>
        <th class="num">ระยะทาง (กม.)</th>
        <th class="num">CO₂ ลดได้ (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="6" style="text-align:center;color:#8a9a7a;padding:20px">ยังไม่มีการจับคู่</td></tr>'}
    </tbody>
  </table>

  <!-- METHODOLOGY -->
  <div class="methodology">
    <div class="methodology-title">📐 Carbon Calculation Methodology</div>
    <div class="formula-code"><span class="formula-comment"># GHG Protocol Scope 3 — Category 5 (Waste Generated in Operations)</span>
<span class="formula-comment"># Emission Factors: ORGANIC=0.32 | WOOD=0.58 | OIL=1.20 | PAPER=0.91 | PLASTIC=0.75</span>

landfill_saved  = weight_kg × EF_material
transport_emit  = distance_km × 0.07    <span class="formula-comment"># kgCO₂e/km (3-ton truck)</span>
net_carbon_saved = landfill_saved - transport_emit</div>
  </div>

  <!-- COMPLIANCE -->
  <div class="compliance-badges">
    <span class="badge">✅ GHG Protocol Scope 3</span>
    <span class="badge">✅ Thailand TGO Standard</span>
    <span class="badge">✅ SET Sustainability Report Compatible</span>
    <span class="badge">✅ BOI Green Industry</span>
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    <div>CircularMatch Platform · Powered by KMUTNB · รายงานนี้สร้างอัตโนมัติ</div>
    <div>Generated: ${generatedAt}</div>
  </div>

</div>
</body>
</html>`;
}

// ─── PDF Generation ────────────────────────────────────────────────────────────
export async function generateESGPdf(data: ESGReportData): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",  // Important for Docker/Linux environments
      ],
    });

    const page = await browser.newPage();
    const html = buildReportHtml(data);

    await page.setContent(html, {
      waitUntil: "networkidle0",  // Wait for Google Fonts to load
      timeout: 30_000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}
