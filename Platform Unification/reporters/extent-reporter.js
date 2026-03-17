import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { createTransport } from 'nodemailer';

const isCI = !!process.env.CI;

class ExtentReporter {
  constructor() {
    this.tests = [];
    this.startTime = null;
    this.endTime = null;
  }

  onBegin(config, suite) {
    this.startTime = new Date();
  }

  onTestEnd(test, result) {
    try {
      const suitePath = test.titlePath().slice(0, -1).join(' › ');
      const annotations = test.annotations || result.annotations || [];
      const warnings = annotations
        .filter(a => a.type === 'warning')
        .map(a => a.description);

      const screenshots = [];
      const alertScreenshots = [];
      const textAttachments = [];

      for (const att of result.attachments || []) {
        const ct = att.contentType || '';
        const safeName = (att.name || 'attachment').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const safeTest = test.title.replace(/[^a-zA-Z0-9_\-]/g, '_');

        if (ct.startsWith('image/')) {
          const fileName = `${safeTest}_${safeName}.png`;
          let imgBuffer = null;
          if (att.body) {
            imgBuffer = att.body;
          } else if (att.path && fs.existsSync(att.path)) {
            imgBuffer = fs.readFileSync(att.path);
          }
          const entry = { name: att.name || 'screenshot', fileName, buffer: imgBuffer };
          if ((att.name || '').startsWith('Alert -')) {
            alertScreenshots.push(entry);
          } else {
            screenshots.push(entry);
          }
        } else if (ct.includes('json') || ct.includes('text')) {
          let text = '';
          if (att.body) {
            text = att.body.toString('utf-8');
          } else if (att.path && fs.existsSync(att.path)) {
            text = fs.readFileSync(att.path, 'utf-8');
          }
          if (text) {
            textAttachments.push({ name: att.name || 'attachment', content: text, contentType: ct });
          }
        }
      }

      const steps = this._flattenSteps(result.steps, 0);

      this.tests.push({
        title: test.title,
        suite: suitePath,
        status: result.status,
        duration: result.duration,
        error: result.error ? { message: result.error.message, stack: result.error.stack } : null,
        steps,
        screenshots,
        alertScreenshots,
        textAttachments,
        warnings,
      });
    } catch (e) {
      console.error('[ExtentReporter] onTestEnd error:', e);
    }
  }

  _flattenSteps(steps, depth) {
    const flat = [];
    for (const s of steps || []) {
      flat.push({
        title: s.title || '',
        category: s.category || '',
        duration: s.duration || 0,
        error: s.error ? s.error.message : null,
        depth,
      });
      flat.push(...this._flattenSteps(s.steps, depth + 1));
    }
    return flat;
  }

