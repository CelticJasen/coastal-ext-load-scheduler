// ------------------------GLOBAL VARIABLE DECLARATIONS-----------------------------

const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const corsOptions = 'http://extloads.coastal-fmc.com';
const app = express();
const fs = require('fs');

const port = 3030;

const secretKey = 'Co@stal362';

const publicDir = path.join(__dirname, '..', 'protected', 'public');

let pool;

//Our Local Database config for inputting data
const localConfig = {
    server: 'SQL-2019.cfmc.local',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'External_load_scheduling',
        encrypt: false,
    },
};

const localViewerConfig = {
    server: 'SQL-2019.cfmc.local',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'TMW_Live',
        encrypt: false,
    },
};

//Our External Database config for reading data
const extConfig = {
    server: 'DEARMAN',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'CEC_Unity',
        encrypt: false,
    },
};

// ------------------------UTILITY FUNCTIONS---------------------------------

async function databaseQuery(query, databaseConfig) {
    try {

        pool = await sql.connect(databaseConfig);

        pool.on('error', err => {
            console.error('Database connection pool error:', err);
        });
        
        const request = pool.request();

        const result = await request.query(query);

        const rows = result.recordset;

        return rows;
    }
    catch (error) {
        throw new Error('(server.js) Error executing the database query: ' + error.message);
    }
    finally{
        pool.close();
    }
}

function formatDateTime(dateString) {
    return dateString.replace(/T|:\d+\.\d+Z/g, ' ').slice(0, 16);
}

function generateToken(userId, storedPermission) {
    return jwt.sign({ userId, storedPermission }, secretKey, { expiresIn: '9h' });
}

function hashPassword(username, plainTextPassword, permission){
    bcrypt.hash(plainTextPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing the password:', err);
        }
        else {
            databaseQuery(`INSERT INTO UserAuthentication (username, password, permission) VALUES ('${username}', '${hashedPassword}', '${permission}');`, localConfig);
        }
    });
}

async function checkExistingUser(username){
    query = `SELECT * FROM dbo.UserAuthentication WHERE username = '${username}';`;
    const result = await databaseQuery(query, localConfig);
    if(result.length < 1){
        return false;
    }else{
        return true;
    }
}

// ----------------------MAIN CODE-----------------------------

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors(corsOptions));

// Route to handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    //const user = users.find((u) => u.username === username);
  
    /* if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    } */
    let storedPassword;
    if(await checkExistingUser(username)){
        try{
            const passwordQuery = `SELECT password, permission FROM dbo.UserAuthentication WHERE username = '${username}';`;
            const result = await databaseQuery(passwordQuery, localConfig);
            storedPassword = result[0].password;
            storedID = result[0].ID;
            storedPermission = result[0].permission;
        }catch(error){
            console.error('Error executing the database query: ', error);
            res.status(500).json({ error: 'Internal server error'});
        }
        
        bcrypt.compare(password, storedPassword, (err, isPasswordValid) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
    
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
    
            const token = generateToken(storedID, storedPermission);
            res.json({ token });
        });
    }
    else{
        return res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Protected route example (requires authentication)
app.get('/scheduler', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');    
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'lookup-plant.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scheduler-dispatch.html');
        }
        else if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'scheduler.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/schedulerScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup-plant.js');
        }
        else if(decoded.storedPermission === 'Administrator' || decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scripts', 'scheduler.js');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }


        // The user is authenticated; you can handle the protected route logic here.
        
        res.sendFile(protectedPagePath);
    });
});

app.get('/lookup', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');    
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'lookup-plant.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'lookup-dispatch.html');
        }
        else if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'lookup.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/lookupScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup-plant.js');
        }
        else if(decoded.storedPermission === 'Administrator' || decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'scripts', 'lookup.js');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);

    });
});

app.get('/reports', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'reports.html');
        }
        else if(decoded.storedPermission === 'Dispatch'){
            protectedPagePath = path.join(publicDir, 'reports-dispatch.html');
        }
        else if(decoded.storedPermission === 'Plant'){
            protectedPagePath = path.join(publicDir, 'reports-plant.html');
        }
        else if(decoded.storedPermission === 'Viewer'){
            protectedPagePath = path.join(publicDir, 'reports-viewer.html');
        }
        else{
            return res.status(401).json({ error: 'Permission not found' });
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/reportsScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // The user is authenticated; you can handle the protected route logic here.
        let protectedPagePath;
        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'scripts', 'reports-admin.js');
        }
        else{
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/administration', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'admin.html');
        }
        else{
            protectedPagePath = path.join(publicDir, 'reports.html');
        }

        res.sendFile(protectedPagePath);
    });
});

app.get('/administrationScript', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token not found' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let protectedPagePath;

        if(decoded.storedPermission === 'Administrator'){
            protectedPagePath = path.join(publicDir, 'scripts', 'admin.js');
        }
        else{
            protectedPagePath = path.join(publicDir, 'scripts', 'reports.js');
        }

        res.sendFile(protectedPagePath);
    });
});

