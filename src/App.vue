<template>
  <div id="app">
    <div id="content">
      <div id="title">
        <div>
          <h1>Spencer: X-Ray Spectrum Calculator</h1>
          <p class="intro-text">Effective anode angle: 22.4º. Inherent filtration: 0.77 mm Be.</p>
        </div>

        <div class="data-sources">
          <span>Data and calculations from:</span>
          <label>
            <input type="radio" id="data-source17" v-model="dataSource" value="17">
            Hernandez et al (2017) Med. Phys. <a
              href="https://aapm.onlinelibrary.wiley.com/doi/full/10.1002/mp.12222"
              target="_blank">[source]</a>
          </label>
          <label>
            <input type="radio" id="data-source78" v-model="dataSource" value="78">
            Report 78 <a href="https://iopscience.iop.org/article/10.1088/0952-4746/18/1/026/meta"
              target="_blank">[source]</a>
          </label>
          <label>
            <input type="radio" id="data-sourceNist" v-model="dataSource" value="Nist">
            NIST X-Ray Tables <a href="https://physics.nist.gov/PhysRefData/FFast/html/form.html"
              target="_blank">[source]</a>
          </label>
        </div>
      </div>

      <div class="main-grid">
        <!-- Inputs Section -->
        <div class="card">
          <div class="card-title">
            Configuration
          </div>
          
          <table class="filter-table">
            <thead>
              <tr>
                <th>Material
                  <select v-model="selectedMaterialToAdd" @change="addFilter" style="margin-left: 10px; width: auto;">
                    <option value="">+ Add filter</option>
                    <option v-for="mat in availableMaterials" :key="mat" :value="mat">{{ mat }}</option>
                  </select>
                </th>
                <th>Inherent (mm)</th>
                <th>Added (mm)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
<tr v-for="(filter, index) in filters" :key="index" :class="{ 'disabled-row': filter.disabled }">
  <td :class="{ 'text-muted': filter.disabled }">
    {{ filter.material }} 
    <i v-if="filter.disabled" class="mdi mdi-alert-circle-outline" title="Material not available in current data source" style="font-size: 0.9rem; margin-left: 4px;"></i>
  </td>
  <td>
    <input type="number" v-model.number="filter.inherent" step="0.01" min="0" :disabled="filter.disabled">
  </td>
  <td>
    <input type="number" v-model.number="filter.additional" step="0.01" min="0" :disabled="filter.disabled">
  </td>
  <td>
    <button @click="removeFilter(index)" class="btn btn-danger btn-icon">
      <i class="mdi mdi-trash-can"></i>
    </button>
  </td>
