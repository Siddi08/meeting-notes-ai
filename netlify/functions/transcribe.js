const OpenAI = require('openai');
const { Readable } = require('stream');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  console.log('Function called, method:', event.httpMethod);
  console.log('Has body:', !!event.body);
  
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

  try {
    // Check if body exists
    if (!event.body) {
      console.error('No body received');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'No request body received'
        })
      };
    }

    console.log('Parsing body...');
    const { audioBase64, fileName } = JSON.parse(event.body);
    
    console.log('File name:', fileName);
    console.log('Audio data length:', audioBase64 ? audioBase64.length : 0);

    if (!audioBase64 || !fileName) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Missing audioBase64 or fileName'
        })
      };
    }
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log('Buffer size:', audioBuffer.length);
    
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

    // Create a readable stream from buffer
    const audioStream = Readable.from(audioBuffer);
    audioStream.path = fileName;

    console.log('Calling Whisper API...');
    
    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
    });

    console.log('Transcription successful');

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
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
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