// Get form data and use it to READ or INPUT to database
app.post('/submit-read-form', async (req,res) => {
    try {
        const { number } = req.body;
        const query = `SELECT c.ConRef, p.ProdName, UPPER(t.TpCity + ',' + t.TpState) AS TpName, d.DestCity, d.DestState, d.DestName, t.TpCompany_Name, UPPER(CONVERT(varchar(3), cr.CarName1) + ISNULL(CONVERT(varchar(3), cr.CarCity), '')) AS CarName1, UPPER(cu.Custname) AS Custname FROM DSI_REG_Contract c LEFT JOIN APM_ProdAllocation pa ON c.ConTermKey = pa.PAlcTerminal LEFT JOIN APM_Products p ON pa.PAlcProdKey = p.ProdEntityKey LEFT JOIN APM_CUSTOMER cu ON c.ConCustomerKey = cu.CustEntityKey LEFT JOIN APM_Terminal t ON pa.PAlcTerminal = t.TpEntityKey LEFT JOIN DSI_REG_ContractDestinations ao ON c.ConEntityKey = ao.ConDestContractKey LEFT JOIN APM_DESTINATION d ON ao.ConDestDestinationKey = d.DestEntityKey LEFT JOIN APM_CARRIERCUSTOMERS cc ON cc.CarCustCustKey = c.ConCustomerKey LEFT JOIN APM_CARRIER cr ON cc.CarCustCarKey = cr.CarEntityKey WHERE ConRef = '${number}' AND (ao.ConDestDelFlg IS NULL OR ao.ConDestDelFlg = 0) AND NOT cr.CarName1 = 'FMC Transport' AND DATEDIFF(Day, GETDATE(), c.ConStartDate) <= 5 AND DATEDIFF(Day, c.ConEndDate, GETDATE()) <= 5;`;

        const result = await databaseQuery(query, extConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }

});

app.post('/submit-input-form', async (req,res) => {
    try {
        const { liftNumber, loadDateInput, loadTimeInput, delDateInput, delTimeInput, productInput, prodArray, quantityInput, originInput,destCityInput, originCompanyInput, destStateInput, carInput, custInput, billToInput, trailerInput, username } = req.body;

        let insertQuery = `INSERT INTO dbo.Main (lift_num, load_date, load_time, del_date, del_time, product, product_array, quantity, origin, cust_name, origin_company, bill_to, carrier, destination_city, destination_state, trailer_number, editor) VALUES ('${liftNumber}', '${loadDateInput}',`;

        if(!loadTimeInput){
            insertQuery += `${loadTimeInput}, `;
        }
        else{
            insertQuery += `'${loadTimeInput}', `;
        }

        insertQuery += `'${delDateInput}',`;

        if(!delTimeInput){
            insertQuery += `${delTimeInput}, `;
        }
        else{
            insertQuery += `'${delTimeInput}', `;
        }
        
        insertQuery += `'${productInput}', '${prodArray}', '${quantityInput}', '${originInput}', '${custInput}', '${originCompanyInput}', '${billToInput}', '${carInput}', '${destCityInput}', '${destStateInput}', '${trailerInput}', '${username}');
            `;
        
        await databaseQuery(insertQuery, localConfig);

        res.status(200).send('Data inserted successfully.');

        insertQuery = 'INSERT INTO [History] ([ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], [deleted]) SELECT [ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], 0 FROM [Main] WHERE ID = (SELECT MAX([ID]) FROM [Main]);';

        databaseQuery(insertQuery, localConfig);

    } catch (error) {
        console.error('Error inserting data: ', error);
        res.status(500).send('Error inserting data');
    }
});

app.post('/read-report', async (req,res) => {
    try {
        const number = req.body.number;
        const date = formatDateTime(req.body.date);
        const delDate = formatDateTime(req.body.delDate);
        const originCompany = req.body.originCompany;
        const plant = req.body.plant;

        let query;

        if(plant){
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, product_array, display FROM Main WHERE NOT lift_num = '' AND (ID = '${number}' OR CONVERT(date, '${date}') = CONVERT(date, load_date) OR CONVERT(date, '${delDate}') = CONVERT(date, del_date))`;

            if(originCompany !== '' && (number !== '' || date !== '' || delDate !== '')){
                query += ` AND dbo.levenshteinDistance([origin_company], '${originCompany}') <= 5 OR [origin_company] LIKE '%${originCompany}%'`;
            }
            else if(originCompany !== '' && number === '' && date === '' && delDate === ''){
                query += ` OR dbo.levenshteinDistance([origin_company], '${originCompany}') <= 5 OR [origin_company] LIKE '%${originCompany}%'`;
            }
        }
        else{
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, product_array, display FROM Main WHERE (ID = '${number}' OR CONVERT(date, '${date}') = CONVERT(date, load_date) OR CONVERT(date, '${delDate}') = CONVERT(date, del_date))`;

            if(originCompany !== '' && (number !== '' || date !== '' || delDate !== '')){
                query += ` AND dbo.levenshteinDistance([origin_company], '${originCompany}') <= 5 OR [origin_company] LIKE '%${originCompany}%'`;
            }
            else if(originCompany !== '' && number === '' && date === '' && delDate === ''){
                query += ` OR dbo.levenshteinDistance([origin_company], '${originCompany}') <= 5 OR [origin_company] LIKE '%${originCompany}%'`;
            }
        }

        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };
        
        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/read-reports-page', async (req, res) => {
    const { startDate, endDate, loadID, history } = req.body;

    try {
        let query = '';

        if(history && !loadID){
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, trailer_number, editor, IIF(display = 1, 'ACTIVE', 'COMPLETE') AS display, completed_by, weight, bolNumber, IIF(deleted = 1, 'DELETED', 'EXISTS') AS deleted FROM History WHERE load_date BETWEEN '${startDate}' AND '${endDate}' ORDER BY ID ASC`;
        }
        else if(history && loadID){
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, trailer_number, editor, IIF(display = 1, 'ACTIVE', 'COMPLETE') AS display, completed_by, weight, bolNumber, IIF(deleted = 1, 'DELETED', 'EXISTS') AS deleted FROM History WHERE ID = '${loadID}'`;
        }
        else if(!history && loadID){
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, trailer_number, editor, IIF(display = 1, 'ACTIVE', 'COMPLETE') AS display, completed_by, weight, bolNumber FROM Main WHERE ID = '${loadID}'`;
        }
        else{
            query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin_company, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, trailer_number, editor, IIF(display = 1, 'ACTIVE', 'COMPLETE') AS display, completed_by, weight, bolNumber FROM Main WHERE load_date BETWEEN '${startDate}' AND '${endDate}'`;
        }

        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/get-inbound-prefill-data', async (req,res) => {
    try{
        const query = "SELECT * FROM [External_load_scheduling].[dbo].[Inbound-Prefill];";

        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    }
    catch{

    }
});

app.post('/read-viewer', async (req, res) => {
    const { startDate, how, when, who, weekend } = req.body;

    const dayTwo = new Date(startDate);
    dayTwo.setDate(dayTwo.getDate() + 1);
    const dayThree = new Date(startDate);
    dayThree.setDate(dayThree.getDate() + 2);

    const startDatePlusOne = dayTwo.toISOString().split('T')[0];
    const startDatePlusTwo = dayThree.toISOString().split('T')[0];

    try {
        let query = "SELECT [ID], [lift_num], NULL AS [status], [product], [quantity], [origin_company] AS [originCompany], [origin], [cust_name], [destination_city] + ', ' + [destination_state] AS [destinationCity], ISNULL(CONVERT(varchar(7), [load_time], 100), '') AS [loadTime], CONVERT(varchar, [load_date], 1) AS [loadDate], CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END AS [delTime], [carrier], [bill_to], NULL AS [driver], NULL AS [truck], [trailer_number] AS [trailer], NULL AS [poNum], NULL AS [destPONum], NULL AS [pump], NULL AS [remarks], [display] FROM [External_load_scheduling].[dbo].[Main] ";

        if(who === 'Willow'){
            if(when === 'tomorrow'){
                if(how === 'inbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([del_date] = '${startDate}' OR [del_date] = '${startDatePlusOne}' OR [del_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [del_date] = '${startDate}'`;
                    }

                    query += ` AND ([cust_name] = 'PLAINS ENERGY SERVICES' OR [cust_name] = 'COASTAL ENERGY WILLOW RAIL' OR [cust_name] = 'PLAINS ENERGY WILLOW SPRINGS') AND [display] = 1 ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([load_date] = '${startDate}' OR [load_date] = '${startDatePlusOne}' OR [load_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [load_date] = '${startDate}'`;
                    }

                    query += ` AND ([origin_company] = 'PLAINS ENERGY SERVICES' OR [origin_company] = 'COASTAL ENERGY WILLOW RAIL' OR [origin_company] = 'PLAINS ENERGY WILLOW SPRINGS') AND [display] = 1 AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
            else if(when === 'today'){
                if(how === 'inbnd'){
                    query += `WHERE ([cust_name] = 'PLAINS ENERGY SERVICES' OR [cust_name] = 'COASTAL ENERGY WILLOW RAIL' OR [cust_name] = 'PLAINS ENERGY WILLOW SPRINGS') AND [display] = 1 AND [del_date] = '${startDate}' ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    query += `WHERE ([origin_company] = 'PLAINS ENERGY SERVICES' OR [origin_company] = 'COASTAL ENERGY WILLOW RAIL' OR [origin_company] = 'PLAINS ENERGY WILLOW SPRINGS') AND [display] = 1 AND [load_date] = '${startDate}' AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
        }
        else if(who === 'Miller'){
            if(when === 'tomorrow'){
                if(how === 'inbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([del_date] = '${startDate}' OR [del_date] = '${startDatePlusOne}' OR [del_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [del_date] = '${startDate}'`;
                    }
    
                    query += ` AND ([cust_name] = 'PLAINS ENERGY MILLER' OR [cust_name] = 'COASTAL ENERGY - MILLER' OR [cust_name] = 'PLAINS ENERGY MILLER') AND [display] = 1 ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([load_date] = '${startDate}' OR [load_date] = '${startDatePlusOne}' OR [load_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [load_date] = '${startDate}'`;
                    }

                    query += ` AND ([origin_company] = 'PLAINS ENERGY MILLER' OR [origin_company] = 'COASTAL ENERGY - MILLER' OR [origin_company] = 'PLAINS ENERGY MILLER') AND [display] = 1 AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
            else if(when === 'today'){
                if(how === 'inbnd'){
                    query += `WHERE ([cust_name] = 'PLAINS ENERGY MILLER' OR [cust_name] = 'COASTAL ENERGY - MILLER' OR [cust_name] = 'PLAINS ENERGY MILLER') AND [display] = 1 AND [del_date] = '${startDate}' ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    query += `WHERE ([origin_company] = 'PLAINS ENERGY MILLER' OR [origin_company] = 'COASTAL ENERGY - MILLER' OR [origin_company] = 'PLAINS ENERGY MILLER') AND [display] = 1 AND [load_date] = '${startDate}' AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
        }
        else if(who === 'Clinton'){
            if(when === 'tomorrow'){
                if(how === 'inbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([del_date] = '${startDate}' OR [del_date] = '${startDatePlusOne}' OR [del_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [del_date] = '${startDate}'`;
                    }
    
                    query += ` AND ([cust_name] = 'PLAINS ENERGY CLINTON' OR [cust_name] = 'COASTAL ENERGY - CLINTON') AND [display] = 1 ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    if(weekend === "yes"){
                        query += `WHERE ([load_date] = '${startDate}' OR [load_date] = '${startDatePlusOne}' OR [load_date] = '${startDatePlusTwo}')`;
                    } else{
                        query += `WHERE [load_date] = '${startDate}'`;
                    }
    
                    query += ` AND ([origin_company] = 'PLAINS ENERGY CLINTON' OR [origin_company] = 'COASTAL ENERGY - CLINTON' OR [origin_company] = 'PLAINS ENERGY CLINTON') AND [display] = 1 AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
            else if(when === 'today'){
                if(how === 'inbnd'){
                    query += `WHERE [cust_name] = 'COASTAL ENERGY - CLINTON' AND [display] = 1 AND [del_date] = '${startDate}' ORDER BY [del_time] ASC;`;
                }
                else if(how === 'outbnd'){
                    query += `WHERE [origin_company] = 'COASTAL ENERGY - CLINTON' AND [display] = 1 AND [load_date] = '${startDate}' AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
                }
            }
        }

        //This complicated query is so the query will show Saturday, Sunday, and Monday for tomorrow if startDate is on a Saturday. Try it out on a Friday.
        //((DATEPART(WEEKDAY, '${startDate}') = 7 AND ((DAY(load_date) BETWEEN DAY('${startDate}') AND DAY(DATEADD(DAY, 2, '${startDate}')) AND MONTH(load_date) = MONTH('${startDate}')) OR (DAY(load_date) = DAY(DATEADD(DAY, -1, '${startDate}')) AND MONTH(load_date) = MONTH(DATEADD(DAY, 1, '${startDate}'))))) OR (DATEPART(WEEKDAY, '${startDate}') <> 7 AND (DAY(load_date) = DAY('${startDate}') AND MONTH(load_date) = MONTH('${startDate}'))))

        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/read-ext-viewer', async (req, res) => {
    const { startDate, how, when, who, weekend } = req.body;

    const dayTwo = new Date(startDate);
    dayTwo.setDate(dayTwo.getDate() + 1);
    const dayThree = new Date(startDate);
    dayThree.setDate(dayThree.getDate() + 2);

    const startDatePlusOne = dayTwo.toISOString().split('T')[0];
    const startDatePlusTwo = dayThree.toISOString().split('T')[0];

    try {
        let query = '';

        if(who === 'Willow'){
            query = "SELECT [ord_hdrnumber] AS [ID], NULL AS [lift_num], [DispStatus] AS [status], IIF([adtv_type] <> '', [cmd_name] + ' W/' + [adtv_pct] + ' ' + [adtv_type], [cmd_name]) AS [product], IIF(([fgt_ordered_weight] = '1' AND [fgt_weightunit] = 'LBS') OR ([fgt_ordered_count] <> 0 AND CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit] = '1 LBS') OR ([fgt_ordered_count] = 0 AND [fgt_ordered_weight] = 0 AND [fgt_ordered_volume] = 0), 'FULL', IIF([fgt_ordered_count] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit], IIF([fgt_ordered_weight] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_weight]) + ' ' + [fgt_weightunit], IIF([fgt_ordered_volume] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_volume]) + ' ' + [Unit], '1 LOAD')))) AS [quantity], [PickupName] AS [originCompany], REPLACE([PickupCity], '/', '') AS [origin], [cmp_name] AS [cust_name], REPLACE([cty_nmstct], '/', '') AS [destinationCity], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7), RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7) + ' - ' + RIGHT(CONVERT(VARCHAR(30), [Load2], 100), 7))) AS [loadTime], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR, [Load1], 1), 8), RIGHT(CONVERT(VARCHAR, [Load1], 1), 8) + ' - ' + RIGHT(CONVERT(VARCHAR, [Load2], 1), 8))) AS [loadDate], IIF(CONVERT(VARCHAR(10), [stp_schdtearliest], 1) = '01/01/50', 'OPEN', IIF([stp_schdtearliest] = [stp_schdtlatest], convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8), convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8) + ' - ' + convert(varchar(10), [stp_schdtlatest], 1) + right(convert(varchar(32), [stp_schdtlatest], 100), 8))) AS [delTime], IIF([Carrier] = 'UNKNOWN', IIF([Driver1Name] <> 'UNKNOWN', 'FMCT', 'UNK'), [Carrier]) AS [carrier], [billTo] AS [bill_to], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [driver], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [truck], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [trailer], [PONum] AS [poNum], [DestPO] AS [destPONum], [RevType4] AS [pump], [ord_remark] AS [remarks] FROM [RouteSheetView]";

            if(when === "tomorrow"){
                if(how === "inbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest])`;
                    }
                    
                    query += " AND [cmp_name] IN ('COASTAL ENERGY WILLOW RAIL', 'PLAINS ENERGY SERVICES', 'PLAINS ENERGY WILLOW SPRINGS')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT')) ORDER BY delTime ASC;";
                }
                else if(how === "outbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2])`;
                    }
                    
                    query += " AND [PickupName] IN ('COASTAL ENERGY WILLOW RAIL', 'PLAINS ENERGY SERVICES', 'PLAINS ENERGY WILLOW SPRINGS')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT') AND  CONVERT(VARCHAR(10),[stp_schdtlatest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
                }
            }
            else if(when === "today"){
                if(how === "inbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, stp_schdtearliest) AND CONVERT(DATE, stp_schdtlatest)`;
                    query += " AND [cmp_name] IN ('COASTAL ENERGY WILLOW RAIL', 'PLAINS ENERGY SERVICES', 'PLAINS ENERGY WILLOW SPRINGS')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT')) ORDER BY delTime ASC;";
                }
                else if(how === "outbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                    query += " AND [PickupName] IN ('COASTAL ENERGY WILLOW RAIL', 'PLAINS ENERGY SERVICES', 'PLAINS ENERGY WILLOW SPRINGS')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT') AND  CONVERT(VARCHAR(10),[stp_schdtlatest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
                }
            }
        }
        else if(who === 'Miller'){
            query = "SELECT [ord_hdrnumber] AS [ID], NULL AS [lift_num], [DispStatus] AS [status], IIF([adtv_type] <> '', [cmd_name] + ' W/' + [adtv_pct] + ' ' + [adtv_type], [cmd_name]) AS [product], IIF(([fgt_ordered_weight] = '1' AND [fgt_weightunit] = 'LBS') OR ([fgt_ordered_count] <> 0 AND CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit] = '1 LBS') OR ([fgt_ordered_count] = 0 AND [fgt_ordered_weight] = 0 AND [fgt_ordered_volume] = 0), 'FULL', IIF([fgt_ordered_count] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit], IIF([fgt_ordered_weight] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_weight]) + ' ' + [fgt_weightunit], IIF([fgt_ordered_volume] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_volume]) + ' ' + [Unit], '1 LOAD')))) AS [quantity], [PickupName] AS [originCompany], REPLACE([PickupCity], '/', '') AS [origin], [cmp_name] AS [cust_name], REPLACE([cty_nmstct], '/', '') AS [destinationCity], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7), RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7) + ' - ' + RIGHT(CONVERT(VARCHAR(30), [Load2], 100), 7))) AS [loadTime], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR, [Load1], 1), 8), RIGHT(CONVERT(VARCHAR, [Load1], 1), 8) + ' - ' + RIGHT(CONVERT(VARCHAR, [Load2], 1), 8))) AS [loadDate], IIF(CONVERT(VARCHAR(10), [stp_schdtearliest], 1) = '01/01/50', 'OPEN', IIF([stp_schdtearliest] = [stp_schdtlatest], convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8), convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8) + ' - ' + convert(varchar(10), [stp_schdtlatest], 1) + right(convert(varchar(32), [stp_schdtlatest], 100), 8))) AS [delTime], IIF([Carrier] = 'UNKNOWN', IIF([Driver1Name] <> 'UNKNOWN', 'FMCT', 'UNK'), [Carrier]) AS [carrier], [billTo] AS [bill_to], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [driver], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [truck], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [trailer], [PONum] AS [poNum], [DestPO] AS [destPONum], [RevType4] AS [pump], [ord_remark] AS [remarks] FROM [RouteSheetViewMiller]";

            if(when === "tomorrow"){
                if(how === "inbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest])`;
                    }
    
                    query += " AND [cmp_name] IN ('COASTAL ENERGY CORPORATION - M', 'PLAINS ENERGY MILLER', 'COASTAL ENERGY - MILLER')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAMIL' OR [PickupId] = 'PLAMIL' OR [cmp_id] = 'COAMIL' OR [cmp_id] = 'PLAMIL')) ORDER BY delTime ASC;";
                }
                else if(how === "outbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2])`;
                    }
    
                    query += " AND [PickupName] IN ('COASTAL ENERGY - MILLER', 'PLAINS ENERGY MILLER')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAMIL' OR [PickupId] = 'PLAMIL' OR [cmp_id] = 'COAMIL' OR [cmp_id] = 'PLAMIL') AND CONVERT(VARCHAR(10),[stp_schdtearliest],1) > { fn NOW() } - 1) ORDER BY loadTime ASC;";
                }
            }
            else if(when === "today"){
                if(how === "inbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, stp_schdtearliest) AND CONVERT(DATE, stp_schdtlatest)`;
                    query += " AND [cmp_name] IN ('COASTAL ENERGY CORPORATION - M', 'PLAINS ENERGY MILLER', 'COASTAL ENERGY - MILLER')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAMIL' OR [PickupId] = 'PLAMIL' OR [cmp_id] = 'COAMIL' OR [cmp_id] = 'PLAMIL')) ORDER BY loadTime ASC;";
                }
                else if(how === "outbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                    query += " AND [PickupName] IN ('COASTAL ENERGY - MILLER', 'PLAINS ENERGY MILLER')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAMIL' OR [PickupId] = 'PLAMIL' OR [cmp_id] = 'COAMIL' OR [cmp_id] = 'PLAMIL') AND CONVERT(VARCHAR(10),[stp_schdtearliest],1) > { fn NOW() } - 1) ORDER BY loadTime ASC;";
                }
            }
        }
        else if(who === 'Clinton'){
            query = "SELECT [ord_hdrnumber] AS [ID], NULL AS [lift_num], [DispStatus] AS [status], [cmd_name] AS [product], IIF(([fgt_ordered_weight] = '1' AND [fgt_weightunit] = 'LBS') OR ([fgt_ordered_count] <> 0 AND CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit] = '1 LBS') OR ([fgt_ordered_count] = 0 AND [fgt_ordered_weight] = 0 AND [fgt_ordered_volume] = 0), 'FULL', IIF([fgt_ordered_count] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit], IIF([fgt_ordered_weight] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_weight]) + ' ' + [fgt_weightunit], IIF([fgt_ordered_volume] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_volume]) + ' ' + [Unit], '1 LOAD')))) AS [quantity], [PickupName] AS [originCompany], REPLACE([PickupCity], '/', '') AS [origin], [cmp_name] AS [cust_name], REPLACE([cty_nmstct], '/', '') AS [destinationCity], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7), RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7) + ' - ' + RIGHT(CONVERT(VARCHAR(30), [Load2], 100), 7))) AS [loadTime], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR, [Load1], 1), 8), RIGHT(CONVERT(VARCHAR, [Load1], 1), 8) + ' - ' + RIGHT(CONVERT(VARCHAR, [Load2], 1), 8))) AS [loadDate], IIF(CONVERT(VARCHAR(10), [stp_schdtearliest], 1) = '01/01/50', 'OPEN', IIF([stp_schdtearliest] = [stp_schdtlatest], convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8), convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8) + ' - ' + convert(varchar(10), [stp_schdtlatest], 1) + right(convert(varchar(32), [stp_schdtlatest], 100), 8))) AS [delTime], IIF([Carrier] = 'UNKNOWN', IIF([Driver1Name] <> 'UNKNOWN', 'FMCT', 'UNK'), [Carrier]) AS [carrier], [billTo] AS [bill_to], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [driver], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [truck], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [trailer], [PONum] AS [poNum], [DestPO] AS [destPONum], [RevType4] AS [pump], [ord_remark] AS [remarks] FROM [RouteSheetViewClinton]";

            if(when === "tomorrow"){
                if(how === "inbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [stp_schdtearliest]) AND CONVERT(DATE, [stp_schdtlatest])`;
                    }
                    
                    query += " AND [cmp_name] IN ('COASTAL ENERGY CORPORATION - C', 'PLAINS ENERGY CLINTON', 'COASTAL ENERGY - CLINTON')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COACLI' OR [cmp_id] = 'COACLI')) ORDER BY delTime ASC;";
                }
                else if(how === "outbnd"){
                    if(weekend === "yes"){
                        query += ` WHERE ('${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusOne}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]) OR '${startDatePlusTwo}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2]))`;
                    } else{
                        query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, [Load1]) AND CONVERT(DATE, [Load2])`;
                    }
                    
                    query += " AND [PickupName] IN ('COASTAL ENERGY - CLINTON', 'PLAINS ENERGY CLINTON')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COACLI' OR [cmp_id] = 'COACLI') AND CONVERT(VARCHAR(10),[stp_schdtearliest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
                }
            }
            else if(when === "today"){
                if(how === "inbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, stp_schdtearliest) AND CONVERT(DATE, stp_schdtlatest)`;
                    query += " AND [cmp_name] IN ('COASTAL ENERGY CORPORATION - C', 'PLAINS ENERGY CLINTON', 'COASTAL ENERGY - CLINTON')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COACLI' OR [cmp_id] = 'COACLI')) ORDER BY delTime ASC;";
                }
                else if(how === "outbnd"){
                    query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                    query += " AND [PickupName] IN ('COASTAL ENERGY - CLINTON', 'PLAINS ENERGY CLINTON')";
                    query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COACLI' OR [cmp_id] = 'COACLI') AND CONVERT(VARCHAR(10),[stp_schdtearliest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
                }
            }
        }
        
        const result = await databaseQuery(query, localViewerConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/update-display-status', async(req,res) => {
    try{
        const id = req.body;

        let query = `UPDATE [External_load_scheduling].[dbo].[Main] SET [display] = 0, [completed_by] = '${id.initials}', [weight] = '${id.weight}', [bolNumber] = '${id.bolNumber}', [timestamp] = GETDATE() WHERE [ID] = ${id.number};`;

        const response = await databaseQuery(query, localConfig);

        res.json(response);

        query = `INSERT INTO [History] ([ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], [deleted]) SELECT [ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], 0 FROM [Main] WHERE ID = '${id.number}';`;

        await databaseQuery(query, localConfig);

    } catch (error) {
        console.error('Error updating record: ', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/update-record', async (req,res) => {
    try {

        let loadDateQuery = '';
        let delDateQuery = '';
        let loadTimeQuery = '';
        let delTimeQuery = '';
        let productQuery = '';
        let quantityQuery = '';
        let billToQuery = '';
        let queryEnd = '';
        let query = '';
        let hasQuantity = true;
        let editorUsernameQuery = '';
        let timestampQuery = '';

        const receivedArray = req.body;
        
        for (i=0; i < receivedArray.length; i++){
            loadDateQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].loadDate}'`;
            if(receivedArray[i].loadTime){
                loadTimeQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].loadTime}'`;
            }
            else{
                loadTimeQuery += ` WHEN ID = '${receivedArray[i].id}' THEN ''`;
            }

            delDateQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].delDate}'`;

            if(receivedArray[i].delTime){
                delTimeQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].delTime}'`;
            }
            else{
                delTimeQuery += ` WHEN ID = '${receivedArray[i].id}' THEN ''`;
            }

            // if the user is administrator or dispatch we need to account for the fact that they can edit quantity, bill_to, and product while other users can't
            if(receivedArray[i].quantity){
                quantityQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].quantity}'`;
                hasQuantity = true;
            }
            else{
                hasQuantity = false;
            }

            // if there's a quantity, then there definitely is a billTo and product since that's how the app is built. If something changes, this may need its own check.
            billToQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].billTo}'`;
            productQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].product}'`;
            editorUsernameQuery += ` WHEN ID = '${receivedArray[i].id}' THEN '${receivedArray[i].username}'`;
            timestampQuery += ` WHEN ID = '${receivedArray[i].id}' THEN GETDATE()`;

            // we need a different ending depending on whether or not there are more records to edit
            if(i+1 == receivedArray.length){
                queryEnd += `'${receivedArray[i].id}'`;
            }
            else{
                queryEnd += `'${receivedArray[i].id}', `;
            }
        }

        // This query is for dispatch and admins since they'll need to be able to edit quantity, bill to, and product
        if(hasQuantity){
            query = `
            UPDATE Main
            SET load_date = 
                CASE
                    ${loadDateQuery}
                END,
            load_time = 
                CASE
                    ${loadTimeQuery}
                END,
            del_time = 
                CASE
                    ${delTimeQuery}
                END,
            del_date =
                CASE
                    ${delDateQuery}
                END,
            quantity =
                CASE
                    ${quantityQuery}
                END,
            bill_to =
                CASE
                    ${billToQuery}
                END,
            product =
                CASE
                    ${productQuery}
                END,
            timestamp =
                CASE
                    ${timestampQuery}
                END,
            editor =
                CASE
                    ${editorUsernameQuery}
                END
            WHERE ID IN (${queryEnd});
            `;
        }
        else{
            // This query is basically for Plant users since all they should be editing are dates and times.
            query = `
            UPDATE Main
            SET load_date = 
                CASE
                    ${loadDateQuery}
                END,
            load_time = 
                CASE
                    ${loadTimeQuery}
                END,
            del_time = 
                CASE
                    ${delTimeQuery}
                END,
            del_date =
                CASE
                    ${delDateQuery}
                END,
            timestamp =
                CASE
                    ${timestampQuery}
                END,
            editor =
                CASE
                    ${editorUsernameQuery}
                END
            WHERE ID IN (${queryEnd});
            `;
        }

        const response = await databaseQuery(query, localConfig);

        res.json(response);

        for (i=0; i < receivedArray.length; i++){
            query = `INSERT INTO [History] ([ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], [deleted]) SELECT [ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], 0 FROM [Main] WHERE ID = '${receivedArray[i].id}';`;
    
            await databaseQuery(query, localConfig);
        }

    } catch (error) {
        console.error('Error updating record: ', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/delete-schedule', async (req,res) => {
    const id = req.body.number;
    const user = req.body.username;

    let query = `UPDATE [External_load_scheduling].[dbo].[Main] SET [editor] = '${user}', [timestamp] = GETDATE();`;

    try{
        await databaseQuery(query, localConfig);
    }
    catch(error){
        console.error('Error entering username to MAIN table: ', error);
        res.status(500).send('Could not delete the record. Error entering user into main table of database.');
    }

    query = `INSERT INTO [History] ([ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], [deleted]) SELECT [ID], [lift_num], [load_date], [load_time], [del_date], [del_time], [product], [product_array], [quantity], [origin], [cust_name], [origin_company], [carrier], [bill_to], [destination_city], [destination_state], [trailer_number], [editor], [timestamp], [display], [completed_by], [weight], [bolNumber], 1 FROM [Main] WHERE ID = '${id}';`;

    try{
        await databaseQuery(query, localConfig);
    }
    catch (error){
        console.error('Error logging into history: ', error);
        res.status(500).send('Could not delete record. History could not be updated');
    }

    query = `DELETE FROM Main WHERE ID = '${id}';`;

    try{
        await databaseQuery(query, localConfig);
        res.status(200).send('Deleted the record');
    }
    catch (error){
        console.error('Error deleting data: ', error);
        res.status(500).send('Could not delete record');
    }
});

