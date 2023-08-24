// ------------------------VARIABLE DECLARATIONS-----------------------------

const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const corsOptions = 'http://extloads.coastal-fmc.com';
const app = express();

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
    server: 'DEARMAN-TUL',
    authentication: {
        type: 'default',
        options: {
            userName: 'nodejs',
            password: 'Co@stal362',
        },
    },
    options: {
        database: 'Tulsa',
        encrypt: false,
    },
};

// ------------------------FUNCTIONS---------------------------------

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
        if(decoded.storedPermission === 'Administrator'|| decoded.storedPermission === 'Dispatch'){
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
        const query = `SELECT c.ConRef, p.ProdName, t.TpName, d.DestCity, d.DestState, UPPER(CONVERT(varchar(3), cr.CarName1) + ISNULL(CONVERT(varchar(3), cr.CarCity), '')) AS CarName1, cu.Custname FROM DSI_REG_Contract c LEFT JOIN APM_ProdAllocation pa ON c.ConTermKey = pa.PAlcTerminal LEFT JOIN APM_Products p ON pa.PAlcProdKey = p.ProdEntityKey LEFT JOIN APM_CUSTOMER cu ON c.ConCustomerKey = cu.CustEntityKey LEFT JOIN APM_Terminal t ON pa.PAlcTerminal = t.TpEntityKey LEFT JOIN DSI_REG_ContractDestinations ao ON c.ConEntityKey = ao.ConDestContractKey LEFT JOIN APM_DESTINATION d ON ao.ConDestDestinationKey = d.DestEntityKey LEFT JOIN APM_CARRIERCUSTOMERS cc ON cc.CarCustCustKey = c.ConCustomerKey LEFT JOIN APM_CARRIER cr ON cc.CarCustCarKey = cr.CarEntityKey WHERE ConRef = '${number}' AND (ao.ConDestDelFlg IS NULL OR ao.ConDestDelFlg = 0) AND NOT cr.CarName1 = 'FMC Transport' AND DATEDIFF(Day, GETDATE(), c.ConStartDate) <= 5 AND DATEDIFF(Day, c.ConEndDate, GETDATE()) <= 5;`;
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
        const { liftNumber, loadDateInput, loadTimeInput, delDateInput, delTimeInput, productInput, prodArray, quantityInput, originInput,destCityInput, destStateInput, carInput, custInput, billToInput, username } = req.body;
        let insertQuery = `INSERT INTO dbo.Main (lift_num, load_date, load_time, del_date, del_time, product, product_array, quantity, origin, cust_name, bill_to, carrier, destination_city, destination_state, editor) VALUES ('${liftNumber}', '${loadDateInput}',`;

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
        
        insertQuery += `'${productInput}', '${prodArray}', '${quantityInput}', '${originInput}', '${custInput}', '${billToInput}', '${carInput}', '${destCityInput}', '${destStateInput}', '${username}');
            `;
        
        await databaseQuery(insertQuery, localConfig);

        res.status(200).send('Data inserted successfully.');
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
        const query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp, product_array FROM Main WHERE ID = '${number}' OR CONVERT(date, '${date}') = CONVERT(date, load_date) OR CONVERT(date, '${delDate}') = CONVERT(date, del_date)`;
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
    const { startDate, endDate } = req.body;

    try {
        const query = `SELECT ID, lift_num, CONVERT(varchar, load_date, 120) AS convertedLoadDate, CONVERT(varchar(5), load_time, 108) AS loadTimeFormatted, CONVERT(varchar, del_date, 120) AS convertedDelDate, CONVERT(varchar(5), del_time, 108) AS delTimeFormatted, product, quantity, origin, cust_name, carrier, bill_to, destination_city, destination_state, CONVERT(varchar(16), timestamp, 120) AS timestamp FROM Main WHERE load_date BETWEEN '${startDate}' AND '${endDate}'`;
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

app.post('/read-viewer', async (req, res) => {
    const { startDate, how } = req.body;

    try {
        const query = `SELECT [ID], [lift_num], NULL AS [status], [product], [quantity], NULL AS [originCompany], [origin], [cust_name], [destination_city] + ', ' + [destination_state] AS [destinationCity], ISNULL(CONVERT(varchar(7), [load_time], 100), '') AS [loadTime], CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END AS [delTime], [carrier], [bill_to], NULL AS [driver], NULL AS [truck], NULL AS [trailer], NULL AS [poNum], NULL AS [destPONum], NULL AS [pump], NULL AS [remarks] FROM [External_load_scheduling].[dbo].[Main] WHERE [load_date] = '${startDate}' AND CONVERT(varchar, [del_date], 1) + CASE WHEN [del_date] IS NULL THEN '' ELSE ' ' + ISNULL(CONVERT(varchar(7), [del_time], 100), '') END > { fn NOW() } - 4 ORDER BY [load_time] ASC;`;
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
    const { startDate, how, when, who } = req.body;

    try {
        let query = '';

        if(who === 'Willow'){
            query = "SELECT [ord_hdrnumber] AS [ID], NULL AS [lift_num], [DispStatus] AS [status], IIF([adtv_type] <> '', [cmd_name] + ' W/' + [adtv_pct] + ' ' + [adtv_type], [cmd_name]) AS [product], IIF(([fgt_ordered_weight] = '1' AND [fgt_weightunit] = 'LBS') OR ([fgt_ordered_count] <> 0 AND CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit] = '1 LBS') OR ([fgt_ordered_count] = 0 AND [fgt_ordered_weight] = 0 AND [fgt_ordered_volume] = 0), 'FULL', IIF([fgt_ordered_count] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit], IIF([fgt_ordered_weight] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_weight]) + ' ' + [fgt_weightunit], IIF([fgt_ordered_volume] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_volume]) + ' ' + [Unit], '1 LOAD')))) AS [quantity], [PickupName] AS [originCompany], REPLACE([PickupCity], '/', '') AS [origin], [cmp_name] AS [cust_name], REPLACE([cty_nmstct], '/', '') AS [destinationCity], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7), RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7) + ' - ' + RIGHT(CONVERT(VARCHAR(30), [Load2], 100), 7))) AS [loadTime], IIF(CONVERT(VARCHAR(10), [stp_schdtearliest], 1) = '01/01/50', 'OPEN', IIF([stp_schdtearliest] = [stp_schdtlatest], convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8), convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8) + ' - ' + convert(varchar(10), [stp_schdtlatest], 1) + right(convert(varchar(32), [stp_schdtlatest], 100), 8))) AS [delTime], IIF([Carrier] = 'UNKNOWN', IIF([Driver1Name] <> 'UNKNOWN', 'FMCT', 'UNK'), [Carrier]) AS [carrier], [billTo] AS [bill_to], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [driver], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [truck], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [trailer], [PONum] AS [poNum], [DestPO] AS [destPONum], [RevType4] AS [pump], [ord_remark] AS [remarks] FROM [RouteSheetView]";

            if(when === "tomorrow"){
                query += ` WHERE ((DATEPART(WEEKDAY, '${startDate}') = 7 AND '${startDate}' BETWEEN CONVERT(DATE, Load1) AND DATEADD(DAY, 2, CONVERT(DATE, Load2))) OR ('${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)))`;
                
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT') AND CONVERT(VARCHAR(10),[stp_schdtlatest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
            }
            else if(when === "today"){
                query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND (([RevType2] = 'ASPH') AND ([PickupId] = 'COAWIL' OR [PickupId] = 'PLAPOT' OR [cmp_id] = 'COAWIL' OR [cmp_id] = 'PLAPOT') AND CONVERT(VARCHAR(10),[stp_schdtlatest],1) > { fn NOW() } - 4) ORDER BY loadTime ASC;";
            }
        }
        else if(who === 'Miller'){
            query = "SELECT [RevType2], IIF([Carrier] = 'UNKNOWN',IIF([Driver1Name] <>'UNKNOWN','FMCT','UNK'),[Carrier]) AS [Carrier], [ord_hdrnumber], [DispStatus], [MLR_Inbnd], [cmd_name], IIF([fgt_ordered_count]<>0, CONVERT(VARCHAR(10),[fgt_ordered_count]) + ' ' + CONVERT(VARCHAR(5),[fgt_countunit]), IIF([fgt_ordered_weight]<>0, CONVERT(VARCHAR(10),[fgt_ordered_weight]) + ' ' + CONVERT(VARCHAR(5),[fgt_weightunit]),IIF([fgt_ordered_volume]<>0,CONVERT(VARCHAR(10),[fgt_ordered_volume]) + ' ' + CONVERT(VARCHAR(5),[Unit]),'1 LOAD'))) AS [Qty], [PickupId], [PickupName], [PickupCity], [cmp_id], [cmp_name], [cty_nmstct], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [Driver1], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [Tractor], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [Trailer1], [BookedBy], [PONum], [DestPO], [RevType4], [ord_remark], IIF(CONVERT(VARCHAR(10),[Load1],1)='01/01/50','OPEN',IIF([Load1]=[Load2],convert(varchar(10),[Load1], 1) + right(convert(varchar(32),[Load1],100),8),convert(varchar(10),[Load1], 1) + right(convert(varchar(32),[Load1],100),8) + ' - ' + convert(varchar(10),[Load2], 1) + right(convert(varchar(32),[Load2],100),8))) AS [LoadRange], IIF(CONVERT(VARCHAR(10),[stp_schdtearliest],1)='01/01/50','OPEN',IIF([stp_schdtearliest]=[stp_schdtlatest],convert(varchar(10),[stp_schdtearliest], 1) + right(convert(varchar(32),[stp_schdtearliest],100),8),convert(varchar(10),[stp_schdtearliest], 1) + right(convert(varchar(32),[stp_schdtearliest],100),8) + ' - ' + convert(varchar(10),[stp_schdtlatest], 1) + right(convert(varchar(32),[stp_schdtlatest],100),8))) AS [DelRange] FROM [RouteSheetViewMiller] WHERE (([RevType2] = @RevType2) AND [MLR_Inbnd] = 'N' AND ([PickupId] = 'COAMIL' OR [PickupId] = 'PLAMIL' OR [cmp_id] = 'COAMIL' OR [cmp_id] = 'PLAMIL') AND CONVERT(VARCHAR(10),[stp_schdtearliest],1) > { fn NOW() } - 4);";

            if(when === "tomorrow"){
                query += ` WHERE ((DATEPART(WEEKDAY, '${startDate}') = 7 AND '${startDate}' BETWEEN CONVERT(DATE, Load1) AND DATEADD(DAY, 2, CONVERT(DATE, Load2))) OR ('${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)))`;
                
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
            }
            else if(when === "today"){
                query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
            }
        }
        else if(who === 'Clinton'){
            query = "SELECT [RevType2], IIF([Carrier] = 'UNKNOWN',IIF([Driver1Name] <>'UNKNOWN','FMCT','UNK'),[Carrier]) AS [Carrier], [ord_hdrnumber], [DispStatus], [cmd_name], IIF([fgt_ordered_count]<>0, CONVERT(VARCHAR(10),[fgt_ordered_count]) + ' ' + CONVERT(VARCHAR(5),[fgt_countunit]), IIF([fgt_ordered_weight]<>0, CONVERT(VARCHAR(10),[fgt_ordered_weight]) + ' ' + CONVERT(VARCHAR(5),[fgt_weightunit]),IIF([fgt_ordered_volume]<>0,CONVERT(VARCHAR(10),[fgt_ordered_volume]) + ' ' + CONVERT(VARCHAR(5),[Unit]),'1 LOAD'))) AS [Qty], [PickupId], [PickupName], [PickupCity], [cmp_id], [cmp_name], [cty_nmstct], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [Driver1], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [Tractor], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [Trailer1], [BookedBy], [PONum], [DestPO], [RevType4], [ord_remark], IIF(CONVERT(VARCHAR(10),[Load1],1)='01/01/50','OPEN',IIF([Load1]=[Load2],convert(varchar(10),[Load1], 1) + right(convert(varchar(32),[Load1],100),8),convert(varchar(10),[Load1], 1) + right(convert(varchar(32),[Load1],100),8) + ' - ' + convert(varchar(10),[Load2], 1) + right(convert(varchar(32),[Load2],100),8))) AS [LoadRange], IIF(CONVERT(VARCHAR(10),[stp_schdtearliest],1)='01/01/50','OPEN',IIF([stp_schdtearliest]=[stp_schdtlatest],convert(varchar(10),[stp_schdtearliest], 1) + right(convert(varchar(32),[stp_schdtearliest],100),8),convert(varchar(10),[stp_schdtearliest], 1) + right(convert(varchar(32),[stp_schdtearliest],100),8) + ' - ' + convert(varchar(10),[stp_schdtlatest], 1) + right(convert(varchar(32),[stp_schdtlatest],100),8))) AS [DelRange] FROM [RouteSheetViewClinton] WHERE (([RevType2] = @RevType2) AND [CLI_Inbnd] = 'N'  AND ([PickupId] = @PickupID OR [cmp_id] = @cmp_id) AND CONVERT(VARCHAR(10),[stp_schdtlatest],1) > { fn NOW() } - 4);";

            if(when === "tomorrow"){
                query += ` WHERE ((DATEPART(WEEKDAY, '${startDate}') = 7 AND '${startDate}' BETWEEN CONVERT(DATE, Load1) AND DATEADD(DAY, 2, CONVERT(DATE, Load2))) OR ('${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)))`;
                
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
            }
            else if(when === "today"){
                query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
            }
        }
        else{
            query = "SELECT [ord_hdrnumber] AS [ID], NULL AS [lift_num], [DispStatus] AS [status], [cmd_name] AS [product], IIF(([fgt_ordered_weight] = '1' AND [fgt_weightunit] = 'LBS') OR ([fgt_ordered_count] <> 0 AND CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit] = '1 LBS') OR ([fgt_ordered_count] = 0 AND [fgt_ordered_weight] = 0 AND [fgt_ordered_volume] = 0), 'FULL', IIF([fgt_ordered_count] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_count]) + ' ' + [fgt_countunit], IIF([fgt_ordered_weight] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_weight]) + ' ' + [fgt_weightunit], IIF([fgt_ordered_volume] <> 0, CONVERT(VARCHAR(10), [fgt_ordered_volume]) + ' ' + [Unit], '1 LOAD')))) AS [quantity], [PickupName] AS [originCompany], REPLACE([PickupCity], '/', '') AS [origin], [cmp_name] AS [cust_name], REPLACE([cty_nmstct], '/', '') AS [destinationCity], IIF(CONVERT(VARCHAR(10), [Load1], 1) = '01/01/50', 'OPEN', IIF([Load1] = [Load2], RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7), RIGHT(CONVERT(VARCHAR(30), [Load1], 100), 7) + ' - ' + RIGHT(CONVERT(VARCHAR(30), [Load2], 100), 7))) AS [loadTime], IIF(CONVERT(VARCHAR(10), [stp_schdtearliest], 1) = '01/01/50', 'OPEN', IIF([stp_schdtearliest] = [stp_schdtlatest], convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8), convert(varchar(10), [stp_schdtearliest], 1) + right(convert(varchar(32), [stp_schdtearliest], 100), 8) + ' - ' + convert(varchar(10), [stp_schdtlatest], 1) + right(convert(varchar(32), [stp_schdtlatest], 100), 8))) AS [delTime], IIF([Carrier] = 'UNKNOWN',IIF([Driver1Name] <>'UNKNOWN','FMCT','UNK'),[Carrier]) AS [carrier], [billTo] AS [bill_to], IIF([Driver1Name] = 'UNKNOWN','UNK',[Driver1Name]) AS [driver], IIF([Tractor] = 'UNKNOWN','UNK',[Tractor]) AS [truck], IIF([Trailer1] = 'UNKNOWN','UNK',[Trailer1]) AS [trailer], [PONum] AS [poNum], [DestPO] AS [destPONum], [RevType4] AS [pump], [ord_remark] AS [remarks] FROM [TMW_Live].[dbo].[RouteSheetView]";

            if(when === "tomorrow"){
                query += ` WHERE ((DATEPART(WEEKDAY, '${startDate}') = 7 AND '${startDate}' BETWEEN CONVERT(DATE, Load1) AND DATEADD(DAY, 2, CONVERT(DATE, Load2))) OR ('${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)))`;
                
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
            }
            else if(when === "today"){
                query += ` WHERE '${startDate}' BETWEEN CONVERT(DATE, Load1) AND CONVERT(DATE, Load2)`;
                if(how === "inbnd"){
                    query += " AND [WS_Inbnd] = 'Y'";
                }
                else if(how === "outbnd"){
                    query += " AND [WS_Inbnd] = 'N'";
                }
    
                query += " AND ([RevType2] = 'ASPH') AND CONVERT(varchar(10), [stp_schdtlatest], 1) > { fn NOW() } - 4 ORDER BY loadTime ASC;";
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

        const receivedArray = req.body;
        
        for (i=0; i< receivedArray.length;i++){
            loadDateQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].loadDate}'`;
            if(receivedArray[i].loadTime){
                loadTimeQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].loadTime}'`;
            }
            else{
                loadTimeQuery += ` WHEN '${receivedArray[i].id}' THEN NULL`;
            }
            delDateQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].delDate}'`;
            if(receivedArray[i].delTime){
                delTimeQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].delTime}'`;
            }
            else{
                delTimeQuery += ` WHEN '${receivedArray[i].id}' THEN NULL`;
            }

            // if the user is administrator or dispatch we need to account for the fact that they can edit quantity, bill_to, and product while other users can't
            if(receivedArray[i].quantity){
                quantityQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].quantity}'`;
                hasQuantity = true;
            }
            else{
                hasQuantity = false;
            }

            // if there's a quantity, then there definitely is a billTo and product since that's how the app is built. If something changes, this may need its own check.
            billToQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].billTo}'`;
            productQuery += ` WHEN '${receivedArray[i].id}' THEN '${receivedArray[i].product}'`;
            editorUsernameQuery += ` WHEN '${receivedArray[i].id}' THEN CONCAT(editor, '${receivedArray[i].username}')`;

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
                CASE ID
                    ${loadDateQuery}
                END,
            load_time = 
                CASE ID
                    ${loadTimeQuery}
                END,
            del_time = 
                CASE ID
                    ${delTimeQuery}
                END,
            del_date =
                CASE ID
                    ${delDateQuery}
                END,
            quantity =
                CASE ID
                    ${quantityQuery}
                END,
            bill_to =
                CASE ID
                    ${billToQuery}
                END,
            product =
                CASE ID
                    ${productQuery}
                END,
            editor =
                CASE ID
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
                CASE ID
                    ${loadDateQuery}
                END,
            load_time = 
                CASE ID
                    ${loadTimeQuery}
                END,
            del_time = 
                CASE ID
                    ${delTimeQuery}
                END,
            del_date =
                CASE ID
                    ${delDateQuery}
                END,
            editor =
                CASE ID
                    ${editorUsernameQuery}
                END
            WHERE ID IN (${queryEnd});
            `;
        }

        const response = await databaseQuery(query, localConfig);

        res.json(response);
    } catch (error) {
        console.error('Error updating record: ', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/delete-schedule', async (req,res) => {
    const id = req.body.number;

    const query = `DELETE FROM Main WHERE ID = '${id}';`;

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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
