var data = {};
var dataFiles = ["dataMu", "dataAirKerma", "dataRaw"];
$(document).ready(function () {
    for (f in dataFiles) {
        $.ajax({
            type: "GET",  
            url: "data/"+dataFiles[f]+".csv",
            dataType: "text",
            name:dataFiles[f],
            success: function(response,st)  
            {
                // console.log(this);
                data[this.name] = $.csv.toArrays(response);
            }   
        });
    }

    $("#calculate").click(function () {
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
        output = {
            "keV":[],
            "relativeFluence": [],
            "mGy": [],
            "normalizedFluence":[]
        }

        idx = data["dataRaw"][0].indexOf(kVp);
        data["dataRaw"].slice(1).forEach(function (ed, i) {
            prod = 1;
            inherent.forEach(function (ei) {
                prod *= ei[i];
            });
            output["keV"].push(ed[0]);
            output["relativeFluence"].push(ed[idx] * prod);
            output["mGy"].push(ed[idx] * prod * data["dataAirKerma"].slice(1)[i][2]);
        });

        totalmGy = output["mGy"].reduce((partialSum, a) => partialSum + a, 0);

        data["dataRaw"].slice(1).forEach(function (ed, i) {
            output["normalizedFluence"].push(output["relativeFluence"][i] / totalmGy * airKerma);
        });

        table = generateTable(output);

        $("#output").html(table);
            // relativeFluence.append(dataRaw[str(kVp)][idx] *
            //                     np.prod([f[idx] for f in inherent]))
            // mGy.append(relativeFluence[-1] * dataAirKerma["kerma/fluence"].values[idx])
    });
    
})
    

function generateTable(data) {
    outputTable = "<table><tr>";
    for (key in data) {
        outputTable += "<th>"+key+"</th>";
    }
    outputTable += "</tr>";
    data["keV"].forEach(function (e,i) {
        outputTable += "<tr>";
        for (key in data) {
            outputTable += "<td>" + Number(data[key][i]).toPrecision(3) + "</td>";
        }
        outputTable += "</tr>";
    });

    outputTable += "</table>";

    return outputTable;
}