app.post('/adminCreateUser', async (req,res) => {
    try {
        const { username, password, permission } = req.body;
        if(!(await checkExistingUser(username))){
            hashPassword(username, password, permission)

            res.status(200).send('User inserted successfully.');
        }
        else{
            res.status(200).send('exists');
        }
        
    } catch (error) {
        console.error('Error inserting data: ', error);
        res.status(500).send('Error inserting data');
    }
});


app.post('/adminListUsers', async (req, res) => {
    try {
        const query = `SELECT [username], [permission] FROM dbo.UserAuthentication`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/adminListEditUser', async (req, res) => {
    const user = req.body.user
    
    try {
        const query = `SELECT [username], [permission] FROM dbo.UserAuthentication WHERE username = '${user}';`;
        const result = await databaseQuery(query, localConfig);

        const responseData = {
            result: result
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing the database query: ', error);
        res.status(500).json({ error: 'Internal server error'});
    }
});

app.post('/adminEditUser', async (req, res) => {
    const { username, newUsername, newPermission, newPassword } = req.body;
    let query;

    if(!(await checkExistingUser(newUsername))|| username == newUsername){
        if(newPassword === ''){
            query = `UPDATE UserAuthentication SET permission = CASE username WHEN '${username}' THEN '${newPermission}' END, username = CASE username WHEN '${username}' THEN '${newUsername}' END WHERE username IN ('${username}');`;
    
            const response = await databaseQuery(query, localConfig);
    
            res.json(response);
        }
        else{
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing the password:', err);
                }
                else {
                    databaseQuery(`UPDATE UserAuthentication SET permission = CASE username WHEN '${username}' THEN '${newPermission}' END, password = CASE username WHEN '${username}' THEN '${hashedPassword}' END, username = CASE username WHEN '${username}' THEN '${newUsername}' END WHERE username IN ('${username}');`, localConfig);
                }
            });
    
            res.status(200).send('Record updated successfully');
        }
    }
    else{
        res.status(200).send('exists');
    }

    

});

app.post('/adminDeleteUser', async (req, res) => {
    

    const username = req.body.username;

    databaseQuery(`DELETE FROM UserAuthentication WHERE username = '${username}'`, localConfig);

    res.status(200).send('User deleted');
});

app.post('/hacked', async (req,res) => {
    const user = req.body.user;
    const filePath = './logs/hacked.txt';
    
    fs.appendFile(filePath, user, (err) => {
        if(err){
            console.error("Error appending to file:", err);
        }else{
            console.log("String appended to file successfully.");
        }
    });

    res.status(200).send('User logged');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