</tr>
            </tbody>
          </table>

          <div class="input-group">
            <label>Tube Potential (kV)</label>
            <input type="number" v-model.number="kVp" min="20" max="49">
            <span class="text-muted" style="font-size: 0.8rem; color: var(--text-muted)">Range: 20-49</span>
          </div>

          <div class="input-group">
            <label>Air Kerma (mGy)</label>
            <input type="number" v-model.number="airKerma" step="0.05" min="0">
            <span></span>
          </div>

          <div class="input-group">
            <label>Anode Material</label>
            <select v-model="anodeMaterial">
              <option value="Molybdenum">Molybdenum</option>
              <option value="Rhodium">Rhodium</option>
              <option value="Tungsten">Tungsten</option>
            </select>
            <div style="display: flex; gap: 5px;">
            </div>
          </div>
        </div>

        <!-- Output Section -->
        <div class="card">
          <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
            Results
            <div class="button tooltip" title="Share" @click="shareModel">
              <span class="tooltiptext">{{ shareTooltipText }}</span>
              <button class="btn btn-secondary btn-icon"><i class="mdi mdi-share-variant"></i></button>
            </div>
          </div>
          
          <div v-if="summary">
            <table class="summary-table">
              <tr><th>Total fluence (photons/mm²)</th><td>{{ summary.totalFluence }}</td></tr>
              <tr><th>Air Kerma (mGy)</th><td>{{ summary.airKerma }}</td></tr>
              <tr><th>Avg. Energy (keV)</th><td>{{ summary.avgEnergy }}</td></tr>
              <tr><th>HVL (mm Al)</th><td>{{ summary.hvl }}</td></tr>
            </table>

            <div style="margin: 10px 0; text-align: center;">
              <button class="btn btn-secondary" @click="showDetailedTable = !showDetailedTable">
                {{ showDetailedTable ? 'Hide' : 'Show' }} Detailed Table
              </button>
            </div>

            <div v-if="showDetailedTable" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px;">
              <table class="results-table">
                <thead>
                  <tr>
                    <th>keV</th>
                    <th>Inherent Fluence</th>
                    <th>Filtered Fluence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in detailedTable" :key="i">
                    <td>{{ row.keV }}</td>
                    <td>{{ row.inhFluence }}</td>
                    <td>{{ row.filFluence }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="action-bar">
              <button class="btn btn-secondary" @click="downloadMCGPU">MC-GPU File</button>
              <button class="btn btn-secondary" @click="downloadCSV">.csv</button>
            </div>
          </div>
        </div>
      </div>

      <div ref="plotDiv" id="plot"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';
import Polyfit from './utils/polyfit';

// --- State ---
const dataSource = ref("17");
const kVp = ref(29);
const airKerma = ref(1.0);
const anodeMaterial = ref("Tungsten");
const selectedMaterialToAdd = ref("");
const filters = ref([]);
const rawData = reactive({});
const availableMaterials = ref([]);
const shareTooltipText = ref("Share model");
const plotDiv = ref(null);

const summary = ref(null);
const detailedTable = ref([]);
const showDetailedTable = ref(false);
const calculationResults = ref({
  keV: [],
  relFluence: [],
  mGy: [],
  normFluence: [],
  meanEnergy: [],
  fluence: [],
  mGy2: []
});

const symbols = { "Tungsten": "W", "Molybdenum": "Mo", "Rhodium": "Rh" };
const binSize = 0.25;

// --- Helpers ---
const parseCSV = (text) => {
  return text.split('\n')
    .filter(line => line.trim() !== '')
    .map(line => line.split(',').map(cell => cell.trim()));
};

const sequence = (len, max) => {
  return Array.from({ length: len }, (v, k) => (k * max / (len - 1)));
};

// --- Data Loading ---
const loadData = async () => {
  const dataFiles = ["dataMu17", "dataMu78", "dataMuNist", "dataAirKerma", "dataMolybdenum", "dataRhodium", "dataTungsten"];
  try {
    const promises = dataFiles.map(async (file) => {
      const response = await fetch(`./data/${file}.csv`);
      const text = await response.text();
      rawData[file] = parseCSV(text);
    });
    await Promise.all(promises);
    
    updateAvailableMaterials();
    await loadFromURL();
    calculate();
  } catch (error) {
    console.error("Error loading CSV data:", error);
  }
};

const updateAvailableMaterials = () => {
  const sourceKey = "dataMu" + dataSource.value;
  if (rawData[sourceKey]) {
    availableMaterials.value = rawData[sourceKey][0].slice(1);
  }
};

// --- Logic ---
const calculate = () => {
  if (!rawData["dataAirKerma"]) return;

  const currentMuData = rawData["dataMu" + dataSource.value];
  if (!currentMuData) return;

  const results = {
    keV: [],
    relFluence: [],
    mGy: [],
    normFluence: [],
    meanEnergy: [],
    fluence: [],
    mGy2: []
  };

  const kvpStr = String(Number(kVp.value));
  const ak = airKerma.value;
  
  const inherentEffects = filters.value
    .filter(f => !f.disabled)
    .map(f => {
      const idx = currentMuData[0].indexOf(f.material);
      return currentMuData.map((row, i) => i === 0 ? 1 : Math.exp(-row[idx] * f.inherent));
    });

  const additionalEffects = filters.value
    .filter(f => !f.disabled)
    .map(f => {
      const idx = currentMuData[0].indexOf(f.material);
      return currentMuData.map((row, i) => i === 0 ? 1 : Math.exp(-row[idx] * f.additional));
    });

  const anodeData = rawData["data" + anodeMaterial.value];
  if (!anodeData) return;
  const kvpIdx = anodeData[0].indexOf(kvpStr);
  const airKermaData = rawData["dataAirKerma"].slice(1);

  anodeData.slice(1).forEach((row, i) => {
    let prod = 1;
    inherentEffects.forEach(effect => {
      prod *= effect[i + 1];
    });
    results.keV.push(Number(row[0]));
    results.relFluence.push(row[kvpIdx] * prod);
    results.mGy.push(row[kvpIdx] * prod * airKermaData[i][2]);
  });

  const totalmGy = results.mGy.reduce((sum, val) => sum + val, 0);

  anodeData.slice(1).forEach((row, i) => {
    const normFlu = (results.relFluence[i] / totalmGy) * ak;
    results.normFluence.push(normFlu);
    results.meanEnergy.push(normFlu * row[0]);

    let prodAdd = 1;
    additionalEffects.forEach(effect => {
      prodAdd *= effect[i + 1];
    });
    
    const filteredFlu = normFlu * prodAdd;
    results.fluence.push(filteredFlu);
    results.mGy2.push(filteredFlu * airKermaData[i][2]);
  });

  calculationResults.value = results;
  updateUI(results);
  updatePlot(results);
  updateURL();
};

const updateUI = (results) => {
  const totalFluence = results.fluence.reduce((sum, val) => sum + val, 0);
  const totalmGy2 = results.mGy2.reduce((sum, val) => sum + val, 0);
  const avgEnergy = results.meanEnergy.reduce((sum, val) => sum + val, 0) / totalFluence;

  summary.value = {
    totalFluence: totalFluence.toPrecision(3),
    airKerma: totalmGy2.toPrecision(3),
    avgEnergy: avgEnergy.toPrecision(3),
    hvl: getHVL()
  };

  detailedTable.value = [];
  for (let i = 8; i < results.keV.length; i++) {
    detailedTable.value.push({
      keV: (results.keV[i] - binSize).toFixed(1),
      inhFluence: results.normFluence[i].toPrecision(5),
      filFluence: results.fluence[i].toPrecision(5)
    });
  }
};

const updatePlot = (results) => {
  if (!plotDiv.value) return;
  Plotly.newPlot(plotDiv.value, [
    { x: results.keV, y: results.normFluence, name: "Inherent Fluence" },
    { x: results.keV, y: results.fluence, name: "Filtered Fluence" }
  ], {
    height: 400,
    margin: { t: 20, r: 20, b: 40, l: 60 },
    yaxis: {
      automargin: true,
      title: { text: "Fluence (photons/mm²)", standoff: 20 },
      linecolor: "#444",
      gridcolor: "#333"
    },
    xaxis: {
      title: "Energy (keV)",
      range: [0, 50],
      linecolor: "#444",
      gridcolor: "#333"
    },
    legend: { xanchor: 'right', y: 1 },
    font: { size: 14, color: '#f8fafc' },
    plot_bgcolor: '#1e293b',
    paper_bgcolor: '#1e293b'
  });
};

const getHVL = () => {
  const currentMuData = rawData["dataMu" + dataSource.value];
  if (!currentMuData) return "N/A";

  const idxAl = currentMuData[0].indexOf("Al");
  const alThicknesses = sequence(80, 1.6);
  const alFiltration = [];

  const currentmGy2 = calculationResults.value.mGy2;
  if (!currentmGy2 || currentmGy2.length === 0) return "N/A";

  alThicknesses.forEach((thick, idx) => {
    let filteredSum = 0;
    currentmGy2.forEach((val, i) => {
      filteredSum += val * Math.exp(-currentMuData[i + 1][idxAl] * thick);
    });

    if (thick === 0) {
      alFiltration.push(filteredSum);
    } else {
      alFiltration.push(Math.log(filteredSum / alFiltration[0]));
    }
  });

  alFiltration[0] = 0;
  
  try {
    const fit = new Polyfit(alFiltration, sequence(80, 1.6)).getPolynomial(2);
    return fit(Math.log(0.5)).toPrecision(3);
  } catch (e) {
    return "N/A";
  }
};

const addFilter = () => {
  if (!selectedMaterialToAdd.value) return;
  filters.value.push({
    material: selectedMaterialToAdd.value,
    inherent: 0,
    additional: 0
  });
  selectedMaterialToAdd.value = "";
  calculate();
};

const removeFilter = (index) => {
  filters.value.splice(index, 1);
  calculate();
};

const resetAll = () => {
  filters.value = [];
  kVp.value = 29;
  airKerma.value = 1.0;
  anodeMaterial.value = "Tungsten";
  window.history.replaceState(null, "", window.location.origin + window.location.pathname);
  calculate();
};

const shareModel = async () => {
  const url = window.location.href;
  await navigator.clipboard.writeText(url);
  shareTooltipText.value = "Copied to clipboard!";
  setTimeout(() => {
    shareTooltipText.value = "Share model";
  }, 5000);
};

const updateURL = () => {
  const params = new URLSearchParams();
  params.set("data-source", dataSource.value);
  params.set("kVp", kVp.value);
  params.set("airKerma", airKerma.value);
  params.set("anodeMaterial", anodeMaterial.value);

  filters.value.forEach(f => {
    if (f.inherent !== 0) params.set(`${f.material}-1`, f.inherent);
    if (f.additional !== 0) params.set(`${f.material}-2`, f.additional);
  });

  const newUrl = window.location.origin + window.location.pathname + '?' + params.toString();
  window.history.replaceState(null, "", newUrl);
};

const loadFromURL = async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("data-source")) dataSource.value = params.get("data-source");
  if (params.get("kVp")) kVp.value = Number(params.get("kVp"));
  if (params.get("airKerma")) airKerma.value = Number(params.get("airKerma"));
  if (params.get("anodeMaterial")) anodeMaterial.value = params.get("anodeMaterial");

  await nextTick();

  const loadedFilters = [];
  const materials = rawData["dataMu" + dataSource.value]?.[0].slice(1) || [];
  
  materials.forEach(mat => {
    const inh = params.get(`${mat}-1`);
    const add = params.get(`${mat}-2`);
    if (inh || add) {
      loadedFilters.push({
        material: mat,
        inherent: inh ? Number(inh) : 0,
        additional: add ? Number(add) : 0
      });
    }
  });
  filters.value = loadedFilters;
  updateAvailableMaterials();
};

