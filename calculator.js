var data = {};
var dataFiles = ["dataMu17", "dataMu78","dataMuNist","dataAirKerma", "dataMolybdenum", "dataRhodium", "dataTungsten"];
var symbols={"Tungsten":"W","Molybdenum":"Mo","Rhodium":"Rh"};
var wto = null;
var downloadData = "";
var binSize = 0.25;

urlParams = new URLSearchParams(window.location.search);

$(document).ready(function () {
    promises = []
    for (f in dataFiles) {
        req = $.ajax({
            type: "GET",
            url: "data/" + dataFiles[f] + ".csv",
            dataType: "text",
            name: dataFiles[f],
            success: function (response, st) {
                data[this.name] = $.csv.toArrays(response);
            }
        });
        promises.push(req);
    }
    $.when.apply(null, promises).done(e => {
        if (urlParams.get("data-source") != null) {
            $("input[type=radio][name=data-source]").prop("checked", false);
            $("input[type=radio][name=data-source][value='" + urlParams.get("data-source") + "']").prop("checked", true);
        }
        reset($('input[name="data-source"]:checked').val());
        fillDefaults();
        calculate();
    });
    
    $("input[type=radio][name=data-source]").on("change", function () {
        reset($('input[name="data-source"]:checked').val());
        $("#input table.tg tbody tr").remove();
        urlParams = new URLSearchParams();
        window.history.replaceState(window.history.state, window.document.title, window.location.origin + window.location.pathname);
    })

    $("body").on("change","input", function () {
        calculate();
        getURL();
        // $(this).val(Number($(this).val()));
    })

    $("#material-options").on("change", function () {
        addFilter($(this).val());
        $(this).val("Add filter");
        return false;
    })

    $("select").on("change", function () {
        calculate();
        getURL();
    })

    $("#reset").click(function () {
        reset($('input[name="data-source"]:checked').val());
        $("#input table.tg tbody tr").remove();
        urlParams = new URLSearchParams();
        window.history.replaceState(window.history.state, window.document.title, window.location.origin + window.location.pathname);
    });    

    $("#share").click(function () {
        var copyText = window.location.origin + window.location.pathname + '?' + encodeURI(urlParams);

        // Copy the text inside the text field
        navigator.clipboard.writeText(copyText);

        // Alert the copied text
        $("#share #share-tooltip").text("Copied to clipboard!");

        setTimeout(function () {
            $("#share #share-tooltip").text("Share model");
        },5000)
    });
})

function reset(dataSource="17") {
    $(".inherent").each(function (i, e) {
        $(e).val(0);
    });
    $(".additional").each(function (i, e) {
        $(e).val(0);
    });

    $("#material-options option").remove();
    $("#material-options").append($("<option>", {
        value: "Add filter",
        text: "Add filter"
    }));
    
    data["dataMu"] = data["dataMu" + dataSource];
    
    $.each(data["dataMu"][0].slice(1), function (idx, e) {
        $("#material-options").append($("<option>", {
            value: e,
            text: e
        }));
    });

    calculate();
}

function addFilter(element) {
    $("#input table.tg tbody").append('<tr> \
                <td>'+element+'</td> \
                <td><input type="number" class="inherent" id="'+element+'-1" value="0" step="0.05" min="0"></td> \
                <td><input type="number" class="additional" id="'+element+'-2" value="0" step="0.05" min="0"></td> \
            </tr>');
}

function fillDefaults() {
    entries = urlParams.entries();
    for (const entry of entries) {
        if (entry[0] == "data-source") {
        }
        else if($("#" + entry[0]).length == 0)
            addFilter(entry[0].split("-")[0]);
        key = entry[0];
        val = entry[1];
        $("#" + key).val(val);
    }
}

