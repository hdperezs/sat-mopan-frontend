import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const API = 'https://web-production-ade42.up.railway.app';
const H_PUENTE = 750;
const U_PREC = 300;
const U_ALERT = 500;
const U_EMER = 650;

function getEstado(cm) {
  if (cm >= U_EMER) return { l: 'EMERGENCIA', c: '#ef4444', bg: '#2d0a0a', bc: '#7f1d1d' };
  if (cm >= U_ALERT) return { l: 'ALERTA',     c: '#f97316', bg: '#2d1500', bc: '#7c2d12' };
  if (cm >= U_PREC)  return { l: 'PRECAUCIÓN', c: '#f59e0b', bg: '#2d2000', bc: '#78350f' };
  return { l: 'NORMAL', c: '#22c55e', bg: '#0f2d1a', bc: '#166534' };
}

function calcML(hist) {
  if (!hist || hist.length < 4) return null;
  const rec = hist.slice(-8);
  const deltas = [];
  for (let i = 1; i < rec.length; i++) {
    const dt = (new Date(rec[i].timestamp) - new Date(rec[i - 1].timestamp)) / 60000;
    if (dt > 0) deltas.push((rec[i].nivel_cm - rec[i - 1].nivel_cm) / dt);
  }
  if (!deltas.length) return null;
  const tasa = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const actual = rec[rec.length - 1].nivel_cm;
  const eta = tasa > 0.01 && actual < U_PREC ? Math.round((U_PREC - actual) / tasa) : null;
  return { tasa: parseFloat(tasa.toFixed(3)), eta, actual };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
      <div style={{ color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#60a5fa', fontWeight: 600 }}>{payload[0]?.value?.toFixed(2)} m</div>
    </div>
  );
}

function KpiCard({ accent, label, value, valueSub, color, sub }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '10px 10px 0 0' }} />
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: valueSub ? 18 : 26, fontWeight: 700, lineHeight: 1, marginBottom: 4, color: color || '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>
    </div>
  );
}