const downloadCSV = () => {
  const results = calculationResults.value;
  let csvContent = "keV,Inherent Fluence,Filtered Fluence,fluence/keV\n";
  
  for (let i = 8; i < results.keV.length; i++) {
    const row = [
      (results.keV[i] - binSize).toFixed(1),
      results.normFluence[i].toPrecision(5),
      results.fluence[i].toPrecision(5),
      (results.fluence[i] / results.keV[i]).toFixed(5)
    ];
    csvContent += row.join(",") + "\n";
  }

  const filename = symbols[anodeMaterial.value] + kVp.value + "kVp.csv";
  downloadFile(csvContent, filename);
};

const downloadMCGPU = () => {
  const results = calculationResults.value;
  let content = `#----------------------------------------------------
#  Spectrum generated using DIDSR's online tool:
#    https://malago86.github.io/spectrumCalculator/
#
#  Based on data from:
#    Hernandez, A.M., Seibert, J.A., Nosratieh, A. 
#    and Boone, J.M. (2017), Generation and analysis 
#    of clinically relevant breast imaging x-ray 
#    spectra. Med. Phys., 44: 2148-2160. 
#    https://doi.org/10.1002/mp.12222
#
#  Energy [eV]    Num. photons/(mm^2*keV)
# ----------------------------------------------------
`;
  let lastkeV = -1;
  results.keV.forEach((e, i) => {
    if (results.fluence[i] >= 1) {
      const fluence = results.fluence[i];
      lastkeV = (e - binSize);
      content += (lastkeV * 1000) + " " + String((fluence / e).toFixed(3)).padStart(10) + "\n";
    }
  });
  content += ((lastkeV + binSize * 2) * 1000) + " -1";
  
  const filename = symbols[anodeMaterial.value] + kVp.value + "kVp.spc";
  downloadFile(content, filename);
};

const downloadFile = (content, filename) => {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

onMounted(loadData);

watch([dataSource, kVp, airKerma, anodeMaterial, filters], () => {
  calculate();
}, { deep: true });

watch(dataSource, () => {
  const sourceKey = "dataMu" + dataSource.value;
  const available = rawData[sourceKey] ? rawData[sourceKey][0].slice(1) : [];
  
  filters.value.forEach(f => {
    f.disabled = !available.includes(f.material);
  });
  updateAvailableMaterials();
});
</script>

<style>
@import "@mdi/font/css/materialdesignicons.css";
</style>
<style src="./assets/style.css"></style>