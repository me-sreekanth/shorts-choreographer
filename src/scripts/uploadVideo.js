const http = require('http');
const url = require('url');
const readline = require('readline');
const destroyer = require('server-destroy');
const { google } = require('googleapis');

// Load client secrets from a local file
const credentials = require('../../youtube-web.json');

const { client_secret, client_id, redirect_uris } = credentials.web;
const oauth2Client = new google.auth.OAuth2(
  client_id, client_secret, redirect_uris[0]
);

// Generate a URL for the user to visit to authenticate
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube']
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      return;
    }
    console.log('Access Token:', token.access_token);
    console.log('Refresh Token:', token.refresh_token);
    // Store the refresh token in your environment variables or a secure place
  });
});

// Create a local server to listen for the OAuth2 callback
const server = http.createServer(async (req, res) => {
    try {
      if (req.url.indexOf('/oauth2callback') > -1) {
        const qs = new url.URL(req.url, 'http://localhost:8080').searchParams;
        res.end('Authentication successful! Please return to the console.');
        server.destroy();
  
        const { tokens } = await oauth2Client.getToken(qs.get('code'));
        oauth2Client.setCredentials(tokens);
  
        // Here, tokens are available for use in your application
        console.log('Tokens:', tokens);
      }
    } catch (e) {
      res.end(`Error: ${e}`);
    }
  });
  
  server.listen(8080, () => {
    // Open the browser to the authorize url to start the authentication process
    startProcess().catch(console.error);
  });
  
  const startProcess = async () => {
    const open = (await import('open')).default;
  
    open(oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/youtube']
      }));
  };
  
  // Destroy the server once we're done
  destroyer(server);