function Simulador({ onEnvio }) {
  const [nivel, setNivel] = useState(1.5);
  const [voltaje, setVoltaje] = useState(12.65);
  const [dispositivo, setDispositivo] = useState('SAT-MOPAN-01');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('Listo para simular. Ajusta el nivel y presiona enviar.');
  const [logColor, setLogColor] = useState('#64748b');

  const nivelCm = nivel * 100;
  const est = getEstado(nivelCm);
  const pct = (nivel / 7.5) * 100;

  const enviar = async () => {
    setLoading(true);
    setLog('Enviando medición al servidor...');
    setLogColor('#94a3b8');
    try {
      const res = await fetch(`${API}/medicion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivel_cm: nivelCm, voltaje_bateria: voltaje, codigo_estado: 0, dispositivo_id: dispositivo })
      });
      const data = await res.json();
      if (res.status === 201) {
        setLogColor('#22c55e');
        setLog(`OK (201) — ID: ${data.id} | Nivel: ${nivel.toFixed(2)}m | ${new Date().toLocaleTimeString('es-GT')}`);
        setTimeout(onEnvio, 1000);
      } else {
        setLogColor('#f97316');
        setLog('Respuesta inesperada: ' + JSON.stringify(data));
      }
    } catch {
      setLogColor('#ef4444');
      setLog('Error: No se pudo conectar con el servidor.');
    }
    setLoading(false);
  };

  const presets = [
    { label: 'Estiaje (0.5m)', v: 0.5, s: {} },
    { label: 'Normal (1.5m)',  v: 1.5, s: {} },
    { label: 'Lluvia (2.5m)',  v: 2.5, s: {} },
    { label: 'Precaución (3.5m)', v: 3.5, s: { borderColor: '#f59e0b', color: '#f59e0b' } },
    { label: 'Alerta (5.2m)',     v: 5.2, s: { borderColor: '#f97316', color: '#f97316' } },
    { label: 'Emergencia (6.8m)', v: 6.8, s: { borderColor: '#ef4444', color: '#ef4444' } },
  ];

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderTop: '3px solid #7c3aed', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em' }}>Simulador de mediciones</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Envía datos al servidor sin necesitar el Arduino</div>
        </div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: '#2d1f4e', color: '#a78bfa', border: '1px solid #7c3aed', fontWeight: 500 }}>Solo pruebas</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500, marginBottom: 8 }}>Nivel del río (metros)</div>
        <input type="range" min={0} max={7.5} step={0.1} value={nivel} onChange={e => setNivel(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#7c3aed', marginBottom: 6 }} />
        <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: est.c, textAlign: 'center', margin: '6px 0 4px' }}>{nivel.toFixed(2)} m</div>
        <div style={{ height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', width: pct + '%', background: est.c, borderRadius: 4, transition: 'all .3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569' }}>
          <span>0m</span><span>Precaución 3m</span><span>Alerta 5m</span><span>Emer. 6.5m</span><span>7.5m</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500, marginBottom: 8 }}>Escenarios rápidos</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.v} onClick={() => setNivel(p.v)} style={{ background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', ...p.s }}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Voltaje batería (V)', type: 'number', val: voltaje, set: e => setVoltaje(parseFloat(e.target.value)), min: 10, max: 14, step: 0.01 },
          { label: 'Dispositivo ID',      type: 'text',   val: dispositivo, set: e => setDispositivo(e.target.value) },
        ].map(f => (
          <div key={f.label}>
            <label style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500, display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={f.set} min={f.min} max={f.max} step={f.step}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', fontSize: 13, fontFamily: 'monospace', outline: 'none' }} />
          </div>
        ))}
      </div>
      <button onClick={enviar} disabled={loading} style={{ width: '100%', background: loading ? '#374151' : '#7c3aed', border: 'none', color: loading ? '#6b7280' : '#fff', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
        {loading ? 'Enviando...' : 'Enviar medición al servidor'}
      </button>
      <div style={{ background: '#0f172a', borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 11, color: logColor, lineHeight: 1.5 }}>{log}</div>
    </div>
  );
}

export default function App() {
  const [actual, setActual] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [ml, setMl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState('EN VIVO');
  const [hora, setHora] = useState('--:--:--');

  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLiveStatus('ACTUALIZANDO');
      const [rA, rH] = await Promise.all([fetch(`${API}/nivel-actual`), fetch(`${API}/historial?limite=40`)]);
      if (!rA.ok) throw new Error();
      const dataActual = await rA.json();
      const dataHist = (await rH.json()).reverse();
      setActual(dataActual);
      setHistorial(dataHist);
      setMl(calcML(dataHist));
      setLoading(false);
      setLiveStatus('EN VIVO');
    } catch {
      setLiveStatus('SIN CONEXIÓN');
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const nivelCm = actual?.nivel_cm ?? 0;
  const nivelM  = (nivelCm / 100).toFixed(2);
  const voltaje = actual?.voltaje_bateria ?? 0;
  const est     = getEstado(nivelCm);
  const pct     = Math.min(100, (nivelCm / H_PUENTE) * 100);
  const chartData = historial.filter(m => m.nivel_cm >= 0 && m.nivel_cm < 900).map(m => ({ hora: new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }), nivel: parseFloat((m.nivel_cm / 100).toFixed(2)) }));
  const dirTxt = ml ? (ml.tasa > 0.05 ? '↑ subiendo' : ml.tasa < -0.05 ? '↓ bajando' : '→ estable') : '--';
  const dirCol = ml ? (ml.tasa > 0.05 ? '#f97316' : ml.tasa < -0.05 ? '#22c55e' : '#94a3b8') : '#94a3b8';
  let predTxt = 'Acumulando mediciones para activar el modelo predictivo...';
  if (ml) {
    if (nivelCm >= U_EMER) predTxt = 'EMERGENCIA ACTIVA. El río superó el umbral crítico de 6.5 m. Se requiere acción inmediata.';
    else if (nivelCm >= U_ALERT) predTxt = `Nivel en zona de alerta (${nivelM} m). Tasa: ${ml.tasa.toFixed(2)} cm/min. Activar protocolo de evacuación preventiva.`;
    else if (ml.tasa > 0.05 && ml.eta) predTxt = `El nivel sube a ${Math.abs(ml.tasa).toFixed(2)} cm/min. El modelo estima precaución (3.0 m) en aprox. ${ml.eta} minutos.`;
    else if (ml.tasa < -0.05) predTxt = `El nivel baja a ${Math.abs(ml.tasa).toFixed(2)} cm/min. Sin riesgo de desbordamiento en el corto plazo.`;
    else predTxt = `Nivel estable en ${nivelM} m. Tasa: ${ml.tasa.toFixed(3)} cm/min. Sin tendencia de crecida detectada.`;
  }
  const tablaData = historial.filter(m => m.nivel_cm < 900).slice(-8).reverse();

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#1d4ed8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>SAT Mopán — Panel de Monitoreo</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Río Mopán · Puente El Camalote · Melchor de Mencos, Petén</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f2d1a', border: '1px solid #166534', borderRadius: 20, padding: '4px 10px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: liveStatus === 'SIN CONEXIÓN' ? '#ef4444' : '#22c55e' }} />
            <span style={{ fontSize: 11, color: liveStatus === 'SIN CONEXIÓN' ? '#ef4444' : '#22c55e', fontWeight: 500 }}>{liveStatus}</span>
          </div>
          <div style={{ fontSize: 11, color: '#475569', textAlign: 'right' }}>
            <div>{hora}</div><div style={{ marginTop: 1 }}>SAT-MOPAN-01</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem', fontFamily: 'monospace', fontSize: 13 }}>Conectando con el servidor...</div>
        ) : (
          <>
            <div style={{ background: est.bg, border: `1px solid ${est.bc}`, borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: est.c }}>Estado del río: {est.l}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: est.c, fontFamily: 'monospace' }}>{nivelM} m</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              <KpiCard accent="#3b82f6" label="Nivel actual" value={nivelM} color={est.c} sub="metros sobre el cauce" />
              <KpiCard accent="#22c55e" label="Tendencia" value={dirTxt} color={dirCol} valueSub sub={ml ? Math.abs(ml.tasa).toFixed(3) + ' cm/min' : 'calculando...'} />
              <KpiCard accent="#f59e0b" label="Batería" value={voltaje.toFixed(2)} color="#f59e0b" sub={voltaje >= 12 ? 'carga óptima' : voltaje >= 11 ? 'carga media' : 'batería baja'} />
              <KpiCard accent="#8b5cf6" label="Última lectura" value={actual ? new Date(actual.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '--:--'} color="#8b5cf6" valueSub sub="actualiza cada 30s" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Historial de nivel del río</span>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {[['#3b82f6','nivel'],['#f59e0b','precaución 3m'],['#ef4444','alerta 5m']].map(([c,l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nivelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={est.c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={est.c} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#475569' }} axisLine={{ stroke: '#1e293b' }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + 'm'} domain={[0, 7.5]} width={42} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={3.0} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.6} />
                    <ReferenceLine y={5.0} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.6} />
                    <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.8} />
                    <Area type="monotone" dataKey="nivel" stroke={est.c} strokeWidth={2} fill="url(#nivelGrad)" dot={false} activeDot={{ r: 4, fill: est.c, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Nivel vs puente (7.5m)</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700, color: '#60a5fa' }}>{nivelM}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>metros sobre el cauce</div>
                  <div style={{ width: '100%' }}>
                    {[
                      { label: 'Emergencia', color: '#ef4444', val: nivelCm >= U_EMER ? Math.min(100, ((nivelCm-U_EMER)/(H_PUENTE-U_EMER))*100) : 0, ref: '6.5m' },
                      { label: 'Alerta',     color: '#f97316', val: nivelCm >= U_ALERT ? Math.min(100, ((nivelCm-U_ALERT)/(U_EMER-U_ALERT))*100) : 0, ref: '5.0m' },
                      { label: 'Precaución', color: '#f59e0b', val: nivelCm >= U_PREC ? Math.min(100, ((nivelCm-U_PREC)/(U_ALERT-U_PREC))*100) : 0, ref: '3.0m' },
                      { label: 'Normal',     color: '#22c55e', val: Math.min(100, (Math.min(nivelCm,U_PREC)/U_PREC)*100), ref: '0–3m' },
                    ].map(g => (
                      <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
                        <span style={{ color: g.color, width: 72 }}>{g.label}</span>
                        <div style={{ flex: 1, height: 6, background: '#0f172a', borderRadius: 3, margin: '0 10px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: g.val + '%', background: g.color, borderRadius: 3, transition: 'width .6s ease' }} />
                        </div>
                        <span style={{ color: '#475569', width: 32, textAlign: 'right' }}>{g.ref}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: est.c, borderRadius: 4, transition: 'width .8s ease' }} />
                  </div>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
                    <span>0m</span><span>3.75m</span><span>7.5m</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Predicción ML — análisis de tendencia (Random Forest)</span>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1d4ed8', fontWeight: 500 }}>Modelo activo</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                {[
                  { label: 'Tasa de cambio', val: ml ? ml.tasa.toFixed(3) : '--', color: '#60a5fa', sub: 'cm / minuto' },
                  { label: 'Tendencia', val: dirTxt, color: dirCol, sub: 'dirección del nivel' },
                  { label: 'Tiempo a precaución', val: ml?.eta ? ml.eta + ' min' : 'N/A', color: ml?.eta && ml.eta < 60 ? '#ef4444' : ml?.eta ? '#f59e0b' : '#22c55e', sub: 'minutos estimados' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, fontSize: 12, color: '#94a3b8', lineHeight: 1.6, borderLeft: '3px solid #1d4ed8' }}>{predTxt}</div>
            </div>

            <Simulador onEnvio={fetchData} />

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Últimas mediciones registradas</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{historial.length} registros</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Hora','Nivel (m)','Dist. sensor','Batería','Estado'].map(h => (
                    <th key={h} style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', padding: '6px 8px', borderBottom: '1px solid #1e293b', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {tablaData.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: 20, fontSize: 12 }}>Sin datos</td></tr>
                  ) : tablaData.map(m => {
                    const e = getEstado(m.nivel_cm);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontSize: 12, padding: '7px 8px', borderBottom: '1px solid #1e293b', color: '#f1f5f9', fontFamily: 'monospace' }}>{new Date(m.timestamp).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td style={{ fontSize: 12, padding: '7px 8px', borderBottom: '1px solid #1e293b', color: '#60a5fa', fontWeight: 600, fontFamily: 'monospace' }}>{(m.nivel_cm / 100).toFixed(2)} m</td>
                        <td style={{ fontSize: 12, padding: '7px 8px', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontFamily: 'monospace' }}>{(H_PUENTE - m.nivel_cm).toFixed(0)} cm</td>
                        <td style={{ fontSize: 12, padding: '7px 8px', borderBottom: '1px solid #1e293b', color: '#f59e0b', fontFamily: 'monospace' }}>{m.voltaje_bateria.toFixed(2)} V</td>
                        <td style={{ fontSize: 12, padding: '7px 8px', borderBottom: '1px solid #1e293b' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: e.bg, color: e.c, border: `1px solid ${e.bc}` }}>{e.l}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, color: '#475569' }}>Universidad Mariano Gálvez · Héctor Daniel Pérez 5190-15-3835 · SAT Río Mopán</span>
              <button onClick={fetchData} style={{ background: '#1d4ed8', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Actualizar ↻</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
