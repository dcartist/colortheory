"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const harmonies = [
  { id: "complementary", label: "Complementary", desc: "Opposite on the wheel" },
  { id: "analogous", label: "Analogous", desc: "Side by side" },
  { id: "triadic", label: "Triadic", desc: "Equally spaced thirds" },
  { id: "split", label: "Split-Comp", desc: "Near the complement" },
  { id: "mono", label: "Monochromatic", desc: "Same hue, varied tone" },
  { id: "tetradic", label: "Tetradic", desc: "Two complementary pairs" },
];

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(5, Math.min(95, l));
  const hNorm = h / 360, sNorm = s / 100, lNorm = l / 100;
  let r, g, b;
  if (sNorm === 0) { r = g = b = lNorm; }
  else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, hNorm + 1/3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1/3);
  }
  return "#" + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function getHarmony(hex, type) {
  const [h, s, l] = hexToHsl(hex);
  switch (type) {
    case "complementary":
      return [hex, hslToHex(h + 180, s, l), hslToHex(h + 180, s * 0.7, l + 10)];
    case "analogous":
      return [hslToHex(h - 30, s, l), hex, hslToHex(h + 30, s, l)];
    case "triadic":
      return [hex, hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)];
    case "split":
      return [hex, hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)];
    case "mono":
      return [hslToHex(h, s, Math.max(20, l - 25)), hex, hslToHex(h, s, Math.min(85, l + 25))];
    case "tetradic":
      return [hex, hslToHex(h + 90, s, l), hslToHex(h + 180, s, l)];
    default:
      return [hex, hex, hex];
  }
}

function ColorWheel({ baseColor, palette, harmony, onHarmonyChange, onChange, size = 280 }) {
  const wheelRef = useRef(null);
  const isDragging = useRef(false);

  const outerR = size / 2 - 2;
  const innerR = outerR * 0.56;
  const midR   = (outerR + innerR) / 2;
  const spokeR = innerR - 1;

  // Draw the static hue ring
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2;

    // Hue ring — 720 steps for crisp gradient
    for (let i = 0; i < 720; i++) {
      const startAngle = (i / 720) * Math.PI * 2 - Math.PI / 2;
      const endAngle   = ((i + 1.5) / 720) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${(i / 720) * 360}, 100%, 50%)`;
      ctx.fill();
    }

    // Cut inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = "#0d0b0a";
    ctx.fill();

    // Inner edge soft shadow
    const fade = ctx.createRadialGradient(cx, cy, innerR - 1, cx, cy, innerR + 10);
    fade.addColorStop(0, "rgba(0,0,0,0.55)");
    fade.addColorStop(1, "rgba(0,0,0,0.00)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }, [size]);

  const hueToXY = (hue, r) => {
    const angle = (hue - 90) * (Math.PI / 180);
    return [size / 2 + Math.cos(angle) * r, size / 2 + Math.sin(angle) * r];
  };

  const getHueFromEvent = (e) => {
    const canvas = wheelRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top  - size / 2;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < innerR || dist > outerR) return null;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const pickColor = (e) => {
    const hue = getHueFromEvent(e);
    if (hue === null) return;
    const [, s, l] = hexToHsl(baseColor);
    onChange(hslToHex(hue, s, l));
  };

  const cx = size / 2, cy = size / 2;

  // Build SVG markers
  const markers = palette.map((c, i) => {
    const [h] = hexToHsl(c);
    const isBase = i === (harmony === "analogous" ? 1 : 0) || c === baseColor;
    const dotR = isBase ? 11 : 8;
    const [mx, my] = hueToXY(h, midR);
    const [sx, sy] = hueToXY(h, spokeR);
    return { c, h, mx, my, sx, sy, isBase, dotR };
  });

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <canvas
          ref={wheelRef}
          style={{ width: size, height: size, display: "block", cursor: "crosshair", borderRadius: "50%" }}
          onMouseDown={e => { isDragging.current = true; pickColor(e); }}
          onMouseMove={e => { if (isDragging.current) pickColor(e); }}
          onMouseUp={() => { isDragging.current = false; }}
          onMouseLeave={() => { isDragging.current = false; }}
          onTouchStart={e => { isDragging.current = true; pickColor(e); }}
          onTouchMove={e => { e.preventDefault(); if (isDragging.current) pickColor(e); }}
          onTouchEnd={() => { isDragging.current = false; }}
        />

        {/* SVG: spokes + dots + labels */}
        <svg style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} width={size} height={size}>
          <defs>
            {markers.map(({ c }, i) => (
              <filter key={i} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            ))}
          </defs>

          {/* Spokes from center to inner ring edge */}
          {markers.map(({ sx, sy, c }, i) => (
            <line key={`spoke-${i}`}
              x1={cx} y1={cy} x2={sx} y2={sy}
              stroke={c} strokeWidth="1.5" strokeOpacity="0.35"
              strokeDasharray="3 4"
            />
          ))}

          {/* Connecting arc between harmony dots (for complementary/triadic etc.) */}
          {markers.length > 1 && markers.map((m, i) => {
            if (i === 0) return null;
            const prev = markers[i - 1];
            return (
              <line key={`conn-${i}`}
                x1={prev.mx} y1={prev.my} x2={m.mx} y2={m.my}
                stroke="rgba(255,255,255,0.12)" strokeWidth="1"
              />
            );
          })}

          {/* Dots */}
          {markers.map(({ c, mx, my, isBase, dotR }, i) => (
            <g key={`dot-${i}`}>
              <circle cx={mx} cy={my} r={dotR + 3} fill={c} opacity="0.20" />
              <circle cx={mx} cy={my} r={dotR}
                fill={c}
                stroke={isBase ? "#ffffff" : "rgba(255,255,255,0.55)"}
                strokeWidth={isBase ? 2.5 : 1.5}
                filter={`url(#glow-${i})`}
              />
            </g>
          ))}

          {/* Labels outside the ring */}
          {markers.map(({ c, h, dotR, isBase }, i) => {
            const labelR = outerR + 22;
            const [lx, ly] = hueToXY(h, labelR);
            const label = isBase ? "base" : ["comp", "alt", "triad", "split", "tint", "sq"][i] || `c${i+1}`;
            return (
              <text key={`lbl-${i}`}
                x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontFamily="'Courier New', monospace"
                letterSpacing="0.06em"
                fill={c} opacity="0.85"
                style={{ textTransform: "uppercase" }}
              >
                {label}
              </text>
            );
          })}
        </svg>

      {/* Center swatch */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: innerR * 2 * 0.55, height: innerR * 2 * 0.55,
          borderRadius: "50%",
          background: baseColor,
          boxShadow: `0 0 0 3px #1a1714, 0 0 24px ${baseColor}55`,
          transition: "background 0.15s ease, box-shadow 0.15s ease",
          pointerEvents: "none",
        }} />
    </div>
  );
}

