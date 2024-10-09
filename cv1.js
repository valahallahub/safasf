const express = require('express');
const axios = require('axios');
const fs = require('fs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path'); // สำหรับการส่งไฟล์ HTML
const app = express();
const port = 80;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

let loggedInUsers = {};

// ข้อมูลล็อกอิน
const loginCredentials = {
  username: 'milo',  // เปลี่ยน username และ password ที่ต้องการ
  password: '!phumiphat13045312'
};

// หน้า login
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f4f8;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .login-container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            width: 350px;
            text-align: center;
          }
          h2 {
            margin-bottom: 20px;
            color: #333;
          }
          label {
            display: block;
            text-align: left;
            margin-bottom: 5px;
            color: #555;
          }
          input[type="text"],
          input[type="password"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 16px;
          }
          button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 5px;
            width: 100%;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }
          button:hover {
            background-color: #218838;
          }
          .error {
            color: red;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h2>Login</h2>
          <form method="POST" action="/login">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required>
            
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
            
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  `);
});


// ดำเนินการ login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === loginCredentials.username && password === loginCredentials.password) {
    const sessionId = new Date().getTime().toString();
    loggedInUsers[sessionId] = true;
    res.cookie('sessionId', sessionId);
    res.redirect('/addkey/index.html'); // เปลี่ยนไปที่หน้า index.html เพื่อให้สร้างคีย์
  } else {
    res.send('Invalid login credentials');
  }
});

// Middleware ตรวจสอบการล็อกอิน
app.use('/addkey', (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (loggedInUsers[sessionId]) {
    next(); // ถ้าล็อกอินแล้ว ให้ผ่านไปยังการสร้างคีย์หรือไปที่หน้า index.html ได้
  } else {
    res.redirect('/login'); // ถ้าไม่ได้ล็อกอิน จะเปลี่ยนไปที่หน้า login
  }
});

// หน้า index สำหรับกรอก key และ usageLimit
app.get('/addkey/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // ส่งไฟล์ HTML สำหรับสร้างคีย์
});

// Utility function เพื่ออ่าน API keys จากไฟล์
const getApiKeys = () => {
  try {
    const data = fs.readFileSync('key.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading key.json:', error.message);
    return [];
  }
};

// Utility function เพื่อบันทึก API keys ลงในไฟล์
const saveApiKeys = (apiKeys) => {
  try {
    fs.writeFileSync('key.json', JSON.stringify(apiKeys, null, 2));
    console.log('Successfully saved API keys to key.json');
  } catch (error) {
    console.error('Error saving to key.json:', error.message);
  }
};

// Middleware to check API key and usage limit
app.use((req, res, next) => {
  // Skip API key check for the /addkey endpoint
  if (req.path.startsWith('/addkey')) {
    return next();
  }

  const apiKey = req.query.apiKey || req.headers['x-api-key'];
  if (!apiKey) return res.status(403).send('Forbidden: Missing API Key');

  const apiKeys = getApiKeys();
  const key = apiKeys.find(k => k.key === apiKey);
  if (key && key.usageLeft > 0) {
    key.usageLeft -= 1;
    saveApiKeys(apiKeys);
    next();
  } else {
    res.status(403).send('Forbidden: Invalid or exhausted API Key');
  }
});

// Endpoint เพื่อสร้าง API key โดยใช้ path parameters
app.get('/addkey/:key/:usageLimit', (req, res) => {
  const { key, usageLimit } = req.params;
  if (!key || isNaN(usageLimit)) return res.status(400).send('Invalid key or usage limit');

  const apiKeys = getApiKeys();
  apiKeys.push({ key, usageLeft: parseInt(usageLimit, 10) });
  saveApiKeys(apiKeys);
  res.send(`API key: ${key} with usage limit: ${usageLimit} created successfully.`);
});

app.get('/', async (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.status(400).send('Missing phone query parameter');

  // Check blocked phone numbers
  const blockedPhones = ['0624409541', '0643216386'];
  if (blockedPhones.includes(phone)) {
    fs.appendFileSync('logna.txt', `Phone: ${phone} - Blocked\n`);
    return res.json({ code: 1, message: 'success', tid: '66ba3a07e33c3e320e3ceac6', data: [] });
  }

  const url = `https://api.flashexpress.com/api/courier/v1/address/${phone}?isSrcAddress=true`;
  const headers = {
    'X-FLE-SESSION-ID': '1727978761_54c251c40b381c0073d20d0e11a1379181a38b686be4f16385a9b0744c676ac2_684115',
    'Accept': 'application/json',
    'User-Agent': 'appName/FlashHome appVersion/1.15.13 innerVersion/22621.2715 language/th-TH resolution/15361964 64bit/True time_zone/07%3a00%3a00 UUID user/hmachine/idotnet_version/4.8 fullName/Microsoft+Windows+11',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'Keep-Alive'
  };

  try {
    const response = await axios.get(url, { headers });
    fs.appendFileSync('logna.txt', `Phone: ${phone} - Response: ${JSON.stringify(response.data)}\n`);
    res.json(response.data);
  } catch (error) {
    fs.appendFileSync('logna.txt', `Phone: ${phone} - Error: ${error.message}\n`);
    res.status(error.response ? error.response.status : 500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});
