function createFormDiv(id, labelText, uniqueDataArray) {
    const formDiv = document.createElement('div');
    formDiv.setAttribute('class', 'formDiv');
    formDiv.id = id;

    const label = document.createElement('p');
    label.innerHTML = labelText;
    formDiv.appendChild(label);

    if (uniqueDataArray) {
        addDropdown(uniqueDataArray, formDiv);
    }

    return formDiv;
}

//function to fix time input formats
function timeFormatter(timeIn){
    if(timeIn == ''){
        return null;
    }
    const [timeString, period] = timeIn.split(' ');
    const [hoursString, minutesString] = timeString.split(':');
    let hours = parseInt(hoursString, 10);
    if (period === 'PM' && hours < 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    const seconds = 0;
    return  `${hours.toString().padStart(2, '0')}:${minutesString}:${seconds.toString().padStart(2, '0')}`;
}

// function to create dropdown lists or input fields
function addDropdown(formData, div) {
    let data = formData.filter((elements) => {
        return elements !== null;
    });

    const dropdown = document.createElement('select');
    const placeholder = document.createElement('option');

    placeholder.text = 'Select an option';
    placeholder.setAttribute('disabled', true);
    placeholder.setAttribute('selected', true);
    placeholder.setAttribute('hidden', true);
    dropdown.setAttribute('class', 'formInput');
    //dropdown.setAttribute('required', true);

    if (data.length > 1) {
        dropdown.add(placeholder);
    }

    data.forEach((optionText) => {
        let option = document.createElement('option');
        option.text = optionText;
        dropdown.add(option);
    });

    div.appendChild(dropdown);
}

// function to remove duplicates from the arrays
function uniqueData(array) {
    let uniqueArray = [];

    for (let i = 0; i < array.length; i++) {
        if (uniqueArray.indexOf(array[i]) === -1) {
            uniqueArray.push(array[i]);
        }
    }

    return uniqueArray.sort();
}

document.getElementById('submit_button').addEventListener('click', async (event) => {
    event.preventDefault();
  
    // tries to remove previous form
    if (document.getElementById('schedule_form')) {
      document.getElementById('schedule_form').remove();
    }
  
    // defines containers and number
    const number = document.getElementById('number').value;
    var sched_form = document.createElement('form');
    sched_form.setAttribute('id', 'schedule_form');
    var container = document.getElementById('resultContainer');
  
    // retrieves information from dearman server
    try {
        const response = await fetch('/submit-read-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from server.');
        }

        const responseData = await response.json();

        if (responseData.result.length === 0) {
            const invalidLiftNumber = document.createElement('span');
            invalidLiftNumber.setAttribute('id', 'schedule_form');
            invalidLiftNumber.innerHTML = 'Invalid Lift Number!';
            container.appendChild(invalidLiftNumber);
        }
        else {
            const data = responseData.result;

            const conRefs = data.map((row) => row.ConRef);
            const prodNames = data.map((row) => row.ProdName);
            const tpNames = data.map((row) => row.TpName);
            const destCities = data.map((row) => row.DestCity);
            const destState = data.map((row) => row.DestState);
            const carNames = data.map((row) => row.CarName1);
            const custNames = data.map((row) => row.Custname);

            // creates input elements for the generated form
            const final_submit = document.createElement('INPUT');
            const loadDate = document.createElement('INPUT');
            const loadTime = document.createElement('INPUT');
            const delDate = document.createElement('INPUT');
            const delTime = document.createElement('INPUT');

            final_submit.setAttribute('type', 'submit');
            final_submit.setAttribute('class', 'formInput');
            final_submit.setAttribute('id', 'formSubmit');
            final_submit.setAttribute('value', 'Submit');
            loadDate.setAttribute('type', 'date');
            loadDate.setAttribute('class', 'formInput');
            loadTime.setAttribute('type', 'time');
            loadTime.setAttribute('class', 'formInput');
            delDate.setAttribute('type', 'date');
            delDate.setAttribute('class', 'formInput');
            delTime.setAttribute('type', 'time');
            delTime.setAttribute('class', 'formInput');

            const countyInput = document.createElement('select');
            countyInput.setAttribute('class', 'formInput');

            // labels for input fields
            const labelNames = ['liftLabel', 'loadDateLabel', 'delDateLabel', 'prodLabel', 'originLabel', 'destLabel', 'stateLabel', 'countyLabel', 'carLabel', 'custLabel'];
            const labels = {};

            for (const labelName of labelNames) {
                labels[labelName] = document.createElement('p');
            }

            // adds input fields to the form
            sched_form.appendChild(createFormDiv('liftDiv', 'Lift Number:', uniqueData(conRefs)));

            const loadTimeDiv = createFormDiv('loadTimeDiv', 'Load Date & Time:');
            loadTimeDiv.appendChild(loadDate);
            loadTimeDiv.appendChild(loadTime);
            sched_form.appendChild(loadTimeDiv);

            const delTimeDiv = createFormDiv('delTimeDiv', 'Delivery Date & Time:');
            delTimeDiv.appendChild(delDate);
            delTimeDiv.appendChild(delTime);
            sched_form.appendChild(delTimeDiv);

            sched_form.appendChild(createFormDiv('prodDiv', '<span>*</span>Product:', uniqueData(prodNames)));
            sched_form.appendChild(createFormDiv('originDiv', '<span>*</span>Origin:', uniqueData(tpNames)));
            sched_form.appendChild(createFormDiv('cityDiv', '<span>*</span>City:', uniqueData(destCities)));
            sched_form.appendChild(createFormDiv('stateDiv', '<span>*</span>State:', uniqueData(destState)));
            sched_form.appendChild(createFormDiv('countyDiv', 'County:', uniqueData(countyInput)));
            sched_form.appendChild(createFormDiv('carDiv', '<span>*</span>Carrier:', uniqueData(carNames)));
            sched_form.appendChild(createFormDiv('custDiv', '<span>*</span>Customer:', uniqueData(custNames)));

            sched_form.appendChild(final_submit);

            // adds form to the page
            container.appendChild(sched_form);

            // makes lift number read-only
            document.getElementsByClassName('formInput')[0].setAttribute('readonly', true);

            // scrolls to bottom of page on button click
            window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'smooth' });

            const submitButtonInput = document.getElementById('formSubmit');

            const asyncClickListener = async (event) => {
                event.preventDefault();

                if (document.getElementById('responseText')) {
                    document.getElementById('responseText').remove();
                }

                //names for input fields
                const theForm = document.getElementById('schedule_form');
                const children = theForm.querySelectorAll('.formInput');
                children[0].setAttribute('name', 'liftNumber');
                children[1].setAttribute('name','loadDateInput');
                children[2].setAttribute('name','loadTimeInput');
                children[3].setAttribute('name','delDateInput');
                children[4].setAttribute('name','delTimeInput');
                children[5].setAttribute('name', 'productInput');
                children[6].setAttribute('name', 'originInput');
                children[7].setAttribute('name', 'destCityInput');
                children[8].setAttribute('name', 'destStateInput');
                children[9].setAttribute('name', 'countyInput')
                children[10].setAttribute('name', 'carInput');
                children[11].setAttribute('name', 'custInput');

                children[0].setAttribute('id', 'liftNumber');
                children[1].setAttribute('id','loadDateInput');
                children[2].setAttribute('id','loadTimeInput');
                children[3].setAttribute('id','delDateInput');
                children[4].setAttribute('id','delTimeInput');
                children[5].setAttribute('id', 'productInput');
                children[6].setAttribute('id', 'originInput');
                children[7].setAttribute('id', 'destCityInput');
                children[8].setAttribute('id', 'destStateInput');
                children[9].setAttribute('id', 'countyInput');
                children[10].setAttribute('id', 'carInput');
                children[11].setAttribute('id', 'custInput');

                // get form inputs
                const liftNumber = conRefs[0];
                let loadDateInput = document.getElementById('loadDateInput').value;
                if(loadDateInput == ''){
                    loadDateInput = null;
                }
                const loadTimeInput = document.getElementById('loadTimeInput').value;
                const formattedLoadTime = timeFormatter(loadTimeInput);
                let delDateInput = document.getElementById('delDateInput').value;
                if(delDateInput == ''){
                    delDateInput = null;
                }
                const delTimeInput = document.getElementById('delTimeInput').value;
                const formattedDelTime = timeFormatter(delTimeInput);
                const productInput = document.getElementById('productInput').value;
                const originInput = document.getElementById('originInput').value;
                const destCityInput = document.getElementById('destCityInput').value;
                const destStateInput = document.getElementById('destStateInput').value;
                const carInput = document.getElementById('carInput').value;
                const custInput = document.getElementById('custInput').value;

                const resultContainer = document.getElementById('schedule_form');
                const responseText = document.createElement('h1');
                responseText.setAttribute('id', 'responseText');

                if([productInput, originInput, destCityInput, destStateInput, carInput, custInput].includes('Select an option') || [productInput, originInput, destCityInput, destStateInput, carInput, custInput].includes('')){
                    responseText.innerHTML = '<span>Please populate all required fields</span>';
                    resultContainer.appendChild(responseText);
                    throw new Error('Failed to enter data in required field/s.');
                }
            
                // create payload
                const payload = {
                liftNumber,
                loadDateInput,
                formattedLoadTime,
                delDateInput,
                formattedDelTime,
                productInput,
                originInput,
                destCityInput,
                destStateInput,
                carInput,
                custInput,
                };
            
                // Input information to our database
                try {
                    const response = await fetch('/submit-input-form', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
                
                    if (response.ok) {
                        responseText.innerHTML = 'Data submitted successfully!';
                        resultContainer.appendChild(responseText);
                    } else {
                        responseText.innerHTML = '<span>Error submitting data! Data not entered!</span>';
                        resultContainer.appendChild(responseText);
                        throw new Error('Failed to fetch data from server.');
                    }
                } catch (error) {
                    console.error('An error occurred:', error);
                }
                submitButtonInput.remove();
            };

            submitButtonInput.addEventListener('click', asyncClickListener);
        }
    } catch (error) {
            console.error('Uh oh!', error);
    }
});














function printTable(){
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><link rel="stylesheet" href="./css/styles.css"><style type="text/css" media="print">@page {size: landscape;}</style><title>External Schedule Report</title></head><body>');
    printWindow.document.write(document.getElementById('dynamicTable').outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
        printWindow.print();
    })
        
    printWindow.close();
}
