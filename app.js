// ---------- API base (same-origin by default) ----------
const BASE =
  (typeof window !== "undefined" && typeof window.API_BASE === "string")
    ? window.API_BASE
    : ""; // same-origin

export const URLS = {
  brain: `${BASE}/api/brain/predict`,
  lung:  `${BASE}/api/lung/predict`,
};

// Default labels (used if /health doesn't return any)
const DEFAULT_LABELS = {
  brain: ["glioma", "meningioma", "no_tumor", "pituitary"],
  lung:  ["Bacterial Pneumonia","Corona Virus Disease","Normal","Tuberculosis","Viral Pneumonia"]
};
window.LABELS = { ...DEFAULT_LABELS };

// Short educational snippets (displayed for the single top class)
const EDU = {
  brain: {
    glioma: {
      what: "Gliomas are brain tumors arising from glial cells. Severity varies by grade.",
      why: "They grow from support cells in the brain; exact causes are often unclear.",
      next: "Neurosurgical review; treatment may include surgery and radiotherapy ± chemotherapy."
    },
    meningioma: {
      what: "Meningiomas grow from the brain’s coverings and are often slow-growing/benign.",
      why: "Sometimes incidental; risks include prior radiation or certain genetic factors.",
      next: "Small asymptomatic tumors may be monitored; otherwise surgery or radiotherapy is considered."
    },
    pituitary: {
      what: "Usually benign growths near the base of the brain; some change hormones.",
      why: "May be hormone-secreting or non-functioning; often found on imaging.",
      next: "Care via endocrinology/neurosurgery: medicines, endoscopic surgery, and/or radiotherapy."
    },
    no_tumor: {
      what: "No tumor features detected by the model.",
      why: "AI may miss subtle findings; imaging quality and other conditions matter.",
      next: "Use clinical judgment; if symptoms persist, seek medical evaluation."
    }
  },
  lung: {
    "Bacterial Pneumonia": {
      what: "A lung infection caused by bacteria with fever, cough, breathlessness.",
      why: "Air sacs fill with inflammatory fluid; risks include age and chronic illness.",
      next: "Clinician may prescribe antibiotics; vaccines and timely care reduce complications."
    },
    "Corona Virus Disease": {
      what: "COVID-19 respiratory illness caused by SARS-CoV-2.",
      why: "Spreads via droplets/aerosols; higher risk with comorbidities.",
      next: "Testing and isolation guidance; antivirals for higher-risk patients per current practice."
    },
    "Normal": {
      what: "No clear abnormality detected by the model.",
      why: "‘Normal’ on AI doesn’t rule out early/subtle disease.",
      next: "Correlate with symptoms; follow up if concerns persist."
    },
    "Tuberculosis": {
      what: "Contagious lung infection from Mycobacterium tuberculosis.",
      why: "Airborne spread; reactivation risk rises with immune compromise.",
      next: "Needs confirmed testing and multi-drug therapy under public-health supervision."
    },
    "Viral Pneumonia": {
      what: "Lung infection from viruses such as influenza or RSV.",
      why: "Viruses inflame airways/air-sacs; severe in infants/older adults/comorbidity.",
      next: "Supportive care; specific antivirals depend on the virus and clinician judgment."
    }
  }
};

// --- helpers ---
function humanSize(b){const u=["B","KB","MB","GB"];let i=0;while(b>=1024&&i<u.length-1){b/=1024;i++;}return (i?b.toFixed(1):b)+" "+u[i];}
function labelFrom(zone,k){
  if (k == null) return undefined;
  const s = String(k);
  if (s.startsWith("class_")) {
    const idx = parseInt(s.split("_")[1], 10);
    return (window.LABELS[zone] && window.LABELS[zone][idx]) ?? s;
  }
  return s;
}

// map free-form labels to EDU keys
function canonical(zone, label) {
  if (!label) return undefined;
  const L = label.toString().trim().toLowerCase().replace(/[_-]+/g, " ");
  if (zone === "brain") {
    if (L === "no tumor" || L === "no tumour" || L === "notumor") return "no_tumor";
    if (L.includes("glioma")) return "glioma";
    if (L.includes("meningioma")) return "meningioma";
    if (L.includes("pituitary")) return "pituitary";
    // try exact match to EDU keys
    const keys = Object.keys(EDU.brain);
    const hit = keys.find(k => k.toLowerCase() === L);
    return hit || label;
  } else {
    const map = {
      "bacterial pneumonia":"Bacterial Pneumonia",
      "viral pneumonia":"Viral Pneumonia",
      "tuberculosis":"Tuberculosis",
      "normal":"Normal",
      "covid":"Corona Virus Disease",
      "covid 19":"Corona Virus Disease",
      "coronavirus disease":"Corona Virus Disease",
      "corona virus disease":"Corona Virus Disease"
    };
    if (map[L]) return map[L];
    const keys = Object.keys(EDU.lung);
    const hit = keys.find(k => k.toLowerCase() === L);
    return hit || label;
  }
}

