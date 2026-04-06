import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function askAI(messages) {
  const res = await fetch(`${API_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Errore server");
  return data.content?.map(b => b.text || "").join("") || "Errore nella risposta.";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --g: #53FC18; --g-dim: rgba(83,252,24,0.1); --g-border: rgba(83,252,24,0.2);
  --g-glow: rgba(83,252,24,0.25); --bg: #0a0a0a; --s1: #111111; --s2: #161616;
  --s3: #1e1e1e; --s4: #252525; --border: rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.11); --txt: #f2f2f2; --muted: rgba(242,242,242,0.38);
  --muted2: rgba(242,242,242,0.6); --danger: #ff4757; --radius: 16px; --radius-sm: 10px;
}
html { font-size: 16px; }
body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--txt); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--s4); border-radius: 2px; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { 0% { opacity: 0; transform: scale(0.92); } 70% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
@keyframes glow { 0%, 100% { box-shadow: 0 0 16px var(--g-glow); } 50% { box-shadow: 0 0 32px rgba(83,252,24,0.4); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.app { min-height: 100vh; display: flex; flex-direction: column; }
.navbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 12px; padding: 0 16px; height: 56px; background: rgba(10,10,10,0.92); backdrop-filter: blur(24px) saturate(1.8); border-bottom: 1px solid var(--border); }
.nav-logo { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 800; letter-spacing: -0.4px; flex-shrink: 0; cursor: pointer; text-decoration: none; color: var(--txt); }
.nav-logo-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--g); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; animation: glow 3s ease infinite; }
.nav-tabs { display: flex; gap: 2px; flex: 1; justify-content: center; }
.nav-tab { padding: 6px 13px; border-radius: 8px; border: none; background: transparent; color: var(--muted); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: color 0.18s, background 0.18s; white-space: nowrap; }
.nav-tab:hover { color: var(--txt); background: var(--s2); }
.nav-tab.on { color: #000; background: var(--g); }
.nav-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
.user-pill { display: flex; align-items: center; gap: 8px; padding: 4px 10px 4px 4px; background: var(--s2); border: 1px solid var(--border2); border-radius: 30px; font-size: 13px; font-weight: 600; }
.av { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--g), #00c896); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #000; flex-shrink: 0; overflow: hidden; }
.av img { width: 100%; height: 100%; object-fit: cover; }
.av-sm { width: 22px; height: 22px; font-size: 10px; }
.btn-out { padding: 5px 11px; background: transparent; border: 1px solid var(--border2); border-radius: 8px; color: var(--muted2); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
.btn-out:hover { border-color: var(--danger); color: var(--danger); }
.mob-tabs { display: none; overflow-x: auto; gap: 6px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--s1); -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.mob-tabs::-webkit-scrollbar { display: none; }
.mob-tab { flex-shrink: 0; padding: 7px 16px; border-radius: 20px; border: none; background: var(--s3); color: var(--muted2); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
.mob-tab.on { background: var(--g); color: #000; }
.pg-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px; min-height: 100vh; }
.login-wrap { width: 100%; max-width: 380px; }
.login-brand { text-align: center; margin-bottom: 28px; animation: fadeUp 0.4s ease both; }
.login-icon { width: 60px; height: 60px; border-radius: 18px; background: var(--g); margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; animation: float 3s ease infinite, glow 3s ease infinite; }
.login-brand h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
.login-brand p { color: var(--muted); font-size: 14px; margin-top: 5px; }
.card { background: var(--s1); border: 1px solid var(--border2); border-radius: 20px; padding: 26px; box-shadow: 0 24px 64px rgba(0,0,0,0.45); animation: fadeUp 0.4s 0.08s ease both; }
.card h2 { font-size: 17px; font-weight: 800; margin-bottom: 4px; }
.card > p { color: var(--muted); font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
.field { width: 100%; padding: 12px 14px; margin-bottom: 10px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--txt); font-family: inherit; font-size: 14px; font-weight: 500; outline: none; transition: border-color 0.18s, box-shadow 0.18s; -webkit-appearance: none; }
.field:focus { border-color: var(--g-border); box-shadow: 0 0 0 3px rgba(83,252,24,0.07); }
.field::placeholder { color: var(--muted); }
.btn-g { width: 100%; padding: 13px; margin-bottom: 9px; background: var(--g); color: #000; border: none; border-radius: var(--radius-sm); font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer; transition: filter 0.18s, transform 0.18s, box-shadow 0.18s; -webkit-tap-highlight-color: transparent; }
.btn-g:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 6px 22px rgba(83,252,24,0.3); }
.btn-g:active { transform: scale(0.98); }
.btn-g:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost { width: 100%; padding: 12px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--muted2); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.18s; -webkit-tap-highlight-color: transparent; }
.btn-ghost:hover { color: var(--txt); background: var(--s4); }
.login-chips { display: flex; flex-direction: column; gap: 7px; margin-top: 18px; }
.chip { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: var(--s3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--muted2); font-weight: 500; }
.chip-icon { font-size: 16px; }
.main { flex: 1; padding: 20px 16px; }
.wrap { max-width: 1100px; margin: 0 auto; }
.upgrade-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px; margin-bottom: 18px; background: var(--s1); border: 1px solid var(--g-border); border-radius: var(--radius); animation: fadeUp 0.4s ease both; }
.upgrade-bar-text strong { display: block; font-size: 14px; font-weight: 700; color: var(--g); }
.upgrade-bar-text span { font-size: 12px; color: var(--muted); }
.btn-up { flex-shrink: 0; padding: 9px 16px; background: var(--g); color: #000; border: none; border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: filter 0.18s; white-space: nowrap; }
.btn-up:hover { filter: brightness(1.08); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
.stat-card { background: var(--s1); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; transition: border-color 0.2s, transform 0.2s; animation: fadeUp 0.4s ease both; }
.stat-card:hover { border-color: var(--g-border); transform: translateY(-2px); }
.stat-emoji { font-size: 20px; margin-bottom: 10px; display: block; }
.stat-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 5px; }
.stat-val { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 700; color: var(--g); line-height: 1; }
.panel { background: var(--s1); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 12px; animation: fadeUp 0.4s ease both; }
.panel-title { font-size: 13px; font-weight: 700; color: var(--muted2); margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.url-row { display: flex; gap: 8px; }
.url-field { flex: 1; min-width: 0; padding: 9px 12px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--g); font-family: 'JetBrains Mono', monospace; font-size: 11px; outline: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-copy { flex-shrink: 0; padding: 9px 13px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--muted2); font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
.btn-copy:hover, .btn-copy.done { background: var(--g); color: #000; border-color: var(--g); }
.hint-txt { font-size: 11px; color: var(--muted); margin-top: 8px; line-height: 1.4; }
.viewer-list { display: flex; flex-direction: column; gap: 6px; }
.viewer-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--s2); border-radius: var(--radius-sm); border: 1px solid transparent; transition: border-color 0.15s; }
.viewer-row:hover { border-color: var(--border2); }
.vr-rank { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); width: 20px; }
.vr-name { flex: 1; font-size: 13px; font-weight: 600; }
.vr-time { font-size: 11px; color: var(--muted); }
.vr-pts { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--g); }
.rewards-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; animation: fadeUp 0.4s ease both; }
.rewards-hdr h2 { font-size: 17px; font-weight: 800; }
.btn-new { display: flex; align-items: center; gap: 5px; padding: 8px 15px; background: var(--g); color: #000; border: none; border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: filter 0.18s; }
.btn-new:hover { filter: brightness(1.08); }
.rewards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.rcard { background: var(--s1); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; transition: border-color 0.2s, transform 0.2s; animation: fadeUp 0.35s ease both; position: relative; overflow: hidden; }
.rcard::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--g); opacity: 0; transition: opacity 0.2s; }
.rcard:hover { border-color: var(--g-border); transform: translateY(-2px); }
.rcard:hover::before { opacity: 1; }
.rcard.off { opacity: 0.42; }
.rcard-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.rcard-name { font-size: 14px; font-weight: 700; }
.badge { padding: 3px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.badge.on { background: rgba(83,252,24,0.12); color: var(--g); border: 1px solid var(--g-border); }
.badge.off { background: var(--s3); color: var(--muted); border: 1px solid var(--border); }
.rcard-desc { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
.rcard-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.pts { display: flex; align-items: baseline; gap: 3px; }
.pts-n { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: var(--g); }
.pts-l { font-size: 11px; color: var(--muted); }
.rcard-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.rcard-meta { font-size: 10px; color: var(--muted); }
.rcard-btns { display: flex; gap: 5px; }
.btn-xs { padding: 5px 9px; border-radius: 7px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1px solid var(--border2); }
.btn-xs.tog { background: var(--s3); color: var(--muted2); }
.btn-xs.tog:hover { color: var(--txt); }
.btn-xs.del { background: transparent; color: var(--muted); }
.btn-xs.del:hover { border-color: var(--danger); color: var(--danger); }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(10px); z-index: 200; display: flex; align-items: flex-end; justify-content: center; padding: 0; animation: fadeIn 0.2s ease; }
.modal { background: var(--s1); border: 1px solid var(--border2); border-radius: 22px 22px 0 0; padding: 28px 22px 36px; width: 100%; max-width: 480px; animation: slideUp 0.32s cubic-bezier(0.34,1.56,0.64,1); }
.modal-handle { width: 36px; height: 4px; background: var(--s4); border-radius: 2px; margin: 0 auto 20px; }
.modal h3 { font-size: 18px; font-weight: 800; margin-bottom: 18px; }
.field-lbl { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.modal-btns { display: flex; gap: 10px; margin-top: 18px; }
.btn-cancel { flex: 1; padding: 13px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--muted2); font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.18s; }
.btn-cancel:hover { color: var(--txt); }
.analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.big-stat { text-align: center; padding: 24px 16px; }
.big-n { font-family: 'JetBrains Mono', monospace; font-size: 44px; font-weight: 700; color: var(--g); line-height: 1; }
.big-l { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.7px; margin-top: 8px; }
.bar-chart { }
.bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
.bar-mo { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); width: 28px; }
.bar-track { flex: 1; background: var(--s3); border-radius: 4px; height: 7px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #39d400, var(--g)); border-radius: 4px; transition: width 0.8s ease; }
.bar-val { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--g); width: 36px; text-align: right; }
.top-list { display: flex; flex-direction: column; gap: 7px; }
.top-row { display: flex; align-items: center; gap: 9px; padding: 10px 12px; background: var(--s2); border-radius: var(--radius-sm); }
.top-name { flex: 1; font-size: 13px; font-weight: 600; }
.top-bar { width: 55px; background: var(--s4); border-radius: 3px; height: 4px; }
.top-fill { height: 100%; background: var(--g); border-radius: 3px; transition: width 0.8s ease; }
.top-cnt { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--g); font-weight: 700; }
.pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.pcard { background: var(--s1); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; position: relative; transition: transform 0.2s, box-shadow 0.2s; }
.pcard:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.pcard.feat { border-color: var(--g-border); box-shadow: 0 0 0 1px var(--g-border); }
.hot { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--g); color: #000; padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; white-space: nowrap; }
.plan-ico { font-size: 22px; margin-bottom: 10px; }
.plan-name { font-size: 16px; font-weight: 800; margin-bottom: 14px; }
.plan-price { margin-bottom: 20px; }
.plan-amt { font-family: 'JetBrains Mono', monospace; font-size: 30px; font-weight: 700; color: var(--g); }
.plan-per { font-size: 13px; color: var(--muted); }
.plan-feats { list-style: none; margin-bottom: 20px; display: flex; flex-direction: column; gap: 9px; }
.plan-feats li { font-size: 13px; color: var(--muted2); display: flex; align-items: center; gap: 8px; }
.ck { color: var(--g); font-weight: 800; font-size: 12px; }
.btn-plan { width: 100%; padding: 12px; border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.18s; }
.btn-plan.gh { background: var(--s3); border: 1px solid var(--border2); color: var(--txt); }
.btn-plan.gh:hover { background: var(--g); color: #000; border-color: var(--g); }
.btn-plan.sl { background: var(--g); border: none; color: #000; }
.btn-plan.sl:hover { filter: brightness(1.08); box-shadow: 0 4px 18px rgba(83,252,24,0.3); }
.toast { position: fixed; bottom: 86px; left: 50%; transform: translateX(-50%); z-index: 999; background: var(--s1); border: 1px solid var(--border2); color: var(--txt); padding: 11px 18px; border-radius: 30px; font-size: 13px; font-weight: 600; white-space: nowrap; box-shadow: 0 8px 24px rgba(0,0,0,0.4); animation: popIn 0.28s ease; }
.t-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--g); margin-right: 7px; animation: pulse 1.5s infinite; }
.notif-toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; background: var(--g); color: #000; padding: 14px 20px; border-radius: 14px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 24px rgba(83,252,24,0.4); animation: popIn 0.28s ease; }
.ai-fab { position: fixed; bottom: 20px; right: 20px; z-index: 101; width: 50px; height: 50px; border-radius: 50%; border: none; background: var(--g); color: #000; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; box-shadow: 0 4px 20px rgba(83,252,24,0.4); transition: transform 0.2s, background 0.2s; animation: glow 3s ease infinite; }
.ai-fab:hover { transform: scale(1.08); }
.ai-fab.open { background: var(--s2); border: 1px solid var(--border2); animation: none; box-shadow: none; }
.ai-win { position: fixed; bottom: 80px; right: 16px; z-index: 100; width: 320px; max-width: calc(100vw - 32px); background: var(--s1); border: 1px solid var(--border2); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.55); display: flex; flex-direction: column; animation: popIn 0.28s ease; }
.ai-hdr { display: flex; align-items: center; gap: 9px; padding: 13px 15px; background: var(--s2); border-bottom: 1px solid var(--border); }
.ai-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--g); animation: pulse 1.5s infinite; }
.ai-title { font-size: 13px; font-weight: 800; flex: 1; }
.ai-sub { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.ai-msgs { flex: 1; overflow-y: auto; padding: 13px; display: flex; flex-direction: column; gap: 9px; max-height: 260px; min-height: 120px; }
.ai-msgs::-webkit-scrollbar { width: 2px; } .ai-msgs::-webkit-scrollbar-thumb { background: var(--s4); }
.msg { display: flex; gap: 7px; animation: fadeUp 0.25s ease; }
.msg.u { flex-direction: row-reverse; }
.bubble { max-width: 82%; padding: 9px 12px; border-radius: 14px; font-size: 13px; line-height: 1.5; }
.msg.ai .bubble { background: var(--s2); color: var(--txt); border-bottom-left-radius: 4px; }
.msg.u .bubble { background: var(--g); color: #000; font-weight: 600; border-bottom-right-radius: 4px; }
.ai-quick { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 13px 9px; }
.ai-chip { padding: 4px 10px; background: var(--g-dim); border: 1px solid var(--g-border); border-radius: 20px; font-size: 11px; color: var(--g); font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.ai-chip:hover { background: var(--g); color: #000; }
.ai-input-row { display: flex; gap: 7px; padding: 11px 13px; border-top: 1px solid var(--border); }
.ai-field { flex: 1; padding: 9px 12px; background: var(--s3); border: 1px solid var(--border2); border-radius: var(--radius-sm); color: var(--txt); font-family: inherit; font-size: 13px; outline: none; transition: border-color 0.15s; }
.ai-field:focus { border-color: var(--g-border); }
.ai-send { width: 36px; height: 36px; border-radius: 9px; border: none; background: var(--g); color: #000; font-size: 16px; cursor: pointer; transition: filter 0.15s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ai-send:hover { filter: brightness(1.1); }
.ai-send:disabled { opacity: 0.35; cursor: not-allowed; }
.typing { display: flex; gap: 4px; padding: 3px; }
.typing span { width: 5px; height: 5px; background: var(--muted); border-radius: 50%; }
.typing span:nth-child(1) { animation: pulse 1s 0s infinite; }
.typing span:nth-child(2) { animation: pulse 1s 0.18s infinite; }
.typing span:nth-child(3) { animation: pulse 1s 0.36s infinite; }
.vwr-wrap { width: 100%; max-width: 420px; }
.pts-hero { text-align: center; padding: 26px 16px; margin-bottom: 14px; background: var(--s1); border: 1px solid var(--g-border); border-radius: var(--radius); animation: glow 4s ease infinite; }
.pts-hero-n { font-family: 'JetBrains Mono', monospace; font-size: 52px; font-weight: 700; color: var(--g); line-height: 1; }
.vr-list { display: flex; flex-direction: column; gap: 9px; }
.vr-row { display: flex; align-items: center; gap: 13px; padding: 13px 15px; background: var(--s1); border: 1px solid var(--border); border-radius: var(--radius); transition: border-color 0.18s; }
.vr-row:hover { border-color: var(--g-border); }
.vr-info { flex: 1; }
.vr-rname { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.vr-desc { font-size: 12px; color: var(--muted); }
.btn-rd { padding: 9px 14px; border: none; border-radius: var(--radius-sm); font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.18s; white-space: nowrap; flex-shrink: 0; }
.btn-rd.can { background: var(--g); color: #000; }
.btn-rd.can:hover { filter: brightness(1.1); box-shadow: 0 4px 14px rgba(83,252,24,0.3); }
.btn-rd.no { background: var(--s3); color: var(--muted); cursor: not-allowed; }
.rd-msg { padding: 11px 15px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 13px; font-weight: 700; text-align: center; animation: popIn 0.28s ease; }
.rd-msg.ok { background: rgba(83,252,24,0.1); border: 1px solid var(--g-border); color: var(--g); }
.rd-msg.err { background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.25); color: var(--danger); }
.sec-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 10px; }
@media (max-width: 860px) { .two-col, .analytics-grid, .pricing-grid { grid-template-columns: 1fr; } .nav-tabs { display: none; } .mob-tabs { display: flex; } }
@media (max-width: 560px) { .rewards-grid { grid-template-columns: 1fr; } .main { padding: 14px 14px; } .stat-val { font-size: 22px; } .ai-win { right: 10px; bottom: 76px; width: calc(100vw - 20px); } .ai-fab { right: 14px; bottom: 16px; width: 46px; height: 46px; font-size: 20px; } .toast { font-size: 12px; bottom: 76px; } .panel { padding: 15px; } }
`;

let rid = 20;

export default function App() {
  const [page, setPage] = useState("login");
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [uname, setUname] = useState("");
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [newR, setNewR] = useState({ name: "", description: "", points: "" });
  const [toast, setToast] = useState("");
  const [notif, setNotif] = useState("");
  const [copied, setCopied] = useState({});
  const [barsOn, setBarsOn] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  // Viewer
  const [vU, setVU] = useState("");
  const [vS, setVS] = useState("");
  const [vIn, setVIn] = useState(false);
  const [vPts, setVPts] = useState(0);
  const [vRewards, setVRewards] = useState([]);
  const [rdMsg, setRdMsg] = useState(null);
  const [vLoading, setVLoading] = useState(false);
  // AI
  const [aiOpen, setAiOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ r: "ai", t: "Ciao! 👋 Sono il tuo assistente AI per KickLoyalty. Chiedimi idee per rewards, strategie di engagement o come usare al meglio la piattaforma!" }]);
  const [aiIn, setAiIn] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const msgsEl = useRef(null);

  const toast$ = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2800); }, []);
  const notif$ = useCallback((m) => { setNotif(m); setTimeout(() => setNotif(""), 5000); }, []);

  useEffect(() => { if (tab === "analytics") setTimeout(() => setBarsOn(true), 120); else setBarsOn(false); }, [tab]);
  useEffect(() => { if (msgsEl.current) msgsEl.current.scrollTop = msgsEl.current.scrollHeight; }, [msgs]);

  // Check URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const upgrade = urlParams.get("upgrade");
    const viewerParam = urlParams.get("viewer");
    const streamerParam = urlParams.get("streamer");

    if (viewerParam) {
      setPage("viewer");
      if (streamerParam) setVS(streamerParam);
      return;
    }
    if (upgrade === "success") { toast$("🎉 Piano Pro attivato!"); window.history.replaceState({}, "", "/"); }
    else if (upgrade === "cancelled") { window.history.replaceState({}, "", "/"); }

    if (code) {
      setLoading(true);
      axios.post(`${API_URL}/auth/kick/callback`, { code, state })
        .then(res => { setUser(res.data.user); setPage("app"); loadData(res.data.user); window.history.replaceState({}, "", "/"); })
        .catch(err => alert("Errore login: " + err.message))
        .finally(() => setLoading(false));
    }
  }, []);

  // Polling every 10s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadDataSilent(), 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async (u) => {
    const currentUser = u || user;
    if (!currentUser) return;
    try {
      const [rRes, sRes, aRes] = await Promise.all([
        axios.get(`${API_URL}/rewards`),
        axios.get(`${API_URL}/stats`),
        axios.get(`${API_URL}/analytics`)
      ]);
      setRewards(rRes.data);
      setStats(sRes.data);
      setAnalytics(aRes.data);
      // Load leaderboard
      try {
        const lRes = await axios.get(`${API_URL}/viewer-points/leaderboard/${currentUser.username}`);
        setLeaderboard(lRes.data);
      } catch (e) {}
    } catch (e) { console.error(e); }
  };

  const loadDataSilent = async () => {
    try {
      const sRes = await axios.get(`${API_URL}/stats`);
      setStats(prev => {
        if (prev && sRes.data.rewardsRedeemed > prev.rewardsRedeemed) {
          notif$(`🎁 Nuovo reward riscattato da uno spettatore!`);
        }
        return sRes.data;
      });
    } catch (e) {}
  };

  const login = async () => {
    if (!uname.trim()) {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/auth/kick/url`);
        window.location.href = res.data.url;
      } catch (e) { alert("Errore connessione server"); setLoading(false); }
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username: uname.trim() });
      setUser(res.data.user);
      setPage("app");
      setTab("dashboard");
      loadData(res.data.user);
    } catch (e) { alert("Errore durante il login"); }
    finally { setLoading(false); }
  };

  const logout = () => { setUser(null); setPage("login"); setUname(""); setRewards([]); setStats(null); };

  const handleUpgrade = async () => {
    if (!user?.id) return;
    setUpgradeLoading(true);
    try {
      const res = await axios.post(`${API_URL}/stripe/create-checkout`, { userId: user.id });
      window.location.href = res.data.url;
    } catch (e) { alert("Errore checkout: " + e.message); }
    finally { setUpgradeLoading(false); }
  };

  const copy$ = (k, v) => {
    navigator.clipboard.writeText(v).catch(() => {});
    setCopied(p => ({ ...p, [k]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [k]: false })), 2000);
    toast$("📋 URL copiato!");
  };

  const createReward = async () => {
    if (!newR.name || !newR.points) return;
    try {
      const res = await axios.post(`${API_URL}/rewards`, { ...newR, points: parseInt(newR.points), active: true, type: "custom" });
      setRewards(rs => [res.data, ...rs]);
      setModal(false); setNewR({ name: "", description: "", points: "" });
      toast$("🎁 Reward creato!");
    } catch (e) { toast$("❌ Errore nella creazione"); }
  };

  const updateReward = async () => {
    if (!editModal) return;
    try {
      const res = await axios.put(`${API_URL}/rewards/${editModal.id || editModal._id}`, editModal);
      setRewards(rs => rs.map(r => (r.id || r._id) === (editModal.id || editModal._id) ? res.data : r));
      setEditModal(null); toast$("✅ Reward aggiornato!");
    } catch (e) { toast$("❌ Errore nell'aggiornamento"); }
  };

  const toggleR = async (r) => {
    try {
      const id = r.id || r._id;
      const res = await axios.put(`${API_URL}/rewards/${id}`, { ...r, active: !r.active });
      setRewards(rs => rs.map(x => (x.id || x._id) === id ? res.data : x));
    } catch (e) {}
  };

  const delR = async (id) => {
    if (!confirm("Elimina questo reward?")) return;
    try {
      await axios.delete(`${API_URL}/rewards/${id}`);
      setRewards(rs => rs.filter(r => (r.id || r._id) !== id));
      toast$("🗑️ Reward eliminato!");
    } catch (e) {}
  };

  // Viewer login
  const viewerLogin = async () => {
    if (!vU || !vS) return;
    setVLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        axios.post(`${API_URL}/auth/login`, { username: vU.trim() }),
        axios.get(`${API_URL}/rewards`)
      ]);
      // Get viewer points
      try {
        const ptRes = await axios.get(`${API_URL}/viewer-points/${vU.trim()}/${vS.trim()}`);
        setVPts(ptRes.data.points || 0);
      } catch (e) { setVPts(0); }
      setVRewards(rRes.data);
      setVIn(true);
    } catch (e) { alert("Errore login spettatore"); }
    finally { setVLoading(false); }
  };

  const redeem = async (r) => {
    const id = r.id || r._id;
    if (vPts < r.points) {
      setRdMsg({ ok: false, t: `❌ Punti insufficienti (hai ${vPts} pt, servono ${r.points} pt)` });
      setTimeout(() => setRdMsg(null), 3000); return;
    }
    try {
      await axios.post(`${API_URL}/rewards/${id}/redeem`, { viewerUsername: vU, streamerUsername: vS });
      setVPts(p => p - r.points);
      setRdMsg({ ok: true, t: `🎉 "${r.name}" riscattato!` });
      setTimeout(() => setRdMsg(null), 3000);
    } catch (e) {
      setRdMsg({ ok: false, t: "❌ Errore nel riscatto" });
      setTimeout(() => setRdMsg(null), 3000);
    }
  };

  const sendAI = async (override) => {
    const txt = override || aiIn.trim();
    if (!txt || aiLoad) return;
    setAiIn("");
    const next = [...msgs, { r: "u", t: txt }];
    setMsgs(next);
    setAiLoad(true);
    try {
      const apiMsgs = next.slice(1).map(m => ({ role: m.r === "ai" ? "assistant" : "user", content: m.t }));
      const reply = await askAI(apiMsgs);
      setMsgs(p => [...p, { r: "ai", t: reply }]);
    } catch { setMsgs(p => [...p, { r: "ai", t: "Errore di connessione. Riprova!" }]); }
    setAiLoad(false);
  };

  const isPro = user?.plan === "pro";
  const wUrl = `${window.location.origin}/widget?user=${user?.username}`;
  const vUrl = `${window.location.origin}?viewer=1&streamer=${user?.username}`;
  const maxPts = Math.max(...(analytics?.pointsByMonth || []).map(m => m.points), 1);
  const maxR = Math.max(...rewards.map(r => r.redeemedCount || 0), 1);
  const quick = ["💡 Idee per rewards", "📈 Come aumentare engagement", "🎯 Struttura punti ideale", "🚀 Come promuovere KickLoyalty"];
  const TABS = [["dashboard","📊 Dashboard"],["analytics","📈 Analytics"],["pricing","💎 Pricing"]];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {toast && <div className="toast"><span className="t-dot"/>{toast}</div>}
        {notif && <div className="notif-toast">{notif}</div>}

        {/* VIEWER */}
        {page === "viewer" && (
          <div className="pg-center">
            <div className="vwr-wrap">
              <div className="login-brand" style={{animation:"fadeUp 0.4s ease both"}}>
                <div className="login-icon">🎮</div>
                <h1>Kick Loyalty</h1>
                <p>Pagina Spettatori</p>
              </div>
              {!vIn ? (
                <div className="card">
                  <h2>👀 Entra come Spettatore</h2>
                  <p>Visualizza i tuoi punti e riscatta rewards</p>
                  <input className="field" placeholder="Il tuo username Kick" value={vU} onChange={e=>setVU(e.target.value)} />
                  <input className="field" placeholder="Username dello streamer" value={vS} onChange={e=>setVS(e.target.value)} onKeyPress={e=>e.key==="Enter"&&viewerLogin()} />
                  <button className="btn-g" onClick={viewerLogin} disabled={vLoading}>{vLoading ? "⏳ Caricamento..." : "🚀 Entra"}</button>
                  <button className="btn-ghost" onClick={()=>setPage("login")}>← Sei uno streamer? Vai al login</button>
                </div>
              ) : (
                <div style={{animation:"fadeUp 0.35s ease both"}}>
                  <div className="pts-hero">
                    <div className="sec-title" style={{color:"var(--muted)",marginBottom:6}}>I TUOI PUNTI</div>
                    <div className="pts-hero-n">⭐ {vPts.toLocaleString()}</div>
                    <div style={{fontSize:13,color:"var(--muted)",marginTop:8}}>
                      Ciao <b style={{color:"var(--txt)"}}>{vU}</b> · Stream di <b style={{color:"var(--txt)"}}>{vS}</b>
                    </div>
                  </div>
                  {rdMsg && <div className={`rd-msg ${rdMsg.ok?"ok":"err"}`}>{rdMsg.t}</div>}
                  <div className="sec-title">Rewards Disponibili</div>
                  <div className="vr-list">
                    {vRewards.filter(r=>r.active).map(r=>(
                      <div className="vr-row" key={r.id||r._id}>
                        <div className="vr-info">
                          <div className="vr-rname">{r.name}</div>
                          <div className="vr-desc">{r.description}</div>
                        </div>
                        <button className={`btn-rd ${vPts>=r.points?"can":"no"}`} onClick={()=>redeem(r)}>
                          {r.points.toLocaleString()} pt
                        </button>
                      </div>
                    ))}
                    {vRewards.filter(r=>r.active).length === 0 && (
                      <div style={{textAlign:"center",color:"var(--muted)",padding:40}}>Nessun reward disponibile</div>
                    )}
                  </div>
                  <button onClick={()=>setVIn(false)} style={{marginTop:20,background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13}}>← Logout</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGIN */}
        {page === "login" && (
          <div className="pg-center">
            <div className="login-wrap">
              <div className="login-brand">
                <div className="login-icon">🎮</div>
                <h1>Kick Loyalty</h1>
                <p>Sistema di Rewards per il Tuo Stream</p>
              </div>
              <div className="card">
                <h2>Accedi alla Dashboard</h2>
                <p>Gestisci rewards, punti e fidelizza la tua community</p>
                <input className="field" placeholder="Username Kick (opzionale)" value={uname} onChange={e=>setUname(e.target.value)} onKeyPress={e=>e.key==="Enter"&&login()} />
                <button className="btn-g" onClick={login} disabled={loading}>{loading?"⏳ Caricamento...":"🟢 Entra nella Dashboard"}</button>
                <button className="btn-ghost" onClick={()=>setPage("viewer")}>👀 Sei uno spettatore? Clicca qui</button>
                <div className="login-chips">
                  {[["⭐","Rewards Personalizzati"],["📊","Analytics Real-time"],["🤖","AI Assistant"]].map(([i,l])=>(
                    <div className="chip" key={l}><span className="chip-icon">{i}</span><span>{l}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APP */}
        {page === "app" && user && (
          <>
            <nav className="navbar">
              <a className="nav-logo" href="https://kick-loyalty-app.vercel.app/landing.html">
                <div className="nav-logo-mark">🎮</div>
                <span>Kick Loyalty</span>
              </a>
              <div className="nav-tabs">
                {TABS.map(([k,l])=>(
                  <button key={k} className={`nav-tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
                ))}
              </div>
              <div className="nav-right">
                <div className="user-pill">
                  {user.avatarUrl ? <div className="av"><img src={user.avatarUrl} alt="" /></div> : <div className="av">{(user.displayName||user.username||"U")[0].toUpperCase()}</div>}
                  <span style={{fontSize:13,fontWeight:700}}>{user.displayName||user.username}</span>
                  {isPro && <span style={{background:"var(--g)",color:"#000",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700}}>PRO</span>}
                </div>
                <button className="btn-out" onClick={logout}>Esci</button>
              </div>
            </nav>

            <div className="mob-tabs">
              {TABS.map(([k,l])=>(
                <button key={k} className={`mob-tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
              ))}
            </div>

            <div className="main">
              <div className="wrap">

                {/* DASHBOARD */}
                {tab === "dashboard" && (
                  <>
                    {!isPro && (
                      <div className="upgrade-bar">
                        <div className="upgrade-bar-text">
                          <strong>🚀 Passa a KickLoyalty Pro</strong>
                          <span>Rewards illimitati · Analytics avanzate · €19/mese</span>
                        </div>
                        <button className="btn-up" onClick={handleUpgrade} disabled={upgradeLoading}>
                          {upgradeLoading?"⏳...":"💎 Upgrade"}
                        </button>
                      </div>
                    )}

                    <div className="stats-grid">
                      {[["👥","TOTAL VIEWERS",stats?.totalViewers||0],["⭐","ACTIVE MEMBERS",stats?.activeMembers||0],["🎯","TOTAL POINTS",stats?.totalPoints||0],["🎁","REWARDS REDEEMED",stats?.rewardsRedeemed||0]].map(([ic,lb,vl],i)=>(
                        <div className="stat-card" style={{animationDelay:`${i*0.05}s`}} key={lb}>
                          <span className="stat-emoji">{ic}</span>
                          <div className="stat-label">{lb}</div>
                          <div className="stat-val">{vl.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>

                    <div className="two-col">
                      <div className="panel">
                        <div className="panel-title">🎮 Widget OBS</div>
                        <p style={{fontSize:13,color:"var(--muted)",marginBottom:12,lineHeight:1.5}}>Aggiungi come Browser Source in OBS per notifiche live in tempo reale.</p>
                        <div className="url-row">
                          <input className="url-field" readOnly value={wUrl} />
                          <button className={`btn-copy ${copied.w?"done":""}`} onClick={()=>copy$("w",wUrl)}>{copied.w?"✅":"📋"}</button>
                        </div>
                        <p className="hint-txt">💡 OBS → Fonti → + → Browser → 400×300px</p>
                      </div>
                      <div className="panel">
                        <div className="panel-title">👀 Link Spettatori</div>
                        <p style={{fontSize:13,color:"var(--muted)",marginBottom:12,lineHeight:1.5}}>Condividi in chat — i tuoi spettatori vedono punti e riscattano rewards.</p>
                        <div className="url-row">
                          <input className="url-field" readOnly value={vUrl} />
                          <button className={`btn-copy ${copied.v?"done":""}`} onClick={()=>copy$("v",vUrl)}>{copied.v?"✅":"📋"}</button>
                        </div>
                        <p className="hint-txt">💡 Incolla in descrizione o in chat durante la live</p>
                      </div>
                    </div>

                    {leaderboard.length > 0 && (
                      <div className="panel">
                        <div className="panel-title">🏆 Top Viewers per Punti</div>
                        <div className="viewer-list">
                          {leaderboard.map((v,i)=>(
                            <div className="viewer-row" key={v.viewerUsername}>
                              <span className="vr-rank">#{i+1}</span>
                              <div className="av av-sm">{v.viewerUsername[0].toUpperCase()}</div>
                              <span className="vr-name">{v.viewerUsername}</span>
                              <span className="vr-pts">{v.points.toLocaleString()} pt</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rewards-hdr">
                      <h2>🎁 Gestione Rewards</h2>
                      <button className="btn-new" onClick={()=>setModal(true)}><span style={{fontSize:16}}>+</span> Nuovo</button>
                    </div>
                    <div className="rewards-grid">
                      {rewards.map((r,i)=>(
                        <div className={`rcard ${r.active?"":"off"}`} key={r.id||r._id} style={{animationDelay:`${i*0.04}s`}}>
                          <div className="rcard-top">
                            <span className="rcard-name">{r.name}</span>
                            <span className={`badge ${r.active?"on":"off"}`}>{r.active?"Attivo":"Disattivo"}</span>
                          </div>
                          <p className="rcard-desc">{r.description}</p>
                          <div className="rcard-foot">
                            <div className="pts"><span className="pts-n">{r.points.toLocaleString()}</span><span className="pts-l">pt</span></div>
                            <div className="rcard-actions">
                              <span className="rcard-meta">{r.redeemedCount||0} riscatti</span>
                              <div className="rcard-btns">
                                <button className="btn-xs tog" onClick={()=>setEditModal({...r})}>✏️</button>
                                <button className="btn-xs tog" onClick={()=>toggleR(r)}>{r.active?"Disattiva":"Attiva"}</button>
                                <button className="btn-xs del" onClick={()=>delR(r.id||r._id)}>🗑️</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ANALYTICS */}
                {tab === "analytics" && (
                  <>
                    <div style={{marginBottom:18}}>
                      <div style={{fontSize:20,fontWeight:800,marginBottom:3,animation:"fadeUp 0.4s ease both"}}>📈 Analytics Dashboard</div>
                      <div style={{fontSize:13,color:"var(--muted)",animation:"fadeUp 0.4s 0.05s ease both"}}>Statistiche e metriche reali del tuo sistema loyalty</div>
                    </div>
                    <div className="analytics-grid">
                      <div className="panel" style={{animationDelay:"0.05s"}}>
                        <div className="panel-title">📊 Nuovi Utenti per Mese</div>
                        <div className="bar-chart">
                          {(analytics?.pointsByMonth||[]).map(m=>(
                            <div className="bar-row" key={m.month}>
                              <span className="bar-mo">{m.month}</span>
                              <div className="bar-track"><div className="bar-fill" style={{width:barsOn?`${(m.points/maxPts)*100}%`:"0%"}}/></div>
                              <span className="bar-val">{m.points>999?(m.points/1000).toFixed(1)+"k":m.points}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="panel" style={{animationDelay:"0.08s"}}>
                        <div className="panel-title">🏆 Top Rewards</div>
                        <div className="top-list">
                          {(analytics?.topRewards||rewards.slice(0,5)).map(r=>(
                            <div className="top-row" key={r.name||r.id}>
                              <span className="top-name">{r.name}</span>
                              <div className="top-bar"><div className="top-fill" style={{width:barsOn?`${((r.count||r.redeemedCount||0)/maxR)*100}%`:"0%"}}/></div>
                              <span className="top-cnt">{r.count||r.redeemedCount||0}×</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {[["Viewer Totali",stats?.totalViewers||0],["Rewards Attivi",rewards.filter(r=>r.active).length]].map(([l,v],i)=>(
                        <div className="panel" key={l} style={{animationDelay:`${0.1+i*0.04}s`}}>
                          <div className="big-stat">
                            <div className="big-n">{v.toLocaleString()}</div>
                            <div className="big-l">{l}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* PRICING */}
                {tab === "pricing" && (
                  <>
                    <div style={{textAlign:"center",marginBottom:28,animation:"fadeUp 0.4s ease both"}}>
                      <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>💎 Scegli il Tuo Piano</div>
                      <div style={{fontSize:13,color:"var(--muted)"}}>Trova il piano perfetto per la tua community</div>
                    </div>
                    <div className="pricing-grid">
                      {[
                        {ico:"🌱",name:"Starter",amt:"GRATIS",per:"",cls:"gh",feats:["Fino a 100 viewers","5 rewards personalizzati","Dashboard analytics","Widget OBS base","Login con Kick OAuth"]},
                        {ico:"🚀",name:"Pro",amt:"€19",per:"/mese",cls:"sl",feat:true,feats:["Viewers illimitati","Rewards illimitati","Analytics avanzate","Widget OBS Pro","Priority support"]},
                        {ico:"⚡",name:"Enterprise",amt:"Custom",per:"",cls:"gh",feats:["Tutto del Pro","White-label","API dedicate","Onboarding personale","24/7 support"]},
                      ].map((p,i)=>(
                        <div className={`pcard ${p.feat?"feat":""}`} key={p.name} style={{animationDelay:`${i*0.06}s`,animation:"fadeUp 0.4s ease both"}}>
                          {p.feat && <div className="hot">🔥 PIÙ POPOLARE</div>}
                          <div className="plan-ico">{p.ico}</div>
                          <div className="plan-name">{p.name}</div>
                          <div className="plan-price"><span className="plan-amt">{p.amt}</span><span className="plan-per">{p.per}</span></div>
                          <ul className="plan-feats">{p.feats.map(f=><li key={f}><span className="ck">✓</span>{f}</li>)}</ul>
                          <button className={`btn-plan ${p.cls}`} onClick={p.feat&&!isPro?handleUpgrade:()=>window.open("mailto:info@kickloyalty.com")}>
                            {p.feat?(isPro?"✅ Piano Attuale":upgradeLoading?"⏳...":"💳 Upgrade a Pro"):p.name==="Starter"?(isPro?"Downgrade":"✅ Piano Attuale"):"Contattaci"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* AI FAB */}
            <button className={`ai-fab ${aiOpen?"open":""}`} onClick={()=>setAiOpen(o=>!o)}>
              {aiOpen ? "✕" : "🤖"}
            </button>

            {/* AI WINDOW */}
            {aiOpen && (
              <div className="ai-win">
                <div className="ai-hdr">
                  <div className="ai-dot"/>
                  <span className="ai-title">AI Assistant</span>
                  <span className="ai-sub">Claude</span>
                </div>
                <div className="ai-msgs" ref={msgsEl}>
                  {msgs.map((m,i)=>(
                    <div className={`msg ${m.r}`} key={i}>
                      {m.r==="ai" && <div className="av av-sm" style={{flexShrink:0,alignSelf:"flex-start"}}>🤖</div>}
                      <div className="bubble">{m.t}</div>
                    </div>
                  ))}
                  {aiLoad && (
                    <div className="msg ai">
                      <div className="av av-sm" style={{flexShrink:0,alignSelf:"flex-start"}}>🤖</div>
                      <div className="bubble"><div className="typing"><span/><span/><span/></div></div>
                    </div>
                  )}
                </div>
                {msgs.length < 3 && (
                  <div className="ai-quick">
                    {quick.map(q=><button key={q} className="ai-chip" onClick={()=>sendAI(q)}>{q}</button>)}
                  </div>
                )}
                <div className="ai-input-row">
                  <input className="ai-field" placeholder="Chiedimi qualcosa..." value={aiIn} onChange={e=>setAiIn(e.target.value)} onKeyPress={e=>e.key==="Enter"&&sendAI()} />
                  <button className="ai-send" onClick={()=>sendAI()} disabled={aiLoad||!aiIn.trim()}>➤</button>
                </div>
              </div>
            )}

            {/* MODAL NUOVO REWARD */}
            {modal && (
              <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
                <div className="modal">
                  <div className="modal-handle"/>
                  <h3>➕ Nuovo Reward</h3>
                  <div className="field-lbl">Nome</div>
                  <input className="field" placeholder="es. 🎯 Shoutout in Live" value={newR.name} onChange={e=>setNewR(p=>({...p,name:e.target.value}))} />
                  <div className="field-lbl">Descrizione</div>
                  <input className="field" placeholder="Cosa ottiene lo spettatore?" value={newR.description} onChange={e=>setNewR(p=>({...p,description:e.target.value}))} />
                  <div className="field-lbl">Punti Richiesti</div>
                  <input className="field" type="number" placeholder="es. 500" value={newR.points} onChange={e=>setNewR(p=>({...p,points:e.target.value}))} />
                  <div className="modal-btns">
                    <button className="btn-cancel" onClick={()=>setModal(false)}>Annulla</button>
                    <button className="btn-g" style={{flex:1.5,marginBottom:0}} onClick={createReward}>✅ Crea Reward</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL MODIFICA REWARD */}
            {editModal && (
              <div className="overlay" onClick={e=>e.target===e.currentTarget&&setEditModal(null)}>
                <div className="modal">
                  <div className="modal-handle"/>
                  <h3>✏️ Modifica Reward</h3>
                  <div className="field-lbl">Nome</div>
                  <input className="field" value={editModal.name} onChange={e=>setEditModal(p=>({...p,name:e.target.value}))} />
                  <div className="field-lbl">Descrizione</div>
                  <input className="field" value={editModal.description} onChange={e=>setEditModal(p=>({...p,description:e.target.value}))} />
                  <div className="field-lbl">Punti Richiesti</div>
                  <input className="field" type="number" value={editModal.points} onChange={e=>setEditModal(p=>({...p,points:parseInt(e.target.value)}))} />
                  <div className="modal-btns">
                    <button className="btn-cancel" onClick={()=>setEditModal(null)}>Annulla</button>
                    <button className="btn-g" style={{flex:1.5,marginBottom:0}} onClick={updateReward}>✅ Salva</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
