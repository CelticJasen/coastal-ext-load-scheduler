const todayOutboundContainer = document.getElementById('tableContainerTodayOutbound');
const tomorrowOutboundContainer = document.getElementById('tableContainerTomorrowOutbound');
const todayInboundContainer = document.getElementById('tableContainerTodayInbound');
const tomorrowInboundContainer = document.getElementById('tableContainerTomorrowInbound');

const currentDateElements = document.getElementsByClassName("currentDate");
const currentDate = new Date();

function waitForElement(selector, callback){
    const interval = 100;
    const maxAttempts = 50;

    let attempts = 0;
    const checkForElement = () => {
        const element = document.querySelector(selector);
        if(element) {
            callback(element);
        }
        else {
            attempts++;
            if(attempts < maxAttempts){
                setTimeout(checkForElement, interval);
            }
            else{
                console.error(`Element ${selector} not found after ${maxAttempts} attempts.`);
            }
        }
    };

    checkForElement();
}

function customSort(a, b){
    const dateA = parseLoadTime(a.loadTime);
    const dateB = parseLoadTime(b.loadTime);
    
    return dateA - dateB;
}

function parseLoadTime(loadTime){
    if(loadTime === 'OPEN'){
        new Date(`9999-12-31T00:00:00`)
        return new Date('9999-12-31T00:00:00');
    }

    const cleanedTime = loadTime.replace(/ {2}/g, ' ');

    if(cleanedTime.length === 7 || cleanedTime.length === 6){
        const parts = cleanedTime.split(' ');
        let timePart;

        if(parts[0] && parts[0] !== ''){
            timePart = convertToMilitaryTime(parts[0]);
        }
        else if(parts[1]){
            timePart = convertToMilitaryTime(parts[1]);
        }
        else{
            timePart = parts[0];
        }

        if(timePart){
            return new Date(`9999-12-30T${timePart}`);
        }
        else{
            return new Date(`9999-12-30T00:00:00`);
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
async function createTable(when, how, who) {

    let table = document.createElement('table');

    if(when === "today" && how === "outbnd"){
        table.id = 'todayOutboundTable';
    }
    else if(when === "tomorrow" && how === "outbnd"){
        table.id = 'tomorrowOutboundTable';
    }
    else if(when === "today" && how === "inbnd"){
        table.id = 'todayInboundTable';
    }
    else if(when === "tomorrow" && how === "inbnd"){
        table.id = 'tomorrowInboundTable';
    }

    table.className = 'dynamicTable';

    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    let headers = [
        'Order #', 'Lift #', 'Status','Prod', 'Qty', 'Origin Company', 'Origin City', 'Destination Company', 'Destination City', 'Load Time', 'Deliver Time','Carrier', 'Bill To', 'Driver', 'Truck', 'Trailer', 'PO#', 'Dest PO#', 'Pump', 'Remarks'
    ];

    const tableDiv = document.createElement('div');

    if(when === "today" && how === "outbnd"){
        tableDiv.id = 'tableDivTodayOutbound';
    }
    else if(when === "tomorrow" && how === "outbnd"){
        tableDiv.id = 'tableDivTomorrowOutbound';
    }
    else if(when === "today" && how === "inbnd"){
        tableDiv.id = 'tableDivTodayInbound';
    }
    else if(when === "tomorrow" && how === "inbnd"){
        tableDiv.id = 'tableDivTomorrowInbound';
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

    if(when === "today" && how === "outbnd"){
        todayOutboundContainer.appendChild(tableDiv);
    }
    else if(when === "tomorrow" && how === "outbnd"){
        tomorrowOutboundContainer.appendChild(tableDiv);
    }
    else if(when === "today" && how === "inbnd"){
        todayInboundContainer.appendChild(tableDiv);
    }
    else if(when === "tomorrow" && how === "inbnd"){
        tomorrowInboundContainer.appendChild(tableDiv);
    }

    tableDiv.appendChild(table);

    await populateTable(when, how, who);
}

// Function to dynamically populate the table with the responseData
async function populateTable(when, how, who) {

    let tableBody;

    if(when === "today" && how === "outbnd"){
        tableBody = document.querySelector('#todayOutboundTable tbody');
    }
    else if(when === "tomorrow" && how === "outbnd"){
        tableBody = document.querySelector('#tomorrowOutboundTable tbody');
    }
    else if(when === "today" && how === "inbnd"){
        tableBody = document.querySelector('#todayInboundTable tbody');
    }
    else if(when === "tomorrow" && how === "inbnd"){
        tableBody = document.querySelector('#tomorrowInboundTable tbody');
    }

    try{
        const responseData = await dataRetriever(when, how, who);
        responseData.forEach(function (data) {

            let row = document.createElement('tr');

            // Loop through each property in the data object and create table cells
            for (let key in data) {
                if (data.hasOwnProperty(key) && key != 'timestamp' && key != 'loadDate') {
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
                    else if (key === 'loadTime'){
                        if(data['loadDate'] === 'OPEN'){
                            cell.textContent = data[key];
                        }else{
                            cell.textContent = `${data['loadDate']} ${data[key]}`;
                        }
                    }
                    else if(key === 'display'){
                        cell = document.createElement('button');
                        cell.dataset.id = `${data.ID}`;
                        cell.innerText = 'MARK COMPLETE';
                        cell.style.width = '100%';
                        cell.addEventListener('click', async (event) => {
                            event.preventDefault();
                
                            const number = cell.getAttribute("data-id");

                            let initials;
                            let weight;
                            let bolNumber;

                            do{
                                initials = prompt("Are you sure you want to mark this load as complete? Please enter your initials.");
                            }while(initials === null || initials === "" || initials.length < 2 || initials.length > 3)

                            do{
                                weight = prompt("Enter the weight.");
                            }while(weight === null || weight === "")

                            do{
                                bolNumber = prompt("Enter the BOL#.");
                            }while(bolNumber === null || bolNumber === "")
                
                            if(initials !== null && initials !== "" && confirm(`Are you sure you want to mark load with ID ${number} as complete?`) == true){
                                console.log(initials);
                                const payload = {
                                    number,
                                    initials,
                                    weight,
                                    bolNumber,
                                };
                            
                                try {
                                    const response = await fetch('/update-display-status', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(payload),
                                    });
                            
                                    if (!response.ok) {
                                        throw new Error('Failed to fetch data from server.');
                                    }
                                    
                                    location.reload();
                                    
                                } catch (error) {
                                        console.error('Uh oh!', error);
                                }
                            }
                        });
                    }
                    else {
                        cell.textContent = data[key];
                    }
                    row.appendChild(cell);
                }
            }
            if(row){
                tableBody.appendChild(row);
            }
        });

        let table;

        if(when === "today" && how === "outbnd"){
            table = document.getElementById("todayOutboundTable");
        }
        else if(when === "tomorrow" && how === "outbnd"){
            table = document.getElementById("tomorrowOutboundTable");
        }
        else if(when === "today" && how === "inbnd"){
            table = document.getElementById("todayInboundTable");
        }
        else if(when === "tomorrow" && how === "inbnd"){
            table = document.getElementById("tomorrowInboundTable");
        }
        
        const rows = table.getElementsByTagName("tr");

        for(let i = 0; i < rows.length; i++){
            const cell = rows[i].getElementsByTagName("td")[12];
            if(cell && cell.textContent === "CECHIRE"){
                rows[i].className = "dim-green-row";
            }
            else if(cell && cell.textContent === "CUSTPU"){
                rows[i].className = "dim-orange-row";
            }
        }
    }
    catch (error) {
        console.error('Uh oh!', error);
    }
}

// retrieves information from our server
async function dataRetriever(when, how, who){
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
            how,
            when,
            who,
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
            how,
            when,
            who,
        }

        if(tomorrow.getDay() === 6 || tomorrow.getDay() === 7){
            const weekend = "yes";
            payload.weekend = weekend;
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

for(const element of currentDateElements){
    element.textContent = `(${currentDate.toDateString()})`;
}

/* setTimeout(function(){
    location.reload();
}, 180000); */