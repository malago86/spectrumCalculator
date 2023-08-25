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
        "relativeFluence": [],
        "mGy": [],
        "normalizedFluence": [],
        "fluence": []
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
        output["relativeFluence"].push(ed[idx] * prod);
        output["mGy"].push(ed[idx] * prod * data["dataAirKerma"].slice(1)[i][2]);
    });

    totalmGy = output["mGy"].reduce((partialSum, a) => partialSum + a, 0);

    data["data"+anode].slice(1).forEach(function (ed, i) {
        output["normalizedFluence"].push(output["relativeFluence"][i] / totalmGy * airKerma);
        prod = 1;
        additional.forEach(function (ei) {
            prod *= ei[i];
        });
        output["fluence"].push((output["relativeFluence"][i] / totalmGy * airKerma) * prod);
    });

    table = generateTable(output);

    $("#output #table").html(table);

    // plotElement = document.getElementById('plot');
    // plotElement.innerHTML = "";
    // if (document.getElementById('plot').innerHTML == "") {

        Plotly.newPlot("plot", [{
            x: output["keV"],
            y: output["normalizedFluence"],
            name:"Normalized Fluence"
        },
        {
            x: output["keV"],
            y: output["fluence"],
            name:"Fluence"
        }],
            {
                margin: { t: 0 },
                title: "fluence",
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
        filename = symbols[$("#anodeMaterial").val()] + $("#kVp").val() + "kVp";
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
        download(downloadData, filename+".csv");
    })
};
    

function generateTable(data) {
    outputTable = "<thead><tr>";
    downloadData=[Object.keys(data).join(",")];
    for (key in data) {
        outputTable += "<th>" + key + "</th>";
    }
    outputTable += "</tr></thead>";
    data["keV"].forEach(function (e,i) {
        outputTable += "<tr>";
        r = [];
        for (key in data) {
            outputTable += "<td>" + Number(data[key][i]).toPrecision(4) + "</td>";
            r.push(Number(data[key][i]));
        }
        outputTable += "</tr>";
        downloadData.push(r.join(","))
    });

    downloadData = downloadData.join("\n");

    return outputTable;
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