function calculate() {
    output = {
        "keV": [],
        "relFluence": [],
        "mGy": [],
        "normFluence": [],
        "meanEnergy":[],
        "fluence": [],
        "mGy2":[]
    }
    kVp = String(Number($("#kVp").val()));
    airKerma = $("#airKerma").val();
    inherent = [];
    $(".inherent").each(function (i, e) {
        material = e.id.split("-")[0];
        idx = data["dataMu"][0].indexOf(material);
        k = [];
        data["dataMu"].forEach(function (ed) {
            k.push(Math.exp(-ed[idx] * e.value));
        });
        inherent.push(k.slice(1));
    });
    additional = [];
    $(".additional").each(function (i, e) {
        material = e.id.split("-")[0];
        idx = data["dataMu"][0].indexOf(material);
        k = [];
        data["dataMu"].forEach(function (ed) {
            k.push(Math.exp(-ed[idx] * e.value));
        });
        additional.push(k.slice(1));
    });

    anode = $("#anodeMaterial").val();

    idx = data["data"+anode][0].indexOf(kVp);
    data["data"+anode].slice(1).forEach(function (ed, i) {
        prod = 1;
        inherent.forEach(function (ei) {
            prod *= ei[i];
        });
        output["keV"].push(Number(ed[0]));
        output["relFluence"].push(ed[idx] * prod);
        output["mGy"].push(ed[idx] * prod * data["dataAirKerma"].slice(1)[i][2]);
    });

    totalmGy = output["mGy"].reduce((partialSum, a) => partialSum + a, 0);

    data["data"+anode].slice(1).forEach(function (ed, i) {
        output["normFluence"].push(output["relFluence"][i] / totalmGy * airKerma);
        output["meanEnergy"].push(output["relFluence"][i] / totalmGy * airKerma * ed[0])
        prod = 1;
        additional.forEach(function (ei) {
            prod *= ei[i];
        });
        fluence = (output["relFluence"][i] / totalmGy * airKerma) * prod;
        output["fluence"].push(fluence);
        output["mGy2"].push(fluence * data["dataAirKerma"].slice(1)[i][2]);
    });

    table = generateTable(output);

    $("#output #table").html(table);

    // plotElement = document.getElementById('plot');
    // plotElement.innerHTML = "";
    // if (document.getElementById('plot').innerHTML == "") {

        Plotly.newPlot("plot", [{
            x: output["keV"],
            y: output["normFluence"],
            name:"Inherent Fluence"
        },
        {
            x: output["keV"],
            y: output["fluence"],
            name:"Filtered Fluence"
        }],
            {
                height: 350,
                margin: { t: 0 },
                // title: "fluence",
                yaxis: {
                    automargin: true,
                    title: {
                        text: "Fluence (photons/mm²)",
                        standoff: 30
                    },
                    linecolor: "white",
                    
                },
                xaxis: {
                    title: "Energy (keV)",
                    range: [0, 50],
                    linecolor:"white"
                },
                legend: {
                    xanchor: 'right',
                    y: .9
                },
                font: {
                    size: 20,
                    color: 'white'
                },
                plot_bgcolor: '#222',
                paper_bgcolor: '#222'
            }
    );
    $("#download").click(function () {
        download(downloadData, getFileName()+".csv");
    })

    $("#downloadMCGPU").click(function () {
        outputMCGPU = `#----------------------------------------------------
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
`
        lastkeV = -1;
        output["keV"].forEach(function (e, i) {
            if (output["fluence"][i] >= 1) {
                fluence = output["fluence"][i];
                lastkeV = (output["keV"][i]-binSize);
                outputMCGPU += (lastkeV* 1000) + " " + String((fluence / output["keV"][i]).toFixed(3)).padStart(10) + "\n";
            }
        });

        // outputMCGPU = outputMCGPU.slice(0, outputMCGPU.length - 1); // remove last \n
        outputMCGPU+=(lastkeV+binSize*2)*1000+" -1"
        download(outputMCGPU, getFileName()+".spc");
    })
};
    

function generateTable(data) {
    outputTable = "<table style='width:100%'>";
    outputTable += "<tr><th width='50%'>Total fluence (photons/mm²)</th><td>" + output["fluence"].reduce((partialSum, a) => partialSum + a, 0).toPrecision(3) + "</td></tr>";
    outputTable += "<tr><th>Air Kerma (mGy)</th><td>" + output["mGy2"].reduce((partialSum, a) => partialSum + a, 0).toPrecision(3) + "</td></tr>";
    outputTable += "<tr><th>Avg. Energy (keV)</th><td>" + (output["meanEnergy"].reduce((partialSum, a) => partialSum + a, 0) / output["fluence"].reduce((partialSum, a) => partialSum + a, 0)).toPrecision(3) + "</td></tr>";
    outputTable += "<tr><th>HVL (mm Al)</th><td>"+getHVL()+"</td></tr>";
    //<th>Air Kerma (mGy)</th><th>HVL (mm Al)</th><th>Avg. Energy (keV)</th><th>Eff. Energy (keV)</th>
    outputTable += "</table>";

    showColumns = { "keV": "keV", "normFluence": "Inherent Fluence", "fluence": "Filtered Fluence" }

    outputTable += "<table style='width:100%'><thead><tr>";
    downloadData=[Object.keys(data).join(",")+",fluence/keV"];
    for (key in showColumns) {
        outputTable += "<th>" + showColumns[key] + "</th>";
    }
    outputTable += "</tr></thead>";
    data["keV"].forEach(function (e, i) {
        if (i >= 8) {
            outputTable += "<tr>";
            r = [];
            for (key in showColumns) {
                d = Number(data[key][i]);
                d = d.toPrecision(5);
                if (key == "keV") {
                    d -= binSize;
                    d = d.toFixed(1);
                }
                outputTable += "<td>" + d + "</td>";
                r.push(Number(data[key][i]));
            }
            //add one more field for num photons/(mm^2*keV)
            r.push(data["fluence"][i] / data["keV"][i]);

            outputTable += "</tr>";
            downloadData.push(r.join(","))
        }
    });

    outputTable += "</table>";

    downloadData = downloadData.join("\n");

    return outputTable;
}


