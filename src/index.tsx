import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
  GOOGLE_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// ==================== API Routes ====================

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// -------------------- User Management --------------------
// Get all users
app.get('/api/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users ORDER BY created_at DESC'
    ).all()
    return c.json({ success: true, users: results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create new user
app.post('/api/users', async (c) => {
  try {
    const { username, age, gender } = await c.req.json()
    
    // Generate unique ID
    const userId = crypto.randomUUID()
    
    const result = await c.env.DB.prepare(
      'INSERT INTO users (id, username, age, gender) VALUES (?, ?, ?, ?)'
    ).bind(userId, username, age, gender).run()
    
    return c.json({ 
      success: true, 
      user: { id: userId, username, age, gender }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// -------------------- Target Sentences Management --------------------
// Get all target sentences
app.get('/api/sentences', async (c) => {
  try {
    const type = c.req.query('type') // 'sentence' or 'word'
    const level = c.req.query('level')
    const setNumber = c.req.query('set')
    
    let query = 'SELECT * FROM target_sentences WHERE 1=1'
    const params = []
    
    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }
    if (level) {
      query += ' AND level = ?'
      params.push(level)
    }
    if (setNumber) {
      query += ' AND set_number = ?'
      params.push(setNumber)
    }
    
    query += ' ORDER BY level ASC, set_number ASC, created_at DESC'
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all()
    
    return c.json({ success: true, sentences: results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create new target sentence
app.post('/api/sentences', async (c) => {
  try {
    const { content, type = 'sentence', level = 'B', set_number = 1, expected_variations } = await c.req.json()
    
    const variations = expected_variations ? JSON.stringify(expected_variations) : '[]'
    
    const result = await c.env.DB.prepare(
      'INSERT INTO target_sentences (content, type, level, set_number, expected_variations) VALUES (?, ?, ?, ?, ?)'
    ).bind(content, type, level, set_number, variations).run()
    
    return c.json({ 
      success: true, 
      sentence: { 
        id: result.meta.last_row_id, 
        content, 
        type, 
        level,
        set_number,
        expected_variations: variations
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete target sentence
app.delete('/api/sentences/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(
      'DELETE FROM target_sentences WHERE id = ?'
    ).bind(id).run()
    
    return c.json({ success: true, message: 'Sentence deleted successfully' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// -------------------- Google Speech-to-Text Integration --------------------
app.post('/api/speech-to-text', async (c) => {
  try {
    const formData = await c.req.formData()
    const audioFile = formData.get('audio') as File
    const userId = formData.get('userId') as string
    const targetSentenceId = formData.get('targetSentenceId') as string
    const language = formData.get('language') as string || 'en-US'
    const model = formData.get('model') as string || 'latest_long'
    const punctuation = formData.get('punctuation') !== 'false'
    const enhanced = formData.get('enhanced') !== 'false'

    console.log('Speech-to-text request received:', {
      userId,
      targetSentenceId,
      language,
      audioSize: audioFile?.size
    })

    if (!audioFile) {
      return c.json({ success: false, error: 'No audio file provided' }, 400)
    }

    // Get target sentence
    const targetResult = await c.env.DB.prepare(
      'SELECT content FROM target_sentences WHERE id = ?'
    ).bind(targetSentenceId).first()
    
    if (!targetResult) {
      return c.json({ success: false, error: 'Target sentence not found' }, 404)
    }

    const targetText = targetResult.content as string

    // Convert audio to base64
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    // Call Google Speech-to-Text API
    console.log('Checking API keys:', {
      cloudflare_env: !!c.env.GOOGLE_API_KEY,
      process_env: !!process.env.GOOGLE_API_KEY,
      env_keys: Object.keys(process.env || {}).filter(k => k.includes('GOOGLE'))
    })
    
    const apiKey = c.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      console.error('Google API key is not configured. Available env vars:', Object.keys(process.env || {}))
      return c.json({ success: false, error: 'Google API key is not configured' }, 500)
    }
    
    console.log('Google API Key configured successfully')
    console.log('Audio base64 length:', audioBase64.length)
    
    const startTime = Date.now()
    
    // Try with AUTO encoding detection for better compatibility
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',  // WebM audio codec used by browsers
            languageCode: language,
            enableAutomaticPunctuation: punctuation,
            enableWordTimeOffsets: false,
            model: model,  // User-selected model
            useEnhanced: enhanced,  // Use enhanced model if selected
            maxAlternatives: 3
          },
          audio: {
            content: audioBase64
          }
        })
      }
    )
    
    console.log('Google API Response status:', response.status)

    const processingTime = Date.now() - startTime
    const sttResult = await response.json() as any
    
    console.log('Google API Result:', JSON.stringify(sttResult, null, 2))

    // Check for API errors
    if (sttResult.error) {
      console.error('Google API Error:', sttResult.error)
      return c.json({ 
        success: false, 
        error: `Google API Error: ${sttResult.error.message || 'Unknown error'}`,
        details: sttResult.error
      }, 400)
    }

    // Parse STT results
    let recognizedText = ''
    let confidence = 0
    let alternatives = []

    if (sttResult.results && sttResult.results.length > 0) {
      const firstResult = sttResult.results[0]
      if (firstResult.alternatives && firstResult.alternatives.length > 0) {
        recognizedText = firstResult.alternatives[0].transcript || ''
        confidence = firstResult.alternatives[0].confidence || 0
        alternatives = firstResult.alternatives.slice(1).map((alt: any) => ({
          text: alt.transcript,
          confidence: alt.confidence
        }))
      }
    } else {
      console.log('No recognition results returned from Google API')
    }

    // Check if recognition is correct (normalize both strings)
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .replace(/[.,!?;:'"]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    const isCorrect = normalizeText(recognizedText) === normalizeText(targetText)
    console.log('Comparison:', {
      original: targetText,
      recognized: recognizedText,
      normalizedOriginal: normalizeText(targetText),
      normalizedRecognized: normalizeText(recognizedText),
      isCorrect
    })

    // Create session
    const sessionId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO recognition_sessions (id, user_id, target_sentence_id, audio_duration, stt_model, stt_language) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(sessionId, userId, targetSentenceId, audioFile.size / 1000, 'google', language).run()

    // Save result
    await c.env.DB.prepare(
      'INSERT INTO recognition_results (session_id, target_text, recognized_text, confidence_score, is_correct, alternatives, processing_time) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      sessionId,
      targetText,
      recognizedText,
      confidence,
      isCorrect ? 1 : 0,
      JSON.stringify(alternatives),
      processingTime
    ).run()

    return c.json({
      success: true,
      result: {
        sessionId,
        targetText,
        recognizedText,
        confidence,
        isCorrect,
        alternatives,
        processingTime
      }
    })
  } catch (error) {
    console.error('Speech-to-text error:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// -------------------- Web Speech API Integration --------------------
app.post('/api/speech-to-text/web', async (c) => {
  try {
    const { userId, targetSentenceId, recognizedText, confidence, alternatives, targetText } = await c.req.json()
    
    // Check if recognition is correct (normalize both strings)
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .replace(/[.,!?;:'"]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    const isCorrect = normalizeText(recognizedText) === normalizeText(targetText)
    console.log('Comparison:', {
      original: targetText,
      recognized: recognizedText,
      normalizedOriginal: normalizeText(targetText),
      normalizedRecognized: normalizeText(recognizedText),
      isCorrect
    })
    
    // Create session
    const sessionId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO recognition_sessions (id, user_id, target_sentence_id, audio_duration, stt_model, stt_language) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(sessionId, userId, targetSentenceId, 0, 'web-speech-api', 'en-US').run()
    
    // Save result
    await c.env.DB.prepare(
      'INSERT INTO recognition_results (session_id, target_text, recognized_text, confidence_score, is_correct, alternatives, processing_time) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      sessionId,
      targetText,
      recognizedText,
      confidence,
      isCorrect ? 1 : 0,
      JSON.stringify(alternatives || []),
      0
    ).run()
    
    return c.json({
      success: true,
      result: {
        sessionId,
        targetText,
        recognizedText,
        confidence,
        isCorrect,
        alternatives,
        processingTime: 0
      }
    })
  } catch (error) {
    console.error('Web Speech API save error:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// -------------------- Recognition Results & Statistics --------------------
// Get recognition results
app.get('/api/results', async (c) => {
  try {
    const userId = c.req.query('userId')
    const sentenceId = c.req.query('sentenceId')
    const limit = parseInt(c.req.query('limit') || '100')
    
    let query = `
      SELECT 
        rr.*,
        rs.user_id,
        rs.target_sentence_id,
        rs.session_date,
        u.username,
        ts.content as sentence_content,
        ts.type as sentence_type
      FROM recognition_results rr
      JOIN recognition_sessions rs ON rr.session_id = rs.id
      LEFT JOIN users u ON rs.user_id = u.id
      LEFT JOIN target_sentences ts ON rs.target_sentence_id = ts.id
      WHERE 1=1
    `
    const params = []
    
    if (userId) {
      query += ' AND rs.user_id = ?'
      params.push(userId)
    }
    if (sentenceId) {
      query += ' AND rs.target_sentence_id = ?'
      params.push(sentenceId)
    }
    
    query += ' ORDER BY rr.created_at DESC LIMIT ?'
    params.push(limit)
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ success: true, results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get statistics
app.get('/api/stats', async (c) => {
  try {
    const groupBy = c.req.query('groupBy') || 'sentence' // sentence, user, hour
    
    let query = ''
    
    if (groupBy === 'sentence') {
      query = `
        SELECT 
          ts.id,
          ts.content,
          ts.type,
          ts.level,
          ts.set_number,
          COUNT(DISTINCT rs.id) as total_attempts,
          SUM(CASE WHEN rr.is_correct THEN 1 ELSE 0 END) as correct_count,
          AVG(CASE WHEN rr.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(rr.confidence_score) as avg_confidence,
          COUNT(DISTINCT rs.user_id) as user_count
        FROM target_sentences ts
        LEFT JOIN recognition_sessions rs ON ts.id = rs.target_sentence_id
        LEFT JOIN recognition_results rr ON rs.id = rr.session_id
        GROUP BY ts.id
        ORDER BY accuracy_rate DESC
      `
    } else if (groupBy === 'user') {
      query = `
        SELECT 
          u.id,
          u.username,
          u.age,
          u.gender,
          COUNT(DISTINCT rs.id) as total_attempts,
          SUM(CASE WHEN rr.is_correct THEN 1 ELSE 0 END) as correct_count,
          AVG(CASE WHEN rr.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(rr.confidence_score) as avg_confidence
        FROM users u
        LEFT JOIN recognition_sessions rs ON u.id = rs.user_id
        LEFT JOIN recognition_results rr ON rs.id = rr.session_id
        GROUP BY u.id
        ORDER BY accuracy_rate DESC
      `
    } else if (groupBy === 'hour') {
      query = `
        SELECT 
          strftime('%H', rs.session_date) as hour,
          COUNT(DISTINCT rs.id) as total_attempts,
          SUM(CASE WHEN rr.is_correct THEN 1 ELSE 0 END) as correct_count,
          AVG(CASE WHEN rr.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(rr.confidence_score) as avg_confidence
        FROM recognition_sessions rs
        LEFT JOIN recognition_results rr ON rs.id = rr.session_id
        GROUP BY hour
        ORDER BY hour
      `
    }
    
    const { results } = await c.env.DB.prepare(query).all()
    
    return c.json({ success: true, stats: results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// -------------------- CSV Export --------------------
app.get('/api/export/csv', async (c) => {
  try {
    const type = c.req.query('type') || 'results' // results or stats
    
    let data = []
    let csvContent = ''
    
    if (type === 'results') {
      const { results } = await c.env.DB.prepare(`
        SELECT 
          rr.created_at,
          u.username,
          u.age,
          u.gender,
          ts.content as target_text,
          rr.recognized_text,
          rr.confidence_score,
          rr.is_correct,
          rr.processing_time
        FROM recognition_results rr
        JOIN recognition_sessions rs ON rr.session_id = rs.id
        LEFT JOIN users u ON rs.user_id = u.id
        LEFT JOIN target_sentences ts ON rs.target_sentence_id = ts.id
        ORDER BY rr.created_at DESC
      `).all()
      
      // Create CSV header
      csvContent = 'Timestamp,Username,Age,Gender,Target Text,Recognized Text,Confidence,Is Correct,Processing Time (ms)\n'
      
      // Add data rows
      results.forEach((row: any) => {
        csvContent += `"${row.created_at}","${row.username || ''}",${row.age || ''},"${row.gender || ''}","${row.target_text}","${row.recognized_text}",${row.confidence_score},${row.is_correct},${row.processing_time}\n`
      })
    } else if (type === 'stats') {
      const { results } = await c.env.DB.prepare(`
        SELECT 
          ts.content,
          ts.type,
          ts.level,
          ts.set_number,
          COUNT(DISTINCT rs.id) as total_attempts,
          SUM(CASE WHEN rr.is_correct THEN 1 ELSE 0 END) as correct_count,
          AVG(CASE WHEN rr.is_correct THEN 1.0 ELSE 0.0 END) as accuracy_rate,
          AVG(rr.confidence_score) as avg_confidence,
          ts.expected_variations
        FROM target_sentences ts
        LEFT JOIN recognition_sessions rs ON ts.id = rs.target_sentence_id
        LEFT JOIN recognition_results rr ON rs.id = rr.session_id
        GROUP BY ts.id
      `).all()
      
      // Create CSV header
      csvContent = 'Content,Type,Level,Set,Total Attempts,Correct Count,Accuracy Rate,Avg Confidence,Expected Variations\n'
      
      // Add data rows
      results.forEach((row: any) => {
        csvContent += `"${row.content}","${row.type}","${row.level || ''}",${row.set_number || ''},${row.total_attempts || 0},${row.correct_count || 0},${row.accuracy_rate || 0},${row.avg_confidence || 0},"${row.expected_variations || '[]'}"\n`
      })
    }
    
    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stt-data-${type}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})



// Default route - serve main HTML page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>구글 음성인식 테스터 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app