function printTable(){
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><link rel="stylesheet" href="./css/styles.css"><style type="text/css" media="print">@page {size: landscape;} body {background-color: white;} * {-webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important;</style><title>External Schedule Report</title></head><header style="background-color:white;"><h2 style="background-color: white; color: black;">External Scheduling Report</h2></header><body>');
    printWindow.document.write(document.getElementById('dynamicTable').outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
        printWindow.print();
        printWindow.close();
    });
}

function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

function formatMilitaryTime(timeIn){
    const [hoursStr, minutesStr] = timeIn.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const period = hours >= 12 ? 'PM' : 'AM';
    const standardHours = hours % 12 === 0 ? 12 : hours % 12;

    const timeOut = `${standardHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    return timeOut;
}

// Function to dynamically create the table
function createTable() {
    if(document.getElementById('tableDiv')){
        document.getElementById('tableDiv').remove();
    }

    var tableContainer = document.getElementById("resultContainer");
    var table = document.createElement("table");
    table.id = "dynamicTable";
    var thead = document.createElement("thead");
    var tbody = document.createElement("tbody");

    var headerRow = document.createElement("tr");
    var headers = [
        "ID", "Lift #", "Load Date","Load Time", "Delivery Date", "Delivery Time", "Product", "Qty", "Origin", "Customer Name", "Carrier","Bill To", "Dest. City", "Dest. State"
    ];

    const tableDiv = document.createElement('div');
    tableDiv.id = 'tableDiv';

    // Create table headers
    headers.forEach(function (header) {
        var th = document.createElement("th");

        th.textContent = header;
        
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    tableContainer.appendChild(tableDiv);
    tableDiv.appendChild(table);

    populateTable();
}   


// Function to dynamically populate the table with the responseData
async function populateTable() {
    const tableBody = document.querySelector("#dynamicTable tbody");

    try{
        const responseData = await dataRetriever();
        responseData.forEach(function (data) {
            var row = document.createElement("tr");
            // Loop through each property in the data object and create table cells
            for (var key in data) {
                if (data.hasOwnProperty(key) && key != 'timestamp') {
                    var cell = document.createElement("td");
    
                    if (key === 'loadTimeFormatted'){
                        if(data[key] !=null){
                            cell.textContent = formatMilitaryTime(data[key]);
                        }
                        else{
                            cell.textContent = '';
                        }
                    }
                    else if (key === 'delTimeFormatted'){
                        if(data[key] !=null){
                            cell.textContent = formatMilitaryTime(data[key]);
                        }
                        else{
                            cell.textContent = '';
                        }
                    }
                    
                    else {
                        cell.textContent = data[key];
                    }
                    row.appendChild(cell);
                }
            }
            tableBody.appendChild(row);
        });

    }
    catch (error) {
        console.error('Uh oh!', error);
    }
}

// retrieves information from our server
async function dataRetriever(){
    const startDate = document.getElementById('beginDate').value;
    const endDate = document.getElementById('endDate').value;

    const payload = {
        startDate,
        endDate
    }

    try {
        const response = await fetch('/read-reports-page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from server.');
        }
        const responseData = await response.json();
        return responseData.result;
        
    } catch (error) {
            console.error('Uh oh!', error);
    }

}

var container = document.getElementById('resultContainer');
var startDate;
var endDate;

document.getElementById('searchButton').addEventListener('click', createTable);

newLogoutButton();

document.getElementById('printButton').addEventListener('click', printTable);
document.addEventListener('DOMContentLoaded', populateTable);

document.getElementById('refreshButton').addEventListener('click', function() {
    fetchProtectedRoute('Reports');
});

if(document.getElementById('schedulerButton')){
    document.getElementById('schedulerButton').addEventListener('click', function() {
        fetchProtectedRoute('Scheduler');
    });
}
if(document.getElementById('lookupButton')){
    document.getElementById('lookupButton').addEventListener('click', function(){
        fetchProtectedRoute('Lookup');
    });
}
if(document.getElementById('reportsButton')){
    document.getElementById('reportsButton').addEventListener('click', function(){
        fetchProtectedRoute('Reports');
    });
}
if(document.getElementById('adminButton')){
    document.getElementById('adminButton').addEventListener('click', function(){
        fetchProtectedRoute('Administration');
    });
}