function getFileName() {
    filename=symbols[$("#anodeMaterial").val()] + $("#kVp").val() + "kVp";
    $(".inherent").each(function (i, e) {
        material = e.id.split("-")[0];
        if (e.value > 0)
            filename += "_" + material + e.value * 1000 + "um";
    });
    additional = [];
    $(".additional").each(function (i, e) {
        material = e.id.split("-")[0];
        if (e.value > 0)
            filename += "_" + material + e.value * 1000 + "um";
    });
    return filename;
}

function download(content, filename)
{
    contentType = 'application/octet-stream';
    // dataDownload = "";

    var a = document.createElement('a');
    var blob = new Blob([content], {'type':contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function getURL() {
    urlParams = new URLSearchParams();
    $("input").each(function (i, e) {
        if(e.name!="data-source")
            if (!isNaN(e.value) && e.value != 0)
                urlParams.set(e.id,Number(e.value));
    });
    $("select").each(function (i, e) {
        if(e.id!="material-options")
            urlParams.set(e.id,$(e).find(":selected").val());
    });

    urlParams.set("data-source",$('input[name="data-source"]:checked').val());

    let url = window.location.origin + window.location.pathname + '?' + encodeURI(urlParams);
    
    window.history.replaceState(window.history.state, window.document.title, url);
    // window.location.search = urlParams;
}

function getHVL() {
    aluminumFiltration = [];
    idxAl = data["dataMu"][0].indexOf("Al");
    aluminumThickness = sequence(80, 1.6);
    for (mmAl in aluminumThickness) {
        filteredSpectrum = [];
        output["mGy2"].forEach(function (ed, i) {
            filteredSpectrum.push(ed*Math.exp(-data["dataMu"][i+1][idxAl]*aluminumThickness[mmAl]))
        });
        totalAirKerma = filteredSpectrum.reduce((partialSum, a) => partialSum + a, 0);
        if(aluminumThickness[mmAl]==0)
            aluminumFiltration.push(totalAirKerma);
        else
            aluminumFiltration.push(Math.log(totalAirKerma/aluminumFiltration[0]));
    }
    aluminumFiltration[0] = 0;

    fit = Polyfit(aluminumFiltration,sequence(80,1.6)).getPolynomial(2);

    hvl = "N/A";
    // if (aluminumFiltration[aluminumFiltration.length - 1] < Math.log(0.6)) {
        hvl=fit(Math.log(.5)).toPrecision(3);
    // } else {
    //     hvl = "Stage 2";
    // }

    return hvl;
}

const regress = (x, y) => {
    const n = y.length;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
        sx += x[i];
        sy += y[i];
        sxy += x[i] * y[i];
        sxx += x[i] * x[i];
        syy += y[i] * y[i];
    }
    const mx = sx / n;
    const my = sy / n;
    const yy = n * syy - sy * sy;
    const xx = n * sxx - sx * sx;
    const xy = n * sxy - sx * sy;
    const slope = xy / xx;
    const intercept = my - slope * mx;
    const r = xy / Math.sqrt(xx * yy);
    const r2 = Math.pow(r,2);
    let sst = 0;
    for (let i = 0; i < n; i++) {
       sst += Math.pow((y[i] - my), 2);
    }
    const sse = sst - r2 * sst;
    const see = Math.sqrt(sse / (n - 2));
    const ssr = sst - sse;
    return {slope, intercept, r, r2, sse, ssr, sst, sy, sx, see};
}

function sequence(len, max) {
    return Array.from({length: len}, (v, k) => (k * max / (len - 1)));
}