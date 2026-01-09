const OpenAI = require('openai');
const { Readable } = require('stream');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  console.log('Function called, method:', event.httpMethod);
  
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    console.error('Wrong method:', event.httpMethod);
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
    
    // Determine file type from filename
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'webm': 'audio/webm'
    };
    const mimeType = mimeTypes[fileExtension] || 'audio/mpeg';
    console.log('Detected mime type:', mimeType);

    // Create a readable stream from buffer
    const audioStream = Readable.from(audioBuffer);
    audioStream.path = fileName; // OpenAI needs a path property

    console.log('Calling Whisper API...');

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
    });

    console.log('Transcription successful, length:', transcription.text.length);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        transcript: transcription.text 
      })
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        details: error.toString()
      })
    };
  }
};