const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
    console.log('Function called, method:', event.httpMethod);
    
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse body - handle both string and already-parsed object
        let body;
        if (typeof event.body === 'string') {
            console.log('Body is string, parsing...');
            body = JSON.parse(event.body);
        } else {
            console.log('Body already parsed');
            body = event.body;
        }

        const { audioBase64, fileName } = body;

        if (!audioBase64) {
            console.error('No audioBase64 in body');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No audio data provided' })
            };
        }

        console.log('Received audio file:', fileName);
        console.log('Base64 length:', audioBase64.length);

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        console.log('Buffer size:', audioBuffer.length, 'bytes');

        // Create form data for Whisper API
        const formData = new FormData();
        formData.append('file', audioBuffer, {
            filename: fileName || 'audio.mp3',
            contentType: 'audio/mpeg'
        });
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'text');

        console.log('Calling Whisper API...');

        // Call OpenAI Whisper API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whisper API error:', errorText);
            throw new Error(`Whisper API failed: ${response.status} ${errorText}`);
        }

        const transcript = await response.text();
        console.log('Transcription successful, length:', transcript.length);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcript,
                length: transcript.length
            })
        };

    } catch (error) {
        console.error('Transcription error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                details: 'Check function logs for more info'
            })
        };
    }
};