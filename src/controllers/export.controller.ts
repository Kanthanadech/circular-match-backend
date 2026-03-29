import { Request, Response } from 'express';
import { Resend } from 'resend';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── สร้าง HTML สำหรับ PDF ───────────────────────────────────────
function buildReportHTML(report: any): string {
  const catRows = Object.entries(report.by_category || {})
    .map(([cat, val]) => `
      <tr>
        <td>${cat}</td>
        <td style="text-align:right;font-weight:700;color:#2d6a1f">${Number(val).toFixed(2)} kg</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; background:#fff; color:#0d1208; font-size:13px; }
  .page { width:794px; padding:48px; }
  .header { background:#0d1208; color:#fff; padding:36px; border-radius:12px; margin-bottom:28px; }
  .kicker { font-size:10px; color:#b5d96a; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .title { font-size:32px; font-weight:700; line-height:1.1; margin-bottom:6px; }
  .subtitle { font-size:12px; color:rgba(255,255,255,.5); }
  .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
  .metric { background:#f5f2ea; border:1.5px solid #d0cab8; border-radius:10px; padding:18px; text-align:center; }
  .metric-val { font-size:26px; font-weight:700; color:#2d6a1f; margin-bottom:4px; }
  .metric-label { font-size:11px; color:#5a6a50; }
  .section { margin-bottom:24px; }
  .section-title { font-size:14px; font-weight:700; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #e4dfd2; }
  table { width:100%; border-collapse:collapse; }
  th { background:#0d1208; color:#fff; padding:9px 12px; text-align:left; font-size:12px; }
  td { padding:8px 12px; border-bottom:1px solid #e4dfd2; font-size:12px; }
  tr:nth-child(even) td { background:#f9f7f2; }
  .credit-box { background:#e8f5e0; border:1.5px solid #b0d890; border-radius:9px; padding:16px; }
  .credit-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; }
  .credit-val { font-weight:700; color:#2d6a1f; }
  .footer { margin-top:32px; padding-top:14px; border-top:1px solid #e4dfd2; font-size:10px; color:#8a9a80; text-align:center; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="kicker">Circular Match · ESG Report · GHG Protocol Scope 3</div>
    <div class="title">Carbon Reduction Impact Report</div>
    <div class="subtitle">${report.company} · ${report.date}</div>
  </div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-val">${report.co2_saved}</div>
      <div class="metric-label">kgCO2e ลดได้สุทธิ</div>
    </div>
    <div class="metric">
      <div class="metric-val">${report.waste_recycled}</div>
      <div class="metric-label">กก. เบี่ยงเบนจากหลุมฝังกลบ</div>
    </div>
    <div class="metric">
      <div class="metric-val">${report.matches_count}</div>
      <div class="metric-label">การจับคู่สำเร็จ</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Carbon Saving by Category</div>
    <table>
      <tr><th>ประเภทวัสดุ</th><th style="text-align:right">CO2 ลดได้</th></tr>
      ${catRows || '<tr><td colspan="2" style="color:#888;text-align:center">ยังไม่มีข้อมูล</td></tr>'}
    </table>
  </div>
  <div class="section">
    <div class="section-title">มูลค่าคาร์บอนเครดิต</div>
    <div class="credit-box">
      <div class="credit-row"><span>Carbon Saved</span><span class="credit-val">${report.co2_saved} kgCO2e</span></div>
      <div class="credit-row"><span>ราคา Thailand VCM</span><span class="credit-val">5.00 บาท / kgCO2e</span></div>
      <div class="credit-row" style="border-top:1px solid #b0d890;padding-top:8px;margin-top:4px">
        <span style="font-weight:700">มูลค่ารวม</span>
        <span class="credit-val" style="font-size:18px">฿${report.carbon_credit_value}</span>
      </div>
    </div>
  </div>
  <div class="footer">
    สร้างโดย Circular Match Platform · ${report.date} · เศรษฐกิจหมุนเวียน
  </div>
</div>
</body></html>`;
}

// ─── POST /api/export/pdf-email ───────────────────────────────────
export async function exportPDFEmail(req: Request, res: Response): Promise<void> {
  const { email, report } = req.body;

  if (!email || !report) {
    res.status(400).json({ error: 'Missing email or report data' });
    return;
  }

  try {
    // ── 1. สร้าง PDF ด้วย Puppeteer ──
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(buildReportHTML(report), { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    // ── 2. ส่ง Email พร้อมแนบ PDF ──
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `ESG Report - Circular Match (${report.date})`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#2d6a1f">ESG Report พร้อมแล้ว</h2>
          <p>สวัสดี <strong>${report.company}</strong></p>
          <p>ESG Carbon Reduction Report ของคุณแนบมาเป็น PDF ด้านล่าง</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <tr style="background:#f5f2ea">
              <td style="padding:10px">CO2 ลดได้</td>
              <td style="padding:10px;font-weight:700;color:#2d6a1f">${report.co2_saved} kgCO2e</td>
            </tr>
            <tr>
              <td style="padding:10px">วัสดุรีไซเคิล</td>
              <td style="padding:10px;font-weight:700">${report.waste_recycled} kg</td>
            </tr>
            <tr style="background:#f5f2ea">
              <td style="padding:10px">มูลค่าคาร์บอน</td>
              <td style="padding:10px;font-weight:700;color:#c97b1a">฿${report.carbon_credit_value}</td>
            </tr>
          </table>
          <p style="font-size:12px;color:#888">Circular Match · เศรษฐกิจหมุนเวียน</p>
        </div>`,
      attachments: [{
        filename: `esg-report-${Date.now()}.pdf`,
        content: Buffer.from(pdfBuffer).toString('base64'),
      }],
    });

    res.json({ success: true, message: 'PDF sent to ' + email });

  } catch (err: any) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: err.message || 'Export failed' });
  }
}