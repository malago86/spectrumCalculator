var data = {};
var dataFiles = ["dataMu", "dataAirKerma", "dataMolybdenum", "dataRhodium", "dataTungsten"];
var symbols={"Tungsten":"W","Molybdenum":"Mo","Rhodium":"Rh"};
var wto = null;
var downloadData = "";
$(document).ready(function () {
    promises = []
    for (f in dataFiles) {
        req = $.ajax({
            type: "GET",
            url: "data/" + dataFiles[f] + ".csv",
            dataType: "text",
            name: dataFiles[f],
            success: function (response, st) {
                // console.log(this);
                data[this.name] = $.csv.toArrays(response);
            }
        });
        promises.push(req);
    }
    $.when.apply(null,promises).done(e => {
        calculate();
    })

    $("input").on("input", function () {
        if($(this).val()!="")
            calculate();
    })

    $("select").on("change", function () {
        calculate();
    })

    $("#calculate").click(function () {
        calculate();
    });
    
})

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
    kVp = $("#kVp").val();
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
            name:"Normalized Fluence"
        },
        {
            x: output["keV"],
            y: output["fluence"],
            name:"Fluence"
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
        outputMCGPU = `#
#
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
        output["keV"].forEach(function (e, i) {
            if (output["fluence"][i] != 0) {
                ph = i==output["keV"].length-1 || output["fluence"][i+1] == 0 ? -output["fluence"][i]: output["fluence"][i];
                outputMCGPU += (output["keV"][i] * 1000) + " " + String((ph/output["keV"][i]).toFixed(3)).padStart(10) + "\n";
            }
        });
        outputMCGPU = outputMCGPU.slice(0, outputMCGPU.length - 1); // remove last \n
        download(outputMCGPU, getFileName()+".spc");
    })
};
    

function generateTable(data) {
    outputTable = "<table style='width:100%'>";
    outputTable += "<tr><th width='50%'>Total fluence (photons/mm²)</th><td>" + output["normFluence"].reduce((partialSum, a) => partialSum + a, 0).toPrecision(3) + "</td></tr>";
    outputTable += "<tr><th>Air Kerma (mGy)</th><td>" + output["mGy2"].reduce((partialSum, a) => partialSum + a, 0).toPrecision(3) + "</td></tr>";
    outputTable += "<tr><th>Avg. Energy (keV)</th><td>"+(output["meanEnergy"].reduce((partialSum, a) => partialSum + a, 0)/output["normFluence"].reduce((partialSum, a) => partialSum + a, 0)).toPrecision(3)+"</td></tr>";
    //<th>Air Kerma (mGy)</th><th>HVL (mm Al)</th><th>Avg. Energy (keV)</th><th>Eff. Energy (keV)</th>
    outputTable += "</table>";

    outputTable += "<table><thead><tr>";
    downloadData=[Object.keys(data).join(",")];
    for (key in data) {
        outputTable += "<th>" + key + "</th>";
    }
    outputTable += "</tr></thead>";
    data["keV"].forEach(function (e,i) {
        outputTable += "<tr>";
        r = [];
        for (key in data) {
            outputTable += "<td>" + Number(data[key][i]).toPrecision(3) + "</td>";
            r.push(Number(data[key][i]));
        }
        outputTable += "</tr>";
        downloadData.push(r.join(","))
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
    data = "";

    var a = document.createElement('a');
    var blob = new Blob([content], {'type':contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}