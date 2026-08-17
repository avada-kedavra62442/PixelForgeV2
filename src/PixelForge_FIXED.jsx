import React, { useEffect, useRef, useState } from "react";
import "./PixelForge_FIXED.css";

export default function PixelForge() {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [tab, setTab] = useState("adjust");
  const [tool, setTool] = useState("select");
  const [selected, setSelected] = useState(-1);
  const [texts, setTexts] = useState([]);
  const [adjust, setAdjust] = useState({
    brightness: 0, contrast: 0, exposure: 0,
    saturation: 0, temperature: 0, blur: 0
  });
  const [status, setStatus] = useState("Ready — upload an image");
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef(null);
  const rafRef = useRef(0);

  const updateAdjust = (key, value) =>
    setAdjust(a => ({ ...a, [key]: Number(value) }));

  const loadImage = file => {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Please select an image");
      return;
    }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      imageRef.current = im;
      setImage({
        name: file.name,
        width: im.naturalWidth,
        height: im.naturalHeight
      });
      setAdjust({
        brightness: 0, contrast: 0, exposure: 0,
        saturation: 0, temperature: 0, blur: 0
      });
      setTexts([]);
      setSelected(-1);
      setStatus("Image loaded — adjustments are live");
      URL.revokeObjectURL(url);
    };
    im.src = url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const im = imageRef.current;
    if (!canvas || !im) return;

    const max = 1500;
    const scale = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * scale);
    const h = Math.round(im.naturalHeight * scale);

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.save();

    ctx.filter =
      `brightness(${100 + adjust.brightness + adjust.exposure / 2}%) ` +
      `contrast(${100 + adjust.contrast}%) ` +
      `saturate(${100 + adjust.saturation}%) ` +
      `${adjust.blur ? `blur(${adjust.blur * scale}px)` : ""}`;

    ctx.drawImage(im, 0, 0, w, h);
    ctx.restore();

    texts.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = t.opacity / 100;
      ctx.translate(t.x * w, t.y * h);
      ctx.rotate((t.rotation || 0) * Math.PI / 180);
      ctx.font =
        `${t.italic ? "italic " : ""}${t.bold ? "800" : "500"} ` +
        `${Math.max(8, t.size * scale)}px ${t.font}`;
      ctx.textAlign = t.align || "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = t.color;

      if (t.shadow) {
        ctx.shadowColor = `rgba(0,0,0,${t.shadowOpacity / 100})`;
        ctx.shadowBlur = t.shadowBlur * scale;
      }

      ctx.fillText(t.text, 0, 0);
      if (t.underline) {
        const m = ctx.measureText(t.text);
        const start = t.align === "center" ? -m.width/2 : t.align === "right" ? -m.width : 0;
        ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = t.color;
        ctx.fillRect(start, t.size * scale * 0.52, m.width, Math.max(1, t.size * scale * 0.055));
        ctx.restore();
      }
      ctx.restore();
    });
  }, [image, adjust, texts]);

  const addText = () => {
    if (!image) {
      setStatus("Upload an image first");
      return;
    }

    const t = {
      text: "Your text",
      x: 0.5, y: 0.5,
      size: 52,
      font: "Inter",
      color: "#ffffff",
      opacity: 100,
      bold: true,
      italic: false,
      underline: false,
      align: "center",
      rotation: 0,
      shadow: false,
      shadowBlur: 10,
      shadowOpacity: 60
    };

    setTexts(v => [...v, t]);
    setSelected(texts.length);
    setTab("text");
    setStatus("Text added — edit it below");
  };

  const changeText = (key, value) => {
    setTexts(arr =>
      arr.map((t, i) =>
        i === selected ? { ...t, [key]: value } : t
      )
    );
  };

  const canvasPoint = e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height };
  };
  const hitText = p => {
    for (let i=texts.length-1;i>=0;i--) {
      const t=texts[i];
      const w=Math.min(.9,(t.text.length*Math.max(t.size,16))/Math.max(image?.width||1000,1));
      const h=Math.min(.3,(t.size*1.6)/Math.max(image?.height||1000,1));
      if(Math.abs(p.x-t.x)<=w/2+.03 && Math.abs(p.y-t.y)<=h/2+.04) return i;
    }
    return -1;
  };
  const onPointerDown=e=>{
    if(!image || tool!=="select") return;
    const p=canvasPoint(e), i=hitText(p);
    if(i>=0){ setSelected(i); dragRef.current={i,dx:p.x-texts[i].x,dy:p.y-texts[i].y}; e.currentTarget.setPointerCapture?.(e.pointerId); setStatus("Dragging text…"); }
  };
  const onPointerMove=e=>{
    const d=dragRef.current; if(!d) return;
    const p=canvasPoint(e);
    setTexts(prev=>prev.map((t,i)=>i===d.i?{...t,x:Math.max(.02,Math.min(.98,p.x-d.dx)),y:Math.max(.03,Math.min(.97,p.y-d.dy))}:t));
  };
  const onPointerUp=()=>{ if(dragRef.current){dragRef.current=null;setStatus("Text moved");} };

  const exportPNG = () => {
    const im = imageRef.current;
    if (!im) {
      setStatus("Upload an image first");
      return;
    }

    const out = document.createElement("canvas");
    out.width = im.naturalWidth;
    out.height = im.naturalHeight;

    const ctx = out.getContext("2d");

    ctx.filter =
      `brightness(${100 + adjust.brightness + adjust.exposure / 2}%) ` +
      `contrast(${100 + adjust.contrast}%) ` +
      `saturate(${100 + adjust.saturation}%)`;

    ctx.drawImage(im, 0, 0);
    ctx.filter = "none";

    texts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.opacity / 100;
      ctx.translate(t.x * out.width, t.y * out.height);
      ctx.rotate((t.rotation || 0) * Math.PI / 180);
      ctx.font =
        `${t.italic ? "italic " : ""}${t.bold ? "800" : "500"} ` +
        `${t.size}px ${t.font}`;
      ctx.textAlign = t.align || "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      if (t.underline) {
        const m=ctx.measureText(t.text);
        const start=t.align === "center" ? -m.width/2 : t.align === "right" ? -m.width : 0;
        ctx.save(); ctx.fillStyle=t.color; ctx.fillRect(start,t.size*0.52,m.width,Math.max(1,t.size*0.055)); ctx.restore();
      }
      ctx.restore();
    });

    out.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PixelForge.png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Full-resolution PNG exported");
    }, "image/png");
  };

  const selectedText = texts[selected];

  const Slider = ({ label, value, min, max, step = 1, onChange }) => (
    <div className="pf-row">
      <label>{label}</label>
      <input
        className="pf-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <input
        className="pf-num"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <div className="pf-app">
      <header className="pf-header">
        <div className="pf-logo">Pixel<span>Forge</span></div>
        <div className="pf-file">{image?.name || "Untitled"}</div>

        <div className="pf-top">
          <button
            className="pf-btn"
            onClick={() => fileRef.current?.click()}
          >
            Upload Image
          </button>

          <button className="pf-btn pf-primary" onClick={exportPNG}>
            Export PNG
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => loadImage(e.target.files?.[0])}
          />
        </div>
      </header>

      <div className="pf-main">
        <aside className="pf-tools">
          {[
            ["select", "⌁", "Select"],
            ["text", "T", "Text"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={`pf-tool ${tool === id ? "active" : ""}`}
              onClick={() => setTool(id)}
            >
              <b>{icon}</b>
              <small>{label}</small>
            </button>
          ))}
        </aside>

        <aside className="pf-left">
          <label className="pf-upload">
            <input
              type="file"
              accept="image/*"
              onChange={e => loadImage(e.target.files?.[0])}
            />
            <strong>＋ Upload Image</strong>
            <span>JPG · PNG · WEBP</span>
          </label>

          <div className="pf-section">
            <h3>Quick Adjust</h3>
            <Slider
              label="Brightness"
              min={-100}
              max={100}
              value={adjust.brightness}
              onChange={v => updateAdjust("brightness", v)}
            />
            <Slider
              label="Contrast"
              min={-100}
              max={100}
              value={adjust.contrast}
              onChange={v => updateAdjust("contrast", v)}
            />
          </div>

          <div className="pf-section">
            <h3>Presets</h3>
            <div className="pf-grid">
              <button className="pf-chip" onClick={() =>
                setAdjust(a => ({ ...a, brightness: 5, contrast: 20, saturation: 30 }))
              }>Vivid</button>

              <button className="pf-chip" onClick={() =>
                setAdjust(a => ({ ...a, saturation: -100 }))
              }>B&W</button>

              <button className="pf-chip" onClick={() =>
                setAdjust(a => ({ ...a, brightness: -4, contrast: 25, saturation: -10 }))
              }>Cinema</button>

              <button className="pf-chip" onClick={() =>
                setAdjust({ brightness: 0, contrast: 0, exposure: 0, saturation: 0, temperature: 0, blur: 0 })
              }>Reset</button>
            </div>
          </div>
        </aside>

        <main className="pf-stage">
          {!image ? (
            <div className="pf-empty">
              <div>✦</div>
              <strong>Upload an image to start</strong>
              <button className="pf-btn pf-primary" onClick={() => fileRef.current?.click()}>
                Choose Image
              </button>
            </div>
          ) : (
            <div className="pf-canvas-wrap">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  maxWidth: "calc(100vw - 430px)",
                  maxHeight: "calc(100vh - 150px)",
                  width: `${zoom * 100}%`
                }}
              />
            </div>
          )}
        </main>

        <aside className="pf-right">
          <div className="pf-tabs">
            {["adjust", "text", "layers"].map(t => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "adjust" && (
            <>
              <div className="pf-section">
                <h3>Light</h3>

                <Slider label="Brightness" min={-100} max={100}
                  value={adjust.brightness}
                  onChange={v => updateAdjust("brightness", v)} />

                <Slider label="Contrast" min={-100} max={100}
                  value={adjust.contrast}
                  onChange={v => updateAdjust("contrast", v)} />

                <Slider label="Exposure" min={-100} max={100}
                  value={adjust.exposure}
                  onChange={v => updateAdjust("exposure", v)} />
              </div>

              <div className="pf-section">
                <h3>Color & Detail</h3>

                <Slider label="Saturation" min={-100} max={100}
                  value={adjust.saturation}
                  onChange={v => updateAdjust("saturation", v)} />

                <Slider label="Temperature" min={-100} max={100}
                  value={adjust.temperature}
                  onChange={v => updateAdjust("temperature", v)} />

                <Slider label="Blur" min={0} max={20} step={0.5}
                  value={adjust.blur}
                  onChange={v => updateAdjust("blur", v)} />
              </div>
            </>
          )}

          {tab === "text" && (
            <div className="pf-section">
              <h3>Typography</h3>

              <button
                className="pf-btn pf-primary pf-wide"
                onClick={addText}
              >
                ＋ Add Text
              </button>

              {selectedText && (
                <>
                  <textarea
                    className="pf-textarea"
                    value={selectedText.text}
                    onChange={e => changeText("text", e.target.value)}
                  />

                  <Slider
                    label="Size"
                    min={8}
                    max={180}
                    value={selectedText.size}
                    onChange={v => changeText("size", Number(v))}
                  />

                  <Slider
                    label="Opacity"
                    min={0}
                    max={100}
                    value={selectedText.opacity}
                    onChange={v => changeText("opacity", Number(v))}
                  />

                  <Slider
                    label="Rotation"
                    min={-180}
                    max={180}
                    value={selectedText.rotation}
                    onChange={v => changeText("rotation", Number(v))}
                  />

                  <div className="pf-row">
                    <label>Font</label>
                    <select
                      className="pf-select"
                      value={selectedText.font}
                      onChange={e => changeText("font", e.target.value)}
                    >
                      <option>Inter</option>
                      <option>Arial</option>
                      <option>Georgia</option>
                      <option>Verdana</option>
                      <option>Impact</option>
                    </select>
                  </div>

                  <div className="pf-row">
                    <label>Color</label>
                    <input
                      type="color"
                      value={selectedText.color}
                      onChange={e => changeText("color", e.target.value)}
                    />
                  </div>

                  <div className="pf-grid">
                    {[
                      ["bold", "B Bold"],
                      ["italic", "I Italic"],
                      ["underline", "U Underline"]
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        className={`pf-chip ${selectedText[key] ? "selected" : ""}`}
                        onClick={() => changeText(key, !selectedText[key])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "layers" && (
            <div className="pf-section">
              <h3>Layers</h3>

              <div className="pf-layer active">
                ▣ Image
              </div>

              {texts.map((t, i) => (
                <button
                  key={i}
                  className={`pf-layer ${i === selected ? "active" : ""}`}
                  onClick={() => {
                    setSelected(i);
                    setTab("text");
                  }}
                >
                  T&nbsp; {t.text || "Text"}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <footer className="pf-status">
        <span /> {status}
      </footer>
    </div>
  );
}
