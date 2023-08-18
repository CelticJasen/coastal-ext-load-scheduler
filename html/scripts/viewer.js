function customSort(a, b){
    const dateA = parseLoadTime(a.loadTime);
    const dateB = parseLoadTime(b.loadTime);
    
    return dateA - dateB;
}

function parseLoadTime(loadTime){
    if(loadTime === 'OPEN'){
        return new Date('9999-12-31T00:00:00');
    }

    const cleanedTime = loadTime.replace(/ {2}/g, ' ');

    if(cleanedTime.length === 15 || cleanedTime.length === 8){
        const parts = cleanedTime.split(' ');
        const datePart = parts[0];
        const dateParts = datePart.split('/');
        const cleanDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
        let timePart;

        if(parts[1]){
            timePart = convertToMilitaryTime(parts[1]);
        }
        else{
            timePart = parts[1];
        }

        if(timePart){
            return new Date(`20${cleanDate}T${timePart}`);
        }
        else{
            return new Date(`20${cleanDate}T00:00:00`);
        }
    }
    else{
        return new Date('9999-12-30T00:00:00');
    }
}

function convertToMilitaryTime(timeString) {
    const [time, period] = timeString.split(/(\d+:\d+)([APMapm]+)/).filter(Boolean);
    const [hours, minutes] = time.split(":").map(Number);

    if (period.toLowerCase() === "pm" && hours !== 12) {
        return `${hours + 12}:${minutes.toString().padStart(2, "0")}:00`;
    } else if (period.toLowerCase() === "am" && hours === 12) {
        return `00:${minutes.toString().padStart(2, "0")}:00`;
    }
  
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
}

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
function createTable(when) {
    let table = document.createElement('table');

    if(when === "today"){
        table.id = 'todayOutboundTable';
    }
    else if(when === "tomorrow"){
        table.id = 'tomorrowOutboundTable';
    }

    table.className = 'dynamicTable';

    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    let headers = [
        'Order #', 'Lift #', 'Status','Prod', 'Qty', 'Origin Company', 'Origin City', 'Destination Company', 'Destination City', 'Load Time', 'Deliver Time','Carrier', 'Bill To', 'Driver', 'Truck', 'Trailer', 'PO#', 'Dest PO#', 'Pump', 'Remarks'
    ];

    const tableDiv = document.createElement('div');

    if(when === "today"){
        tableDiv.id = 'tableDivTodayOutbound';
    }
    else if(when === "tomorrow"){
        tableDiv.id = 'tableDivTomorrowOutbound';
    }

    tableDiv.className = 'tableDiv';

    // Create table headers
    headers.forEach(function (header) {
        let th = document.createElement('th');

        th.textContent = header;
        
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    if(when === "today"){
        todayOutboundContainer.appendChild(tableDiv);
    }
    else if(when === "tomorrow"){
        tomorrowOutboundContainer.appendChild(tableDiv);
    }

    tableDiv.appendChild(table);

    populateTable(when);
}

// Function to dynamically populate the table with the responseData
async function populateTable(when) {
    let tableBody;

    if(when === "today"){
        tableBody = document.querySelector('#todayOutboundTable tbody');
    }
    else if(when === "tomorrow"){
        tableBody = document.querySelector('#tomorrowOutboundTable tbody');
    }

    try{
        const responseData = await dataRetriever(when);
        responseData.forEach(function (data) {

            let row = document.createElement('tr');

            // Loop through each property in the data object and create table cells
            for (let key in data) {
                if (data.hasOwnProperty(key) && key != 'timestamp') {
                    let cell = document.createElement('td');
                    
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

        let table;

        if(when === "today"){
            table = document.getElementById("todayOutboundTable");
        }
        else if(when === "tomorrow"){
            table = document.getElementById("tomorrowOutboundTable");
        }
        
        const rows = table.getElementsByTagName("tr");

        for(let i = 0; i < rows.length; i++){
            const cell = rows[i].getElementsByTagName("td")[12];
            if(cell && cell.textContent === "CECHIRE"){
                rows[i].style.backgroundColor = "lightgreen";
            }
            else if(cell && cell.textContent === "CUSTPU"){
                rows[i].style.backgroundColor = "#FFCC99";
            }
        }
    }
    catch (error) {
        console.error('Uh oh!', error);
    }
}

// retrieves information from our server
async function dataRetriever(when){
    let payload;

    if(when === "today"){
        const today = new Date();
    
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        let monthString = month.toString();
    
        if(monthString.length === 1){
            monthString = '0' + monthString;
        }
    
        const day = today.getDate();
    
        const startDate = year + '-' + monthString + '-' + day;

        payload = {
            startDate,
        }
    }
    else if(when === "tomorrow"){
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
    
        const year = tomorrow.getFullYear();
        const month = tomorrow.getMonth() + 1;
        let monthString = month.toString();
    
        if(monthString.length === 1){
            monthString = '0' + monthString;
        }
    
        const day = tomorrow.getDate();
    
        const startDate = year + '-' + monthString + '-' + day;

        payload = {
            startDate,
        }
    }

    try {
        const response = await fetch('/read-viewer', {
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
        
        let combinedResponseArray = responseData.result;

        const extResponse = await fetch('/read-ext-viewer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if(!response.ok){
            throw new Error('Failed to fetch external data from server.');
        }

        const extResponseData = await extResponse.json();
        
        combinedResponseArray = combinedResponseArray.concat(extResponseData.result);

        combinedResponseArray.sort(customSort);

        return combinedResponseArray;
        
    } catch (error) {
            console.error('Uh oh!', error);
    }
}

const todayOutboundContainer = document.getElementById('tableContainerTodayOutbound');
const tomorrowOutboundContainer = document.getElementById('tableContainerTomorrowOutbound');
const todayInboundContainer = document.getElementById('tableContainerTodayInbound');
const tomorrowInboundContainer = document.getElementById('tableContainerTomorrowInbound');

window.onload = function(){
    createTable("today");
    createTable("tomorrow");
}

const currentDateElements = document.getElementsByClassName("currentDate");
const currentDate = new Date();

for(const element of currentDateElements){
    element.textContent = currentDate.toDateString();
}

/* document.getElementById('searchButton').addEventListener('click', createTable);

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
} */