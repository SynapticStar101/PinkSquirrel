const https = require('https');

module.exports = async function (context, req) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'no_api_key',
                message: 'ANTHROPIC_API_KEY is not set. Add it in Azure Portal > Static Web App > Environment variables.'
            })
        };
        return;
    }

    const image = req.body && req.body.image;
    const mediaType = (req.body && req.body.mediaType) || 'image/jpeg';

    if (!image) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'no_image', message: 'No image data provided.' })
        };
        return;
    }

    try {
        const text = await callClaudeVision(apiKey, image, mediaType);
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        };
    } catch (err) {
        context.log.error('Claude Vision API error:', err.message);
        context.res = {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'api_error',
                message: err.message || 'Failed to process image with AI. Try again or check your API key.'
            })
        };
    }
};

function callClaudeVision(apiKey, imageBase64, mediaType) {
    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: imageBase64
                        }
                    },
                    {
                        type: 'text',
                        text: 'Read all the handwritten text in this image. Return ONLY the raw text content you can see, with each distinct line or item on its own line. Rules:\n- Output just the text as written, nothing else\n- Each separate line of handwriting should be on its own line\n- Do not add numbering, bullet points, or any formatting\n- Do not add commentary, explanations, or headers\n- If you cannot read a word clearly, make your best guess'
                    }
                ]
            }]
        });

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const request = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        const errMsg = response.error?.message || 'API request failed (status ' + res.statusCode + ')';
                        reject(new Error(errMsg));
                        return;
                    }
                    const text = (response.content && response.content[0] && response.content[0].text) || '';
                    resolve(text);
                } catch (e) {
                    reject(new Error('Failed to parse API response'));
                }
            });
        });

        request.on('error', (err) => {
            reject(new Error('Network error calling AI service: ' + err.message));
        });

        request.write(requestBody);
        request.end();
    });
}
