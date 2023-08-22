/* Creates a div element containing a p and optional dropdown element and 
    takes an id, text for the p, and optional data to populate the dropdown */
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

// Create dropdown lists or input fields
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

// Remove duplicates in arrays
function uniqueData(array) {
    let uniqueArray = [];

    for (let i = 0; i < array.length; i++) {
        if (uniqueArray.indexOf(array[i]) === -1) {
            uniqueArray.push(array[i]);
        }
    }

    return uniqueArray.sort();
}

function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

function roundTimeToHalfHour(input) {
    const timeString = input.value;
    let [hours, minutes] = timeString.split(':').map(Number);
    if (hours < 10){
        hours = `0${hours}`;
    }
    if (minutes >= 0 && minutes < 30) {
        input.value = `${hours}:00`;
    } 
    else if (minutes >= 30 && minutes <= 59) {
        input.value = `${hours}:30`;
    } 
    else {
        const roundedHours = hours + 1;
        input.value = `${roundedHours}:00`;
    }
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
  
    // Send lift number to backend and wait for a response then populate the page with a form full of corresponding data
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
            const destStates = data.map((row) => row.DestState);
            const carNames = data.map((row) => row.CarName1);
            const billNames = ['CECHIRE', 'CUSTPU']
            const custNames = data.map((row) => row.Custname);

            // creates input elements for the generated form
            const final_submit = document.createElement('INPUT');
            const loadDate = document.createElement('INPUT');
            const loadTime = document.createElement('INPUT');
            const delDate = document.createElement('INPUT');
            const delTime = document.createElement('INPUT');
            const productQuantity = document.createElement('INPUT');
            const quantityLabel = document.createElement('select');

            final_submit.setAttribute('type', 'submit');
            final_submit.setAttribute('class', 'formInput');
            final_submit.setAttribute('id', 'formSubmit');
            final_submit.setAttribute('value', 'Submit');

            loadDate.setAttribute('type', 'date');
            loadDate.setAttribute('class', 'formInput');
            loadDate.setAttribute('required', true);

            loadTime.setAttribute('type', 'time');
            loadTime.setAttribute('class', 'formInput');
            loadTime.setAttribute('step', '1800');
            loadTime.setAttribute('onblur','roundTimeToHalfHour(this)');

            delDate.setAttribute('type', 'date');
            delDate.setAttribute('class', 'formInput');
            delDate.setAttribute('required', true);

            delTime.setAttribute('type', 'time');
            delTime.setAttribute('class', 'formInput');
            delTime.setAttribute('step', '1800');
            delTime.setAttribute('onblur','roundTimeToHalfHour(this)');

            productQuantity.setAttribute('type', 'number');
            productQuantity.setAttribute('class', 'formInput');
            productQuantity.setAttribute('id', 'quantityInput');
            quantityLabel.setAttribute('class', 'formInput');
            quantityLabel.setAttribute('id', 'quantityLabel');
            
            const placeholderLabel = document.createElement('option');
                placeholderLabel.text = 'Select a label';
                placeholderLabel.setAttribute('disabled', true);
                placeholderLabel.setAttribute('selected', true);
                placeholderLabel.setAttribute('hidden', true);
            const fullLoadOption = document.createElement('option');
                fullLoadOption.innerHTML = 'FULL';
                fullLoadOption.value = 'FULL';
            const gallonsOption = document.createElement('option');
                gallonsOption.innerHTML = 'GAL';
                gallonsOption.value = 'GAL';
            const tonsOption = document.createElement('option');
                tonsOption.innerHTML = 'TON';
                tonsOption.value = 'TON';

            quantityLabel.appendChild(placeholderLabel)
            quantityLabel.appendChild(fullLoadOption);
            quantityLabel.appendChild(gallonsOption);
            quantityLabel.appendChild(tonsOption);




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

            const loadDateTimeDiv = createFormDiv('loadDateTimeDiv', 'Load Date & Time:');
            loadDateTimeDiv.appendChild(loadDate);
            loadDateTimeDiv.appendChild(loadTime);
            sched_form.appendChild(loadDateTimeDiv);

            const delDateTimeDiv = createFormDiv('delDateTimeDiv', 'Delivery Date & Time:');
            delDateTimeDiv.appendChild(delDate);
            delDateTimeDiv.appendChild(delTime);
            sched_form.appendChild(delDateTimeDiv);

            sched_form.appendChild(createFormDiv('prodDiv', '<span>*</span>Product:', uniqueData(prodNames)));
            const quantityDiv = createFormDiv('quantityDiv', '<span>*</span>Quantity:');
            quantityDiv.appendChild(productQuantity);
            quantityDiv.appendChild(quantityLabel);
            sched_form.appendChild(quantityDiv);
            sched_form.appendChild(createFormDiv('originDiv', '<span>*</span>Origin:', uniqueData(tpNames)));
            sched_form.appendChild(createFormDiv('cityDiv', '<span>*</span>City:', uniqueData(destCities)));
            sched_form.appendChild(createFormDiv('stateDiv', '<span>*</span>State:', uniqueData(destStates)));
            sched_form.appendChild(createFormDiv('countyDiv', 'County:', uniqueData(countyInput)));
            sched_form.appendChild(createFormDiv('carDiv', '<span>*</span>Carrier:', uniqueData(carNames)));
            sched_form.appendChild(createFormDiv('billDiv', '<span>*</span>Bill to:', uniqueData(billNames)));
            sched_form.appendChild(createFormDiv('custDiv', '<span>*</span>Customer:', uniqueData(custNames)));

            sched_form.appendChild(final_submit);

            // adds form to the page
            container.appendChild(sched_form);

            // makes lift number read-only
            document.getElementsByClassName('formInput')[0].setAttribute('readonly', true);

            const theForm = document.getElementById('schedule_form');
            const children = theForm.querySelectorAll('.formInput');
            const inputNames = [
                'liftNumber',
                'loadDateInput',
                'loadTimeInput',
                'delDateInput',
                'delTimeInput',
                'productInput',
                'quantityInput',
                'quantityLabel',
                'originInput',
                'destCityInput',
                'destStateInput',
                'countyInput',
                'carInput',
                'billToInput',
                'custInput',
            ];

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const inputName = inputNames[i];

                if(child.hasAttribute('id')){
                    continue;
                }

                child.setAttribute('name', inputName);
                child.setAttribute('id', inputName);
            }

            // scrolls to bottom of page on button click
            window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'smooth' });

            const submitButtonInput = document.getElementById('formSubmit');

            const asyncClickListener = async (event) => {
                event.preventDefault();

                if (document.getElementById('responseText')) {
                    document.getElementById('responseText').remove();
                }

                // get form inputs
                const liftNumber = conRefs[0];
                const loadDateInput = document.getElementById('loadDateInput').value;
                let loadTimeInput = document.getElementById('loadTimeInput').value;
                if(loadTimeInput == ''){
                    loadTimeInput = null;
                }

                const delDateInput = document.getElementById('delDateInput').value;
                let delTimeInput = document.getElementById('delTimeInput').value;
                if(delTimeInput == ''){
                    delTimeInput = null;
                }

                const productInput = document.getElementById('productInput').value;
                const prodArray = uniqueData(prodNames);
                const quantityInput = `${document.getElementById('quantityInput').value} ${document.getElementById('quantityLabel').value}`;
                const originInput = document.getElementById('originInput').value;
                const destCityInput = document.getElementById('destCityInput').value;
                const destStateInput = document.getElementById('destStateInput').value;
                const carInput = document.getElementById('carInput').value;
                const billToInput = document.getElementById('billToInput').value;
                const custInput = document.getElementById('custInput').value;
                const resultContainer = document.getElementById('schedule_form');
                const responseText = document.createElement('h1');
                responseText.setAttribute('id', 'responseText');

                // Check if any required field is empty
                if([productInput, quantityInput, originInput, destCityInput, destStateInput, carInput, billToInput, custInput].includes('Select an option') || [loadDateInput, delDateInput, productInput, quantityInput, originInput, destCityInput, destStateInput, carInput, billToInput, custInput].includes('') || quantityInput.includes('Select a label')){
                    responseText.innerHTML = '<span>Please populate all required fields</span>';
                    resultContainer.appendChild(responseText);
                    throw new Error('Failed to enter data in required field(s).');
                }

                // Checks if times are at a 30 minute interval 
                if(loadTimeInput == null){
                }
                else if(loadTimeInput.includes(':00') || loadTimeInput.includes(':30') || loadTimeInput == null){
                    
                }
                else{
                    responseText.innerHTML = '<span>Only times with a 30-minute interval are valid</span>';
                    resultContainer.appendChild(responseText);
                    throw new Error('Failed to enter data in required field/s.');
                }

                if(delTimeInput == null){
                }
                else if(delTimeInput.includes(':00') || delTimeInput.includes(':30')){
                    
                }
                else{
                    responseText.innerHTML = '<span>Only times with a 30-minute interval are valid</span>';
                    resultContainer.appendChild(responseText);
                    throw new Error('Failed to enter data in required field/s.');
                }

                const username = localStorage.getItem('username');

                const payload = {
                    liftNumber,
                    loadDateInput,
                    loadTimeInput,
                    delDateInput,
                    delTimeInput,
                    productInput,
                    prodArray,
                    quantityInput,
                    originInput,
                    destCityInput,
                    destStateInput,
                    carInput,
                    custInput,
                    billToInput,
                    username,
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

newLogoutButton();

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