function Sphere({ color, label, size = 180, delay = 0 }) {
  const [hsl] = useState(() => hexToHsl(color));
  const [h, s, l] = hexToHsl(color);
  const highlight = hslToHex(h, Math.max(0, s - 20), Math.min(98, l + 45));
  const shadow = hslToHex(h, Math.min(100, s + 10), Math.max(5, l - 35));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: `fadeUp 0.5s ease ${delay}ms both` }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${highlight} 0%, ${color} 40%, ${shadow} 100%)`,
        boxShadow: `0 20px 60px ${color}55, 0 8px 32px ${shadow}88, inset 0 -4px 8px ${shadow}44`,
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "14%", left: "22%",
          width: "28%", height: "18%", borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, transparent 100%)`,
          transform: "rotate(-30deg)",
          filter: "blur(2px)",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "13px", letterSpacing: "0.12em",
          color: "#c8bfb0", fontWeight: "600", marginBottom: "4px",
        }}>{color.toUpperCase()}</div>
        <div style={{
          fontSize: "11px", letterSpacing: "0.08em",
          color: "#6b6055", fontFamily: "'Courier New', monospace",
          textTransform: "uppercase",
        }}>HSL {h}° {s}% {l}%</div>
        {label && <div style={{
          fontSize: "11px", color: "#8a7f74", fontFamily: "'Georgia', serif",
          fontStyle: "italic", marginTop: "4px",
        }}>{label}</div>}
      </div>
    </div>
  );
}