  async onEnd(result) {
    this.endTime = new Date();
    const reportDir = path.resolve('extent-report');
    const ssDir = path.join(reportDir, 'screenshots');
    fs.mkdirSync(ssDir, { recursive: true });

    for (const t of this.tests) {
      for (const s of [...t.screenshots, ...t.alertScreenshots]) {
        if (s.buffer) {
          fs.writeFileSync(path.join(ssDir, s.fileName), s.buffer);
        }
      }
    }

    const html = this._generateHTML();
    const cuName = process.env.CUNAME || 'default';
    const envName = process.env.ENVNAME || 'default';
    const timestamp = this.startTime.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportFileName = `Platform_Unification_${cuName}_${envName}_${timestamp}.html`;
    const reportPath = path.join(reportDir, reportFileName);
    fs.writeFileSync(reportPath, html, 'utf-8');

    const historyDir = path.resolve('extent-report-history');
    fs.mkdirSync(historyDir, { recursive: true });
    const histSsDir = path.join(historyDir, 'screenshots');
    if (fs.existsSync(ssDir)) {
      fs.cpSync(ssDir, histSsDir, { recursive: true });
    }
    fs.copyFileSync(reportPath, path.join(historyDir, 'index.html'));

    if (!isCI) {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '""', reportPath], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', [reportPath], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [reportPath], { detached: true, stdio: 'ignore' }).unref();
      }
    }

    const reportEmail = process.env.REPORT_EMAIL;
    if (isCI && reportEmail) {
      await this._sendReportEmail(reportPath, reportEmail);
    }
  }

  _makeEmailSafe(html, reportDir) {
    const cssVars = {
      'var(--bg)': '#0b0e14', 'var(--surface)': '#151921', 'var(--surface2)': '#1c2130',
      'var(--surface3)': '#232a3a', 'var(--border)': '#2a3040', 'var(--border-subtle)': '#222838',
      'var(--text)': '#e6e8f0', 'var(--text-dim)': '#7c8298',
      'var(--pass)': '#34d399', 'var(--pass-bg)': 'rgba(52,211,153,0.08)', 'var(--pass-glow)': 'rgba(52,211,153,0.15)',
      'var(--fail)': '#f87171', 'var(--fail-bg)': 'rgba(248,113,113,0.08)', 'var(--fail-glow)': 'rgba(248,113,113,0.15)',
      'var(--skip)': '#fbbf24', 'var(--skip-bg)': 'rgba(251,191,36,0.08)', 'var(--skip-glow)': 'rgba(251,191,36,0.15)',
      'var(--warn)': '#f59e0b', 'var(--warn-bg)': 'rgba(245,158,11,0.06)', 'var(--warn-glow)': 'rgba(245,158,11,0.12)',
      'var(--accent)': '#818cf8', 'var(--accent-bg)': 'rgba(129,140,248,0.08)',
      'var(--radius)': '14px', 'var(--radius-sm)': '10px',
    };
    for (const [v, val] of Object.entries(cssVars)) {
      html = html.split(v).join(val);
    }

    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<link[^>]*fonts\.googleapis[^>]*>/gi, '');

    html = html.replace(/<details([^>]*)>/gi, '<div$1 style="display:block">');
    html = html.replace(/<\/details>/gi, '</div>');
    html = html.replace(/<summary([^>]*)>([\s\S]*?)<\/summary>/gi,
      '<div$1 style="font-weight:600;margin-bottom:6px">$2</div>');

    html = html.replace(/\sonclick="[^"]*"/gi, '');
    html = html.replace(/cursor:\s*pointer;?/gi, '');

    const inlineAttachments = [];
    html = html.replace(/src="screenshots\/([^"]+)"/g, (match, fileName) => {
      const filePath = path.join(reportDir, 'screenshots', fileName);
      if (fs.existsSync(filePath)) {
        const cid = `img${inlineAttachments.length}@report`;
        inlineAttachments.push({ filename: fileName, path: filePath, cid });
        return `src="cid:${cid}"`;
      }
      return match;
    });

    return { html, inlineAttachments };
  }

  async _sendReportEmail(reportPath, recipients) {
    const sesFrom = 'no-reply@interface.ai';
    const sesRegion = 'us-west-2';
    const sesProfile = 'interface';
    const cuName = process.env.CUNAME || 'N/A';
    const envName = process.env.ENVNAME || 'N/A';
    const subject = `Platform Unification Report - ${cuName}/${envName}`;

    try {
      const reportDir = path.dirname(reportPath);
      const rawHtml = fs.readFileSync(reportPath, 'utf-8');
      const { html: emailHtml, inlineAttachments } = this._makeEmailSafe(rawHtml, reportDir);

      const transporter = createTransport({ streamTransport: true, buffer: true });

      const attachments = [
        ...inlineAttachments,
        { filename: path.basename(reportPath), content: rawHtml, contentType: 'text/html' },
      ];

      const info = await transporter.sendMail({
        from: sesFrom,
        to: recipients,
        subject,
        html: emailHtml,
        attachments,
      });

      const rawBase64 = info.message.toString('base64');
      const cliInput = JSON.stringify({
        Source: sesFrom,
        Destinations: recipients.split(',').map(e => e.trim()),
        RawMessage: { Data: rawBase64 }
      });
      const tmpFile = '/tmp/ses-raw-input.json';
      fs.writeFileSync(tmpFile, cliInput);

      execSync(
        `aws ses send-raw-email --region ${sesRegion} --profile ${sesProfile} ` +
        `--cli-input-json file://${tmpFile}`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      fs.unlinkSync(tmpFile);
      console.log(`[ExtentReporter] Report emailed via SES to: ${recipients}`);
    } catch (err) {
      console.error('[ExtentReporter] Failed to send email via SES:', err.message);
    }
  }

  _generateHTML() {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const warned = this.tests.filter(t => t.status === 'passed' && t.warnings.length > 0).length;
    const totalDurationMs = (this.endTime - this.startTime) || 0;
    const testDurationMs = this.tests.reduce((s, t) => s + t.duration, 0);

    const fmtDuration = (ms) => {
      if (ms < 1000) return `${ms}ms`;
      const s = ms / 1000;
      if (s < 60) return `${s.toFixed(1)}s`;
      const m = Math.floor(s / 60);
      const rem = Math.round(s % 60);
      return `${m}m ${rem}s`;
    };

    const pctPass = total ? ((passed / total) * 100).toFixed(1) : '0.0';
    const pctFail = total ? ((failed / total) * 100).toFixed(1) : '0.0';
    const pctSkip = total ? ((skipped / total) * 100).toFixed(1) : '0.0';

    const startStr = this.startTime.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    const startTimeStr = this.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    const endTimeStr = this.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();

    const suiteMap = new Map();
    for (const t of this.tests) {
      if (!suiteMap.has(t.suite)) suiteMap.set(t.suite, []);
      suiteMap.get(t.suite).push(t);
    }

    let suitesHTML = '';
    for (const [suiteName, tests] of suiteMap) {
      const sp = tests.filter(t => t.status === 'passed').length;
      const sf = tests.filter(t => t.status === 'failed').length;
      const ss = tests.filter(t => t.status === 'skipped').length;
      const sw = tests.filter(t => t.status === 'passed' && t.warnings.length > 0).length;

      let badges = '';
      if (sp) badges += `<span class="badge pass">${sp} passed</span>`;
      if (sf) badges += `<span class="badge fail">${sf} failed</span>`;
      if (ss) badges += `<span class="badge skip">${ss} skipped</span>`;
      if (sw) badges += `<span class="badge warn">${sw} alerts</span>`;

      let testsHTML = '';
      for (const t of tests) {
        const st = t.status === 'passed' ? 'pass' : t.status === 'failed' ? 'fail' : 'skip';
        const hasWarning = t.status === 'passed' && t.warnings.length > 0;
        const statusIcon = st === 'pass' ? '&#10004;' : st === 'fail' ? '&#10008;' : '&#8212;';
        const displayStatus = hasWarning ? 'warn' : st;
        const displayIcon = hasWarning ? '&#9888;' : statusIcon;

        testsHTML += `<tr class="test-row ${st}">
            <td class="status-cell"><span class="status-badge ${displayStatus}">${displayIcon}</span></td>
            <td class="test-name">${this._esc(t.title)}</td>
            <td class="duration">${fmtDuration(t.duration)}</td>
          </tr>
          <tr class="detail-row"><td colspan="3">`;

        if (t.steps.length > 0) {
          testsHTML += `<details class="steps-dropdown">
        <summary class="steps-summary"><svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Test Steps (${t.steps.length})</summary>
        <div class="steps-list">`;
          t.steps.forEach((step, idx) => {
            const stepSt = step.error ? 'fail' : 'pass';
            const stepIcon = step.error ? '&#10008;' : '&#10004;';
            const indent = 16 + step.depth * 16;
            testsHTML += `<div class="step-row ${stepSt}" style="padding-left:${indent}px">
          <span class="step-icon ${stepSt}">${stepIcon}</span>
          <span class="step-num">${idx + 1}.</span>
          <span class="step-title">${this._esc(this._stripAnsi(step.title))}</span>`;
            if (step.category) testsHTML += `<span class="step-category">${this._esc(step.category)}</span>`;
            testsHTML += `<span class="step-dur">${fmtDuration(step.duration)}</span>`;
            if (step.error) {
              testsHTML += `<div class="step-error">${this._esc(this._stripAnsi(step.error))}</div>`;
            }
            testsHTML += `</div>`;
          });
          testsHTML += `</div></details>`;
        }

        if (t.error) {
          testsHTML += `<div class="error-block">
              <div class="error-message">${this._esc(this._stripAnsi(t.error.message))}</div>`;
          if (t.error.stack) {
            testsHTML += `<details class="stack-trace">
                <summary>Stack Trace</summary>
                <pre>${this._esc(this._stripAnsi(t.error.stack))}</pre>
              </details>`;
          }
          testsHTML += `</div>`;
        }

        if (hasWarning) {
          const allAlerts = t.warnings.flatMap(w => w.split('\n')).filter(Boolean);

          const alertsByDash = new Map();
          for (const a of allAlerts) {
            const m = a.match(/^\[([^\]]+)\]\s*(.*)/);
            const dash = m ? m[1] : 'General';
            const msg = m ? m[2] : a;
            if (!alertsByDash.has(dash)) alertsByDash.set(dash, []);
            alertsByDash.get(dash).push(msg);
          }

          testsHTML += `<div class="alert-block">
              <div class="alert-heading">&#9888; Data Alerts (${allAlerts.length} section${allAlerts.length !== 1 ? 's' : ''} with empty data)</div>`;

          for (const [dash, msgs] of alertsByDash) {
            if (alertsByDash.size > 1) {
              testsHTML += `<div class="alert-group-label">${this._esc(dash)}</div>`;
            }
            testsHTML += `<ul class="alert-list">`;
            for (const msg of msgs) {
              const parts = msg.match(/^\[([^\]]+)\]\s*(.*)/);
              if (parts) {
                testsHTML += `<li><span class="alert-tab">${this._esc(parts[1])}</span> ${this._esc(parts[2])}</li>`;
              } else {
                testsHTML += `<li>${this._esc(msg)}</li>`;
              }
            }
            testsHTML += `</ul>`;
          }

          for (const as of t.alertScreenshots) {
            testsHTML += `<details class="screenshot-dropdown" style="margin-top:8px">
                <summary class="screenshot-summary" style="color:var(--warn)"><svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${this._esc(as.name)}</summary>
                <div class="screenshot-wrapper">
                  <img src="screenshots/${as.fileName}" alt="${this._esc(as.name)}" onclick="openModal(this.src)" />
                </div>
              </details>`;
          }
          testsHTML += `</div>`;
        }

        for (const ta of (t.textAttachments || [])) {
          const cleaned = this._stripAnsi(ta.content);
          let formatted = this._esc(cleaned);
          if (ta.contentType.includes('json')) {
            try { formatted = this._esc(JSON.stringify(JSON.parse(cleaned), null, 2)); } catch {}
          }
          testsHTML += `<details class="steps-dropdown" style="margin-top:8px">
              <summary class="steps-summary"><svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${this._esc(ta.name)}</summary>
              <pre class="api-response">${formatted}</pre>
            </details>`;
        }

        const finalSS = t.screenshots.find(s => s.name.includes('test-finished') || s.name === 'screenshot');
        if (finalSS) {
          testsHTML += `<details class="screenshot-dropdown">
              <summary class="screenshot-summary"><svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Final Screenshot</summary>
              <div class="screenshot-wrapper">
                <img src="screenshots/${finalSS.fileName}" alt="Final Screenshot" onclick="openModal(this.src)" />
              </div>
            </details>`;
        }

        testsHTML += `</td></tr>`;
      }

      suitesHTML += `<div class="suite-card">
          <div class="suite-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <svg class="suite-chevron" width="14" height="14" viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div class="suite-title">${this._esc(suiteName)}</div>
            <div class="suite-stats">${badges}</div>
          </div>
          <table class="test-table"><tbody>${testsHTML}</tbody></table>
        </div>`;
    }

    const dashOffset = parseFloat(pctPass);
    const failOffset = parseFloat(pctFail);
    const skipOffset = parseFloat(pctSkip);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Platform Unification Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0b0e14;
    --surface: #151921;
    --surface2: #1c2130;
    --surface3: #232a3a;
    --border: #2a3040;
    --border-subtle: #222838;
    --text: #e6e8f0;
    --text-dim: #7c8298;
    --pass: #34d399;
    --pass-bg: rgba(52,211,153,0.08);
    --pass-glow: rgba(52,211,153,0.15);
    --fail: #f87171;
    --fail-bg: rgba(248,113,113,0.08);
    --fail-glow: rgba(248,113,113,0.15);
    --skip: #fbbf24;
    --skip-bg: rgba(251,191,36,0.08);
    --skip-glow: rgba(251,191,36,0.15);
    --warn: #f59e0b;
    --warn-bg: rgba(245,158,11,0.06);
    --warn-glow: rgba(245,158,11,0.12);
    --accent: #818cf8;
    --accent-bg: rgba(129,140,248,0.08);
    --radius: 14px;
    --radius-sm: 10px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

  /* ── Header ─────────────────────────── */
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    padding: 40px 48px 36px;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 600px 300px at 20% 50%, rgba(99,102,241,0.12), transparent),
      radial-gradient(ellipse 400px 250px at 80% 30%, rgba(52,211,153,0.08), transparent);
    pointer-events: none;
  }
  .header h1 {
    font-size: 26px; font-weight: 700; letter-spacing: -0.5px;
    position: relative;
    background: linear-gradient(135deg, #e2e8f0, #818cf8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .header .subtitle {
    color: var(--text-dim); margin-top: 6px; font-size: 13px; font-weight: 400;
    position: relative;
  }

  /* ── Stat Cards ─────────────────────── */
  .dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
    gap: 14px;
    padding: 28px 48px 20px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 22px 16px 18px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    position: relative;
  }
  .stat-card:hover { transform: translateY(-2px); border-color: var(--border); }
  .stat-card .stat-icon { font-size: 18px; margin-bottom: 6px; opacity: 0.7; }
  .stat-card .value { font-size: 34px; font-weight: 700; line-height: 1.1; letter-spacing: -1px; }
  .stat-card .label {
    font-size: 10.5px; color: var(--text-dim); text-transform: uppercase;
    letter-spacing: 1.2px; margin-top: 8px; font-weight: 500;
  }
  .stat-card.pass .value { color: var(--pass); }
  .stat-card.pass:hover { box-shadow: 0 4px 24px var(--pass-glow); }
  .stat-card.fail .value { color: var(--fail); }
  .stat-card.fail:hover { box-shadow: 0 4px 24px var(--fail-glow); }
  .stat-card.skip .value { color: var(--skip); }
  .stat-card.skip:hover { box-shadow: 0 4px 24px var(--skip-glow); }
  .stat-card.warn .value { color: var(--warn); }
  .stat-card.warn:hover { box-shadow: 0 4px 24px var(--warn-glow); }
  .stat-card.total .value { color: var(--accent); }
  .stat-card.total:hover { box-shadow: 0 4px 24px rgba(129,140,248,0.15); }

  /* ── Progress Bar ───────────────────── */
  .progress-bar-section { padding: 0 48px 22px; }
  .progress-track {
    height: 8px; border-radius: 4px; background: var(--surface2);
    display: flex; overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  .progress-seg { height: 100%; transition: width 0.6s ease; }
  .progress-seg.pass { background: var(--pass); }
  .progress-seg.fail { background: var(--fail); }
  .progress-seg.skip { background: var(--skip); }

  /* ── Chart Section ──────────────────── */
  .chart-section { padding: 0 48px 28px; display: flex; gap: 20px; flex-wrap: wrap; }
  .donut-card {
    background: var(--surface); border: 1px solid var(--border-subtle);
    border-radius: var(--radius); padding: 28px;
    display: flex; align-items: center; gap: 28px; min-width: 320px;
  }
  .donut-wrapper { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
  .donut-wrapper svg { transform: rotate(-90deg); }
  .donut-center {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 24px; font-weight: 700; color: var(--pass);
  }
  .donut-legend { display: flex; flex-direction: column; gap: 12px; }
  .legend-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 500; }
  .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .legend-val { color: var(--text-dim); font-weight: 400; }

  .info-card {
    background: var(--surface); border: 1px solid var(--border-subtle);
    border-radius: var(--radius); padding: 28px; flex: 1; min-width: 260px;
  }
  .info-card h3 {
    font-size: 11px; color: var(--text-dim); text-transform: uppercase;
    letter-spacing: 1.5px; margin-bottom: 16px; font-weight: 600;
  }
  .info-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 0; font-size: 13.5px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .info-row:last-child { border-bottom: none; }
  .info-row .info-label { color: var(--text-dim); font-weight: 400; }
  .info-row .info-value { font-weight: 500; }

  /* ── Content / Suites ───────────────── */
  .content { padding: 0 48px 48px; }
  .content h2 {
    font-size: 18px; margin-bottom: 18px; font-weight: 600;
    color: var(--text-dim); letter-spacing: -0.3px;
  }

  .suite-card {
    background: var(--surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    margin-bottom: 14px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .suite-card:hover { border-color: var(--border); }
  .suite-header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 22px; cursor: pointer; user-select: none;
    transition: background 0.15s;
  }
  .suite-header:hover { background: var(--surface2); }
  .suite-chevron {
    color: var(--text-dim); flex-shrink: 0;
    transition: transform 0.25s ease;
  }
  .suite-card:not(.collapsed) .suite-chevron { transform: rotate(90deg); }
  .suite-title { font-weight: 600; font-size: 14px; flex: 1; }
  .suite-stats { display: flex; gap: 8px; flex-shrink: 0; }
  .badge {
    font-size: 11px; padding: 3px 10px; border-radius: 20px;
    font-weight: 600; letter-spacing: 0.2px;
  }
  .badge.pass { background: var(--pass-bg); color: var(--pass); }
  .badge.fail { background: var(--fail-bg); color: var(--fail); }
  .badge.skip { background: var(--skip-bg); color: var(--skip); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .collapsed .test-table { display: none; }

  /* ── Test Table ─────────────────────── */
  .test-table { width: 100%; border-collapse: collapse; }
  .test-row { transition: background 0.1s; }
  .test-row:hover { background: var(--surface2); }
  .test-row td {
    padding: 13px 22px; border-top: 1px solid var(--border-subtle); font-size: 13.5px;
  }
  .status-cell { width: 44px; text-align: center; }
  .status-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 8px;
    font-size: 14px; font-weight: 700;
  }
  .status-badge.pass { color: var(--pass); background: var(--pass-bg); }
  .status-badge.fail { color: var(--fail); background: var(--fail-bg); }
  .status-badge.skip { color: var(--skip); background: var(--skip-bg); }
  .status-badge.warn { color: var(--warn); background: var(--warn-bg); }
  .test-name { font-weight: 500; }
  .duration {
    color: var(--text-dim); text-align: right; white-space: nowrap;
    width: 85px; font-variant-numeric: tabular-nums; font-size: 12.5px;
  }
  .detail-row td { padding: 0 22px 16px; border: none; }

  /* ── Steps ──────────────────────────── */
  .steps-dropdown { margin-top: 8px; }
  .steps-summary {
    cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--accent);
    padding: 8px 0; user-select: none;
    display: inline-flex; align-items: center; gap: 6px;
    list-style: none;
  }
  .steps-summary::-webkit-details-marker { display: none; }
  .steps-summary:hover { color: #a5b4fc; }
  .steps-summary .chevron-icon { transition: transform 0.2s; }
  details[open] > .steps-summary .chevron-icon { transform: rotate(90deg); }
  .steps-list {
    background: var(--surface2); border-radius: var(--radius-sm);
    padding: 6px 0; margin-top: 6px;
    border: 1px solid var(--border-subtle);
  }
  .step-row {
    display: flex; align-items: baseline; gap: 8px;
    padding: 6px 16px; font-size: 12.5px; line-height: 1.5;
    border-bottom: 1px solid rgba(255,255,255,0.03); flex-wrap: wrap;
    transition: background 0.1s;
  }
  .step-row:last-child { border-bottom: none; }
  .step-row:hover { background: rgba(255,255,255,0.02); }
  .step-icon { font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .step-icon.pass { color: var(--pass); }
  .step-icon.fail { color: var(--fail); }
  .step-num { color: var(--text-dim); font-size: 10.5px; min-width: 26px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .step-title { color: var(--text); word-break: break-word; }
  .step-category {
    font-size: 10px; background: var(--surface3); color: var(--text-dim);
    padding: 2px 7px; border-radius: 4px; white-space: nowrap;
  }
  .step-dur {
    color: var(--text-dim); font-size: 10.5px; margin-left: auto;
    white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums;
  }
  .step-error {
    width: 100%; background: var(--fail-bg); color: var(--fail);
    font-size: 12px; padding: 8px 12px; border-radius: 6px; margin-top: 4px;
    white-space: pre-wrap; word-break: break-word;
    border: 1px solid rgba(248,113,113,0.15);
  }

  /* ── Error Block ────────────────────── */
  .error-block {
    background: var(--fail-bg); border-left: 3px solid var(--fail);
    border-radius: var(--radius-sm); padding: 16px 18px; margin-top: 10px;
  }
  .error-message {
    font-size: 13px; color: var(--fail); font-weight: 500;
    white-space: pre-wrap; word-break: break-word;
  }
  .stack-trace { margin-top: 12px; }
  .stack-trace summary {
    cursor: pointer; font-size: 12px; color: var(--text-dim);
    font-weight: 600; list-style: none;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .stack-trace summary::-webkit-details-marker { display: none; }
  .stack-trace pre {
    font-size: 11px; color: var(--text-dim); margin-top: 8px;
    overflow-x: auto; white-space: pre-wrap; word-break: break-word; line-height: 1.6;
    background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;
  }

  /* ── Alert Block ────────────────────── */
  .alert-block {
    background: var(--warn-bg); border-left: 3px solid var(--warn);
    border-radius: var(--radius-sm); padding: 16px 18px; margin-top: 10px;
  }
  .alert-block .alert-heading {
    font-size: 13px; color: var(--warn); font-weight: 600;
    margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
  }
  .alert-group-label {
    font-size: 11px; font-weight: 600; color: var(--text-dim);
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 8px 0 4px; margin-top: 4px;
    border-top: 1px solid rgba(245,158,11,0.12);
  }
  .alert-group-label:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
  .alert-block .alert-list { list-style: none; padding: 0; margin: 0; }
  .alert-block .alert-list li {
    font-size: 12.5px; color: var(--text); padding: 6px 0 6px 20px;
    border-bottom: 1px solid rgba(245,158,11,0.1);
    position: relative; line-height: 1.45;
  }
  .alert-block .alert-list li::before {
    content: '';
    position: absolute; left: 4px; top: 11px;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--warn); opacity: 0.5;
  }
  .alert-block .alert-list li:last-child { border-bottom: none; }
  .alert-tab {
    display: inline-block; font-size: 10px; font-weight: 600;
    background: rgba(245,158,11,0.15); color: var(--warn);
    padding: 1px 7px; border-radius: 4px; margin-right: 4px;
    vertical-align: 1px;
  }

  /* ── Screenshots ────────────────────── */
  .screenshot-dropdown { margin-top: 10px; }
  .screenshot-summary {
    cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--accent);
    padding: 8px 0; user-select: none;
    display: inline-flex; align-items: center; gap: 6px;
    list-style: none;
  }
  .screenshot-summary::-webkit-details-marker { display: none; }
  .screenshot-summary:hover { color: #a5b4fc; }
  .screenshot-summary .chevron-icon { transition: transform 0.2s; }
  details[open] > .screenshot-summary .chevron-icon { transform: rotate(90deg); }
  .screenshot-wrapper { margin-top: 8px; }
  .screenshot-wrapper img {
    max-width: 520px; width: 100%;
    border-radius: var(--radius-sm); border: 1px solid var(--border);
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
  }
  .screenshot-wrapper img:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .api-response {
    font-size: 11.5px; color: var(--text); margin-top: 8px;
    overflow-x: auto; white-space: pre-wrap; word-break: break-word; line-height: 1.6;
    background: var(--surface2); padding: 14px 16px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle); max-height: 400px; overflow-y: auto;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }

  .trace-link { margin-top: 8px; font-size: 13px; }
  .trace-link a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .trace-link a:hover { text-decoration: underline; }
  .trace-path { display: block; color: var(--text-dim); font-size: 11px; margin-top: 2px; word-break: break-all; }

  /* ── Modal ──────────────────────────── */
  .modal-overlay {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0); z-index: 1000;
    justify-content: center; align-items: center;
    cursor: pointer; transition: background 0.25s;
  }
  .modal-overlay.active { display: flex; background: rgba(0,0,0,0.88); }
  .modal-overlay img {
    max-width: 92%; max-height: 92%; border-radius: var(--radius);
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    transform: scale(0.95); opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  .modal-overlay.active img { transform: scale(1); opacity: 1; }
  .modal-close {
    position: fixed; top: 20px; right: 28px;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; font-size: 20px; cursor: pointer;
    display: none; align-items: center; justify-content: center;
    transition: background 0.15s;
    z-index: 1001;
  }
  .modal-close:hover { background: rgba(255,255,255,0.2); }
  .modal-overlay.active ~ .modal-close { display: flex; }

  /* ── Footer ─────────────────────────── */
  .report-footer {
    text-align: center; padding: 24px 48px 32px;
    border-top: 1px solid var(--border-subtle);
    color: var(--text-dim); font-size: 11.5px;
  }
  .report-footer span { opacity: 0.6; }

  @media (max-width: 768px) {
    .header, .dashboard, .chart-section, .content, .progress-bar-section, .report-footer {
      padding-left: 16px; padding-right: 16px;
    }
    .dashboard { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .chart-section { flex-direction: column; }
    .donut-card { min-width: unset; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>Platform Unification Report</h1>
  <div class="subtitle">${startStr}</div>
</div>

<div class="dashboard">
  <div class="stat-card total"><div class="stat-icon">&#128202;</div><div class="value">${total}</div><div class="label">Total Tests</div></div>
  <div class="stat-card pass"><div class="stat-icon">&#10004;</div><div class="value">${passed}</div><div class="label">Passed</div></div>
  <div class="stat-card fail"><div class="stat-icon">&#10008;</div><div class="value">${failed}</div><div class="label">Failed</div></div>
  <div class="stat-card skip"><div class="stat-icon">&#8212;</div><div class="value">${skipped}</div><div class="label">Skipped</div></div>
  <div class="stat-card warn"><div class="stat-icon">&#9888;</div><div class="value">${warned}</div><div class="label">Alerts</div></div>
  <div class="stat-card total"><div class="stat-icon">&#9201;</div><div class="value">${fmtDuration(totalDurationMs)}</div><div class="label">Duration</div></div>
</div>

<div class="progress-bar-section">
  <div class="progress-track">
    <div class="progress-seg pass" style="width:${pctPass}%"></div>
    <div class="progress-seg fail" style="width:${pctFail}%"></div>
    <div class="progress-seg skip" style="width:${pctSkip}%"></div>
  </div>
</div>

<div class="chart-section">
  <div class="donut-card">
    <div class="donut-wrapper">
      <svg viewBox="0 0 42 42" width="130" height="130">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--surface3)" stroke-width="3" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--pass)" stroke-width="3.2"
          stroke-dasharray="${dashOffset} ${100 - dashOffset}" stroke-dashoffset="0" stroke-linecap="round" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--fail)" stroke-width="3.2"
          stroke-dasharray="${failOffset} ${100 - failOffset}" stroke-dashoffset="${-dashOffset}" stroke-linecap="round" />
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--skip)" stroke-width="3.2"
          stroke-dasharray="${skipOffset} ${100 - skipOffset}" stroke-dashoffset="${-(dashOffset + failOffset)}" stroke-linecap="round" />
      </svg>
      <div class="donut-center">${pctPass}%</div>
    </div>
    <div class="donut-legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--pass)"></div>Passed <span class="legend-val">${pctPass}%</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--fail)"></div>Failed <span class="legend-val">${pctFail}%</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--skip)"></div>Skipped <span class="legend-val">${pctSkip}%</span></div>
    </div>
  </div>

  <div class="info-card">
    <h3>Run Details</h3>
    <div class="info-row"><span class="info-label">Start Time</span><span class="info-value">${startTimeStr}</span></div>
    <div class="info-row"><span class="info-label">End Time</span><span class="info-value">${endTimeStr}</span></div>
    <div class="info-row"><span class="info-label">Total Duration</span><span class="info-value">${fmtDuration(totalDurationMs)}</span></div>
    <div class="info-row"><span class="info-label">Total Test Time</span><span class="info-value">${fmtDuration(testDurationMs)}</span></div>
    <div class="info-row"><span class="info-label">Pass Rate</span><span class="info-value" style="color:var(--pass)">${pctPass}%</span></div>
    <div class="info-row"><span class="info-label">Fail Rate</span><span class="info-value" style="color:var(--fail)">${pctFail}%</span></div>
  </div>
</div>

<div class="content">
  <h2>Test Suites</h2>
  ${suitesHTML}
</div>

<div class="modal-overlay" id="imgModal" onclick="closeModal()">
  <img id="modalImg" src="" alt="Full screenshot" onclick="event.stopPropagation()" />
</div>
<button class="modal-close" id="modalClose" onclick="closeModal()">&times;</button>

<div class="report-footer">
  <span>Generated by Extent Reporter &middot; ${startStr}</span>
</div>

<script>
function openModal(src) {
  const overlay = document.getElementById('imgModal');
  document.getElementById('modalImg').src = src;
  overlay.classList.add('active');
  requestAnimationFrame(() => overlay.style.background = '');
}
function closeModal() {
  document.getElementById('imgModal').classList.remove('active');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>`;
  }

  _stripAnsi(str) {
    return (str || '').replace(/\x1b\[[0-9;]*m/g, '').replace(/\[[\d;]*m/g, '');
  }

  _esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export default ExtentReporter;