// accept many possible backend shapes
function normalizeResp(zone, data) {
  let label, conf;

  if ("top" in data) label = data.top;
  else if ("label" in data) label = data.label;
  else if ("prediction" in data) label = data.prediction;
  else if ("top_label" in data) label = data.top_label;
  else if ("top_idx" in data) {
    const i = Number(data.top_idx);
    const serverList = Array.isArray(data.labels) ? data.labels : null;
    label = serverList?.[i] ?? window.LABELS[zone]?.[i] ?? `class_${i}`;
  } else if (data.probs && typeof data.probs === "object") {
    const pairs = Object.entries(data.probs);
    if (pairs.length) {
      pairs.sort((a,b)=>b[1]-a[1]);
      label = pairs[0][0]; conf = pairs[0][1];
    }
  }

  if (conf == null) conf = data.conf ?? data.confidence ?? data.top_prob ?? null;
  const labelMapped = labelFrom(zone, label);
  const eduKey = canonical(zone, labelMapped);
  return { label: labelMapped, eduKey, conf: (typeof conf === "number" ? conf : null) };
}

// wire drag-drop
function wireDropzone(dz){
  const zone = dz.dataset.zone;
  const input = dz.querySelector('input[type="file"]');
  const info  = document.querySelector(`.dz-info[data-info="${zone}"]`);
  const preview = document.getElementById(`preview-${zone}`);

  const setInfo = f => {
    if(!f){ info.textContent="No file selected."; if(preview) preview.style.display="none"; return; }
    info.textContent = `Selected: ${f.name} • ${humanSize(f.size)}`;
    if(preview){
      const r=new FileReader();
      r.onload=e=>{ preview.src=e.target.result; preview.style.display="block"; };
      r.readAsDataURL(f);
    }
  };
  input.addEventListener("change",e=>setInfo(e.target.files[0]));
  ["dragenter","dragover"].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.classList.add("drag");}));
  ["dragleave","drop"].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.classList.remove("drag");}));
  dz.addEventListener("drop",e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f){input.files=e.dataTransfer.files; setInfo(f);}});
}

// run prediction
async function analyze(zone){
  const input  = document.getElementById(`${zone}-file`);
  const result = document.getElementById(`${zone}-result`);
  const bar    = document.getElementById(`${zone}-bar`);
  const btn    = document.querySelector(`[data-analyze="${zone}"]`);
  const info   = document.querySelector(`.dz-info[data-info="${zone}"]`);
  if(!input || !input.files || !input.files[0]){ if(info) info.textContent="Please choose an image first."; return; }

  const original=btn?btn.textContent:""; if(btn){btn.disabled=true;btn.textContent="Analyzing…";} if(bar) bar.style.width="20%";
  result.innerHTML="Running inference…";

  try{
    const fd=new FormData(); fd.append("image",input.files[0]);
    const res = await fetch(URLS[zone], { method:"POST", body:fd });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const norm  = normalizeResp(zone, data);
    const top   = norm.label ?? "—";
    const confP = norm.conf != null ? (norm.conf*100).toFixed(1) + "%" : "—";
    const edu   = (EDU[zone] && EDU[zone][norm.eduKey]) || null;

    result.innerHTML = `
      <div class="verdict"><strong>Prediction:</strong> ${top} <span class="muted">(${confP})</span></div>
      <div class="chips">
        ${zone==="brain"
          ? `<span class="chip"><i>🧠</i>MRI</span><span class="chip"><i>📐</i>~299×299</span><span class="chip"><i>ℹ️</i>Assist tool</span>`
          : `<span class="chip"><i>🫁</i>Chest X-ray</span><span class="chip"><i>📐</i>~224×224</span><span class="chip"><i>ℹ️</i>Assist tool</span>`
        }
      </div>
      <div class="edu card" style="margin-top:10px">
        <h3 style="margin-bottom:6px">${top}: what to know</h3>
        <p>${edu ? edu.what : "Information not available."}</p>
        <p><strong>Why it happens:</strong> ${edu ? edu.why : "—"}</p>
        <p><strong>What to do next:</strong> ${edu ? edu.next : "Consult a clinician."}</p>
        <p class="muted" style="margin-top:8px">Educational content only. Not a diagnosis or treatment plan.</p>
      </div>`;
  }catch(e){
    result.innerHTML = `<span style="color:#fca5a5">Error:</span> ${e.message}`;
  }finally{
    if(bar) bar.style.width="100%"; setTimeout(()=>{if(bar) bar.style.width="0%";},500);
    if(btn){btn.disabled=false;btn.textContent=original;}
  }
}

// ------- boot -------
document.addEventListener("DOMContentLoaded", async () => {
  const y = document.getElementById("y"); if(y) y.textContent = new Date().getFullYear();

  // pull server labels if available
  try{
    const h = await fetch(`${BASE}/health`).then(r=>r.json());
    if (h?.brain?.labels?.length) window.LABELS.brain = h.brain.labels;
    if (h?.lung?.labels?.length)  window.LABELS.lung  = h.lung.labels;
    const status = document.getElementById("status");
    if (status) status.textContent = `brain=${h?.brain?.model||"—"}, lung=${h?.lung?.model||"—"}`;
  }catch{}

  document.querySelectorAll(".dropzone").forEach(wireDropzone);
  document.querySelectorAll("[data-analyze]").forEach(btn => btn.addEventListener("click", () => analyze(btn.dataset.analyze)));
});