function SingleSphere({ colors, labels, size = 260, delay = 0 }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || colors.length < 3) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = size / 2 - 3;
    const segAngle = (Math.PI * 2) / 3;
    const startAngle = -Math.PI / 2;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Draw 3 pie segments
    colors.forEach((color, i) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle + i * segAngle, startAngle + (i + 1) * segAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Edge darkening for sphere depth
    const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.28, cx, cy, r);
    edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
    edgeGrad.addColorStop(0.72, "rgba(0,0,0,0.06)");
    edgeGrad.addColorStop(1, "rgba(0,0,0,0.52)");
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, size, size);

    // Broad light wash (upper-left)
    const lightGrad = ctx.createRadialGradient(cx * 0.62, cy * 0.52, 0, cx * 0.62, cy * 0.52, r * 0.75);
    lightGrad.addColorStop(0, "rgba(255,255,255,0.28)");
    lightGrad.addColorStop(0.45, "rgba(255,255,255,0.06)");
    lightGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, size, size);

    // Specular glare
    const glare = ctx.createRadialGradient(cx * 0.56, cy * 0.40, 0, cx * 0.56, cy * 0.40, r * 0.20);
    glare.addColorStop(0, "rgba(255,255,255,0.78)");
    glare.addColorStop(0.4, "rgba(255,255,255,0.22)");
    glare.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();

    // Dividing lines
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const angle = startAngle + i * segAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.stroke();
    }
    ctx.restore();
  }, [colors, size]);

  useEffect(() => { draw(); }, [draw]);

  const avgColor = colors[1] || "#888";
  const [h, s, l] = hexToHsl(avgColor);
  const shadowColor = hslToHex(h, Math.min(100, s + 10), Math.max(5, l - 35));

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "28px",
      animation: `fadeUp 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
    }}>
      <div style={{
        borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        boxShadow: `0 28px 80px ${avgColor}44, 0 8px 32px ${shadowColor}88`,
        transition: "box-shadow 0.6s ease",
      }}>
        <canvas ref={canvasRef} style={{ width: size, height: size, display: "block" }} />
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", justifyContent: "center" }}>
        {colors.map((c, i) => {
          const [ch, cs, cl] = hexToHsl(c);
          return (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: c,
                margin: "0 auto 7px",
                boxShadow: `0 0 10px ${c}99`,
              }} />
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: "12px",
                color: "#c8bfb0", letterSpacing: "0.1em", marginBottom: "3px",
              }}>{c.toUpperCase()}</div>
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: "10px",
                color: "#5a5048",
              }}>HSL {ch}° {cs}% {cl}%</div>
              <div style={{
                fontFamily: "'Georgia', serif", fontSize: "11px",
                color: "#8a7f74", fontStyle: "italic", marginTop: "3px",
              }}>{labels[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShadedSphere({ colors, size = 260, delay = 0, inverted = false }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || colors.length < 3) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = size / 2 - 2;

    const hiColor  = colors[inverted ? 0 : 2];
    const midColor = colors[1];
    const shColor  = colors[inverted ? 2 : 0];

    // Parse shadow color to RGB so the vignette tints into it, not into black
    const shR = parseInt(shColor.slice(1, 3), 16);
    const shG = parseInt(shColor.slice(3, 5), 16);
    const shB = parseInt(shColor.slice(5, 7), 16);

    // Light source pushed well off-center — the further it is, the more 3D the sphere reads
    const sign = inverted ? 1 : -1;
    const lx = cx + sign * (-r * 0.44);
    const ly = cy + sign * (-r * 0.46);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Main gradient — tighter highlight, wide midtone, shadow builds toward far edge
    const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 1.80);
    grad.addColorStop(0.00, hiColor);   // highlight: sharp zone
    grad.addColorStop(0.20, hiColor);   // hold tight
    grad.addColorStop(0.38, midColor);  // blend into midtone
    grad.addColorStop(0.54, midColor);  // midtone — widest zone
    grad.addColorStop(0.70, shColor);   // shadow builds
    grad.addColorStop(1.00, shColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Shadow-tinted edge vignette — edges curve into the shadow color, not black
    // This is what separates a flat circle from a true sphere
    const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    vig.addColorStop(0.00, `rgba(${shR},${shG},${shB},0.00)`);
    vig.addColorStop(0.60, `rgba(${shR},${shG},${shB},0.00)`);
    vig.addColorStop(0.80, `rgba(${shR},${shG},${shB},0.25)`);
    vig.addColorStop(0.92, `rgba(${shR},${shG},${shB},0.55)`);
    vig.addColorStop(1.00, `rgba(${shR},${shG},${shB},0.75)`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();
  }, [colors, size, inverted]);

  useEffect(() => { draw(); }, [draw]);

  const hiIdx = inverted ? 0 : 2;
  const shIdx = inverted ? 2 : 0;
  const displayOrder = [shIdx, 1, hiIdx]; // shadow → mid → highlight left-to-right
  const roleLabels = { [hiIdx]: "☀ Highlight", 1: "◑ Midtone", [shIdx]: "● Shadow" };
  const roleColors = { [hiIdx]: "#c8a96e", 1: "#8a9f84", [shIdx]: "#7a8aaa" };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "28px",
      animation: `fadeUp 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
    }}>
      <div style={{
        borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        boxShadow: `0 28px 80px ${colors[1]}44, 0 8px 32px ${colors[hiIdx]}66`,
        transition: "box-shadow 0.6s ease",
      }}>
        <canvas ref={canvasRef} style={{ width: size, height: size, display: "block" }} />
      </div>

      {/* Role legend */}
      <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", justifyContent: "center" }}>
        {displayOrder.map((ci) => {
          const c = colors[ci];
          const [ch, cs, cl] = hexToHsl(c);
          return (
            <div key={ci} style={{ textAlign: "center" }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: c,
                margin: "0 auto 7px", boxShadow: `0 0 10px ${c}99`,
              }} />
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: "12px",
                color: "#c8bfb0", letterSpacing: "0.1em", marginBottom: "3px",
              }}>{c.toUpperCase()}</div>
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#5a5048",
              }}>HSL {ch}° {cs}% {cl}%</div>
              <div style={{
                fontFamily: "'Georgia', serif", fontSize: "11px",
                color: roleColors[ci], fontStyle: "italic", marginTop: "4px",
              }}>{roleLabels[ci]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ColorTheory() {
  const [baseColor, setBaseColor] = useState("#c0392b");
  const [harmony, setHarmony] = useState("complementary");
  const [palette, setPalette] = useState([]);
  const [inputVal, setInputVal] = useState("#c0392b");
  const [animKey, setAnimKey] = useState(0);
  const [viewMode, setViewMode] = useState("three"); // "three" | "one" | "shaded"
  const [invertLight, setInvertLight] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  // Theme tokens — all colors in one place, WCAG AA compliant contrast ratios
  const T = darkMode ? {
    // Dark mode
    bg:           "#0d0b0a",
    bgCard:       "#110f0e",
    bgHover:      "#1a1714",
    bgActive:     "#2e2820",
    border:       "#2e2820",
    borderSubtle: "#1e1a16",
    borderHover:  "#5a5048",
    // Text — all ≥ 4.5:1 on dark bg
    textPrimary:  "#f0e8e0",   // ~12:1 on bg
    textSecond:   "#c8bfb0",   // ~7.5:1 on bg
    textMuted:    "#8a8078",   // ~4.6:1 on bg
    textFaint:    "#5a5048",   // labels/hints — used large/uppercase only
    scrollBg:     "#0d0b0a",
    scrollThumb:  "#3a3028",
    inputBg:      "#1a1714",
    shadow:       "rgba(0,0,0,0.5)",
  } : {
    // Light mode
    bg:           "#f5f2ee",
    bgCard:       "#ffffff",
    bgHover:      "#ede9e4",
    bgActive:     "#ddd8d0",
    border:       "#c8c0b5",
    borderSubtle: "#ddd8d0",
    borderHover:  "#8a7f74",
    // Text — all ≥ 4.5:1 on light bg
    textPrimary:  "#1a1510",   // ~14:1 on bg
    textSecond:   "#3a3028",   // ~8:1 on bg
    textMuted:    "#5a5048",   // ~4.7:1 on bg
    textFaint:    "#6a6058",   // labels — used large/uppercase only
    scrollBg:     "#f5f2ee",
    scrollThumb:  "#c8c0b5",
    inputBg:      "#ede9e4",
    shadow:       "rgba(0,0,0,0.12)",
  };

  useEffect(() => {
    const colors = getHarmony(baseColor, harmony);
    setPalette(colors);
    setAnimKey(k => k + 1);
  }, [baseColor, harmony]);

  const harmonyLabels = {
    complementary: ["Base", "Complement", "Soft Complement"],
    analogous: ["Left", "Base", "Right"],
    triadic: ["Base", "Triad A", "Triad B"],
    split: ["Base", "Split A", "Split B"],
    mono: ["Shadow", "Base", "Tint"],
    tetradic: ["Base", "Square A", "Opposite"],
  };

  const handleHexInput = (e) => {
    const val = e.target.value;
    setInputVal(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setBaseColor(val);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      color: T.textPrimary, fontFamily: "'Georgia', serif",
      padding: "0 0 60px",
      transition: "background 0.3s ease, color 0.3s ease",
    }}>
      <style>{`
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; background: ${T.scrollBg}; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 3px; }
        input[type=color] {
          -webkit-appearance: none; appearance: none;
          width: 52px; height: 52px; border: none;
          background: none; cursor: pointer; padding: 0; border-radius: 50%;
        }
        input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type=color]::-webkit-color-swatch {
          border: none; border-radius: 50%;
          box-shadow: 0 0 0 3px ${T.border}, 0 0 20px ${T.shadow};
        }
        /* Focus rings — 508 requirement */
        button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
          outline: 3px solid #4a90d9;
          outline-offset: 2px;
        }
        .harmony-btn {
          background: transparent; border: 1px solid ${T.border};
          color: ${T.textMuted}; padding: 10px 20px;
          font-family: 'Courier New', monospace;
          font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer;
          transition: all 0.2s ease; white-space: nowrap;
        }
        .harmony-btn:hover { border-color: ${T.borderHover}; color: ${T.textSecond}; }
        .harmony-btn.active { background: ${T.bgActive}; border-color: ${T.borderHover}; color: ${T.textPrimary}; }
        .view-toggle { display: inline-flex; border: 1px solid ${T.border}; border-radius: 3px; overflow: hidden; }
        .view-toggle button {
          background: transparent; border: none; color: ${T.textMuted};
          padding: 8px 18px; font-family: 'Courier New', monospace;
          font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer;
          transition: all 0.2s ease; display: flex; align-items: center; gap: 7px;
        }
        .view-toggle button:hover { color: ${T.textPrimary}; background: ${T.bgHover}; }
        .view-toggle button.active { background: ${T.bgActive}; color: ${T.textPrimary}; }
        .view-toggle button + button { border-left: 1px solid ${T.border}; }
        .invert-btn {
          background: transparent; border: 1px solid ${T.border};
          color: ${T.textMuted}; padding: 8px 16px;
          font-family: 'Courier New', monospace;
          font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer;
          transition: all 0.2s ease; border-radius: 3px;
          display: flex; align-items: center; gap: 7px;
        }
        .invert-btn:hover { border-color: ${T.borderHover}; color: ${T.textSecond}; }
        .invert-btn.active { background: ${T.bgActive}; border-color: ${T.borderHover}; color: ${T.textPrimary}; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: ${T.textPrimary}; border: 2px solid ${T.bg};
          box-shadow: 0 0 0 1.5px ${T.borderHover}, 0 2px 6px ${T.shadow};
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: ${T.textPrimary}; border: 2px solid ${T.bg};
          box-shadow: 0 0 0 1.5px ${T.borderHover};
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <header role="banner" style={{
        textAlign: "center", padding: "52px 24px 36px",
        borderBottom: `1px solid ${T.borderSubtle}`,
        position: "relative",
      }}>
        {/* Theme toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={!darkMode}
          style={{
            position: "absolute", top: 20, right: 24,
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: "20px", padding: "7px 14px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            color: T.textSecond, fontFamily: "'Courier New', monospace",
            fontSize: "11px", letterSpacing: "0.1em",
            transition: "all 0.2s ease",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "14px" }}>{darkMode ? "☀" : "●"}</span>
          {darkMode ? "Light" : "Dark"}
        </button>

        <div style={{
          fontSize: "11px", letterSpacing: "0.3em", color: T.textFaint,
          fontFamily: "'Courier New', monospace", textTransform: "uppercase",
          marginBottom: "16px",
        }} aria-hidden="true">Color Theory Studio</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(32px, 6vw, 56px)", fontWeight: "400",
          color: T.textPrimary, lineHeight: 1.1, marginBottom: "12px",
          letterSpacing: "-0.01em",
        }}>The Art of <em>Color Harmony</em></h1>
        <p style={{ color: T.textSecond, fontSize: "15px", letterSpacing: "0.03em" }}>
          Select a color · Choose a harmony · Discover your palette
        </p>
      </header>

      {/* Color Wheel + Harmony List */}
      <section aria-label="Color wheel and harmony selector" style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "48px 32px 0", gap: "40px", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{
            fontSize: "11px", color: T.textMuted, letterSpacing: "0.2em",
            fontFamily: "'Courier New', monospace", textTransform: "uppercase",
          }}>Drag ring to pick hue</div>
          <ColorWheel
            baseColor={baseColor}
            palette={palette.length ? palette : [baseColor]}
            harmony={harmony}
            onHarmonyChange={h => setHarmony(h)}
            onChange={c => { setBaseColor(c); setInputVal(c); }}
            size={280}
          />
        </div>

        {/* Harmony list */}
        <nav aria-label="Harmony types" style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "210px" }}>
          <div style={{
            fontSize: "11px", color: T.textMuted, letterSpacing: "0.25em",
            fontFamily: "'Courier New', monospace", textTransform: "uppercase",
            marginBottom: "10px",
          }}>Harmony Type</div>
          {harmonies.map(h => {
            const isActive = harmony === h.id;
            const hPalette = getHarmony(baseColor, h.id);
            return (
              <button
                key={h.id}
                onClick={() => setHarmony(h.id)}
                aria-pressed={isActive}
                aria-label={`${h.label}: ${h.desc}`}
                style={{
                  background: isActive ? T.bgActive : "transparent",
                  border: `1px solid ${isActive ? T.borderHover : T.borderSubtle}`,
                  borderRadius: "3px", padding: "10px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "12px",
                  transition: "all 0.15s ease", textAlign: "left",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = T.border; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = T.borderSubtle; }}
              >
                <div style={{ display: "flex", gap: "3px", flexShrink: 0 }} aria-hidden="true">
                  {hPalette.map((c, i) => (
                    <div key={i} style={{
                      width: 11, height: 11, borderRadius: "50%", background: c,
                      boxShadow: isActive ? `0 0 6px ${c}55` : "none",
                    }} />
                  ))}
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Courier New', monospace", fontSize: "12px",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: isActive ? T.textPrimary : T.textSecond,
                    transition: "color 0.15s",
                  }}>{h.label}</div>
                  <div style={{
                    fontFamily: "'Georgia', serif", fontSize: "11px",
                    fontStyle: "italic",
                    color: isActive ? T.textSecond : T.textMuted,
                    marginTop: "2px", transition: "color 0.15s",
                  }}>{h.desc}</div>
                </div>
                {isActive && (
                  <div aria-hidden="true" style={{
                    marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
                    background: T.textMuted, flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {/* Color Picker + Sliders */}
      <section aria-label="Color adjustment" style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 24px 0" }}>
        <div style={{
          background: T.bgCard, border: `1px solid ${T.borderSubtle}`,
          borderRadius: "4px", padding: "28px 32px",
          display: "flex", flexDirection: "column", gap: "24px",
          boxShadow: `0 2px 12px ${T.shadow}`,
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}>
          {/* Swatch + hex */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div aria-hidden="true" style={{
                width: 52, height: 52, borderRadius: "50%", background: baseColor,
                boxShadow: `0 0 0 3px ${T.border}, 0 0 20px ${baseColor}44`,
                position: "absolute", pointerEvents: "none",
              }} />
              <input type="color" value={baseColor}
                aria-label="Pick base color"
                onChange={e => { setBaseColor(e.target.value); setInputVal(e.target.value); }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="hex-input" style={{
                display: "block", fontSize: "11px", color: T.textMuted,
                letterSpacing: "0.25em", fontFamily: "'Courier New', monospace",
                textTransform: "uppercase", marginBottom: "8px",
              }}>Hex Value</label>
              <input
                id="hex-input"
                type="text" value={inputVal}
                onChange={handleHexInput}
                placeholder="#000000"
                aria-label="Hex color value"
                style={{
                  background: T.inputBg, border: `1px solid ${T.border}`,
                  color: T.textPrimary, padding: "9px 14px",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "14px", letterSpacing: "0.1em",
                  width: "148px", outline: "none", borderRadius: "2px",
                  transition: "background 0.3s ease, color 0.3s ease",
                }}
              />
            </div>
            {(() => {
              const [h, s, l] = hexToHsl(baseColor);
              return (
                <div aria-live="polite" aria-label={`HSL values: Hue ${h} degrees, Saturation ${s} percent, Lightness ${l} percent`}
                  style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", color: T.textMuted, textAlign: "right", lineHeight: 1.9 }}>
                  <div>H {h}°</div>
                  <div>S {s}%</div>
                  <div>L {l}%</div>
                </div>
              );
            })()}
          </div>

          {/* HSL Sliders */}
          {(() => {
            const [h, s, l] = hexToHsl(baseColor);
            const sliderBase = {
              width: "100%", height: "8px", borderRadius: "4px",
              outline: "none", border: "none", cursor: "pointer",
              WebkitAppearance: "none", appearance: "none",
            };
            const updateHSL = (nh, ns, nl) => {
              const hex = hslToHex(nh, ns, nl);
              setBaseColor(hex); setInputVal(hex);
            };
            const rows = [
              {
                id: "slider-hue", label: "Hue", value: h, min: 0, max: 359, unit: "°",
                track: `linear-gradient(to right,hsl(0,${s}%,${l}%),hsl(36,${s}%,${l}%),hsl(72,${s}%,${l}%),hsl(108,${s}%,${l}%),hsl(144,${s}%,${l}%),hsl(180,${s}%,${l}%),hsl(216,${s}%,${l}%),hsl(252,${s}%,${l}%),hsl(288,${s}%,${l}%),hsl(324,${s}%,${l}%),hsl(360,${s}%,${l}%))`,
                onChange: v => updateHSL(v, s, l),
              },
              {
                id: "slider-sat", label: "Saturation", value: s, min: 0, max: 100, unit: "%",
                track: `linear-gradient(to right,hsl(${h},0%,${l}%),hsl(${h},100%,${l}%))`,
                onChange: v => updateHSL(h, v, l),
              },
              {
                id: "slider-lit", label: "Lightness", value: l, min: 5, max: 95, unit: "%",
                track: `linear-gradient(to right,hsl(${h},${s}%,5%),hsl(${h},${s}%,50%),hsl(${h},${s}%,95%))`,
                onChange: v => updateHSL(h, s, v),
              },
            ];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {rows.map(({ id, label, value, min, max, track, onChange, unit }) => (
                  <div key={id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "9px" }}>
                      <label htmlFor={id} style={{
                        fontSize: "11px", color: T.textMuted,
                        letterSpacing: "0.2em", fontFamily: "'Courier New', monospace",
                        textTransform: "uppercase",
                      }}>{label}</label>
                      <span aria-live="polite" style={{
                        fontSize: "12px", color: T.textSecond,
                        fontFamily: "'Courier New', monospace", fontWeight: "600",
                      }}>{value}{unit}</span>
                    </div>
                    <input
                      id={id}
                      type="range" min={min} max={max} value={value}
                      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
                      aria-label={`${label}: ${value}${unit}`}
                      onChange={e => onChange(Number(e.target.value))}
                      style={{ ...sliderBase, background: track }}
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* View Toggle */}
      <div style={{ maxWidth: "640px", margin: "28px auto 0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ fontSize: "11px", color: T.textMuted, letterSpacing: "0.25em", fontFamily: "'Courier New', monospace", textTransform: "uppercase" }}>
          Display
        </div>
        <div className="view-toggle" role="group" aria-label="Display mode">
          {[
            { id: "three", label: "3 Balls", icon: <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><circle cx="2" cy="5" r="2" fill="currentColor" opacity="0.6"/><circle cx="7" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="5" r="2" fill="currentColor" opacity="0.6"/></svg> },
            { id: "one",   label: "Segments", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 1 L6 11" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/><path d="M6 1 Q10 6 6 11" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/><path d="M6 1 Q2 6 6 11" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/></svg> },
            { id: "shaded",label: "Lit Surface", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><defs><radialGradient id="sg2" cx="38%" cy="35%" r="65%"><stop offset="0%" stopColor="white" stopOpacity="0.9"/><stop offset="100%" stopColor="currentColor" stopOpacity="0.2"/></radialGradient></defs><circle cx="6" cy="6" r="5" fill="url(#sg2)" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4"/></svg> },
          ].map(({ id, label, icon }) => (
            <button key={id} className={viewMode === id ? "active" : ""}
              onClick={() => setViewMode(id)}
              aria-pressed={viewMode === id}
              aria-label={label}
            >{icon} {label}</button>
          ))}
        </div>
      </div>

      {/* Invert Light toggle */}
      {viewMode === "shaded" && (
        <div style={{ maxWidth: "640px", margin: "12px auto 0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "11px", color: T.textMuted, letterSpacing: "0.25em", fontFamily: "'Courier New', monospace", textTransform: "uppercase" }}>Light Direction</div>
          <button className={`invert-btn ${invertLight ? "active" : ""}`}
            onClick={() => setInvertLight(v => !v)}
            aria-pressed={invertLight}
            aria-label={invertLight ? "Shadow on left, click to flip" : "Highlight on left, click to flip"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 1.5 C4 1.5 1.5 4 1.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M1.5 7 L3.5 5.2 M1.5 7 L3.2 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {invertLight ? "Inverted — Shadow Left" : "Normal — Highlight Left"}
          </button>
        </div>
      )}

      {/* Divider */}
      <div style={{ maxWidth: "640px", margin: "32px auto", borderTop: `1px solid ${T.borderSubtle}`, padding: "0 24px" }} role="separator" />

      {/* Ball Display */}
      <main aria-label="Palette preview">
        {palette.length === 3 && viewMode === "three" && (
          <div key={`three-${animKey}`} style={{
            maxWidth: "760px", margin: "0 auto", padding: "0 24px",
            display: "flex", justifyContent: "center", alignItems: "flex-start",
            gap: "clamp(20px, 5vw, 56px)", flexWrap: "wrap",
          }}>
            <Sphere color={palette[0]} label={harmonyLabels[harmony][0]} size={160} delay={0} />
            <Sphere color={palette[1]} label={harmonyLabels[harmony][1]} size={200} delay={80} />
            <Sphere color={palette[2]} label={harmonyLabels[harmony][2]} size={160} delay={160} />
          </div>
        )}
        {palette.length === 3 && viewMode === "one" && (
          <div key={`one-${animKey}`} style={{ display: "flex", justifyContent: "center", padding: "0 24px" }}>
            <SingleSphere colors={palette} labels={harmonyLabels[harmony]} size={260} delay={0} />
          </div>
        )}
        {palette.length === 3 && viewMode === "shaded" && (
          <div key={`shaded-${animKey}`} style={{ display: "flex", justifyContent: "center", padding: "0 24px" }}>
            <ShadedSphere colors={palette} size={260} delay={0} inverted={invertLight} />
          </div>
        )}
      </main>

      {/* Palette bar */}
      {palette.length === 3 && (
        <section aria-label="Palette color bar" style={{ maxWidth: "640px", margin: "48px auto 0", padding: "0 24px" }}>
          <div style={{
            fontSize: "11px", color: T.textMuted, letterSpacing: "0.25em",
            fontFamily: "'Courier New', monospace", textTransform: "uppercase", marginBottom: "12px",
          }}>Palette Preview</div>
          <div style={{ display: "flex", height: "52px", borderRadius: "4px", overflow: "hidden", border: `1px solid ${T.borderSubtle}` }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, background: c, transition: "background 0.5s ease" }}
                role="img" aria-label={`Color ${i + 1}: ${c.toUpperCase()}`}
              />
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "8px" }}>
            {palette.map((c, i) => (
              <div key={i} style={{
                flex: 1, textAlign: "center",
                fontFamily: "'Courier New', monospace", fontSize: "11px",
                color: T.textSecond, letterSpacing: "0.08em",
              }}>{c.toUpperCase()}</div>
            ))}
          </div>
        </section>
      )}

      {/* Theory Note */}
      <section aria-label="About this harmony" style={{ maxWidth: "640px", margin: "40px auto 0", padding: "0 24px" }}>
        <div style={{
          background: T.bgCard, border: `1px solid ${T.borderSubtle}`,
          borderRadius: "4px", padding: "24px",
          boxShadow: `0 2px 12px ${T.shadow}`,
          transition: "background 0.3s ease",
        }}>
          <div style={{
            fontSize: "11px", color: T.textMuted, letterSpacing: "0.25em",
            fontFamily: "'Courier New', monospace", textTransform: "uppercase", marginBottom: "12px",
          }}>About This Harmony</div>
          <p style={{ fontSize: "14px", color: T.textSecond, lineHeight: 1.75, fontStyle: "italic" }}>
            {harmony === "complementary" && "Complementary colors sit directly opposite each other on the color wheel. They create maximum contrast and vibrate when placed side by side — a technique beloved by the Impressionists."}
            {harmony === "analogous" && "Analogous colors are neighbors on the wheel. They create serene, cohesive palettes found throughout nature. One dominates, one supports, one accents."}
            {harmony === "triadic" && "Triadic palettes use three colors evenly spaced 120° apart. They feel vibrant and balanced — let one color dominate, use the others for accents."}
            {harmony === "split" && "Split-complementary keeps the base color and replaces its complement with two adjacent colors. Softer contrast than complementary, yet still visually dynamic."}
            {harmony === "mono" && "Monochromatic palettes use a single hue at different lightness and saturation levels. They create elegant, sophisticated looks with guaranteed harmony."}
            {harmony === "tetradic" && "Tetradic (square) harmonies use four colors forming a rectangle on the wheel. Rich and complex — best when one color dominates and the others accent."}
          </p>
        </div>
      </section>
    </div>
  );
}
