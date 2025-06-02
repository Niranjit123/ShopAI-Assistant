// Language code mapping for IndicTrans2 (NLLB style)
// Supports 22 Indian languages + English
const LANGUAGE_MAPPING = {
  // English
  en: 'eng_Latn',
  english: 'eng_Latn',
  
  // Hindi
  hi: 'hin_Deva',
  hindi: 'hin_Deva',
  
  // Bengali
  bn: 'ben_Beng',
  bengali: 'ben_Beng',
  
  // Telugu
  te: 'tel_Telu',
  telugu: 'tel_Telu',
  
  // Marathi
  mr: 'mar_Deva',
  marathi: 'mar_Deva',
  
  // Tamil
  ta: 'tam_Taml',
  tamil: 'tam_Taml',
  
  // Urdu
  ur: 'urd_Arab',
  urdu: 'urd_Arab',
  
  // Gujarati
  gu: 'guj_Gujr',
  gujarati: 'guj_Gujr',
  
  // Kannada
  kn: 'kan_Knda',
  kannada: 'kan_Knda',
  
  // Malayalam
  ml: 'mal_Mlym',
  malayalam: 'mal_Mlym',
  
  // Oriya/Odia
  or: 'ory_Orya',
  oriya: 'ory_Orya',
  odia: 'ory_Orya',
  
  // Punjabi
  pa: 'pan_Guru',
  punjabi: 'pan_Guru',
  
  // Assamese
  as: 'asm_Beng',
  assamese: 'asm_Beng',
  
  // Manipuri/Meitei
  mni: 'mni_Beng',
  'mni-Mtei': 'mni_Mtei',
  'mni-Beng': 'mni_Beng',
  meitei: 'mni_Beng',
  manipuri: 'mni_Beng',
  
  // Bodo
  brx: 'brx_Deva',
  bodo: 'brx_Deva',
  
  // Dogri
  doi: 'doi_Deva',
  dogri: 'doi_Deva',
  
  // Kashmiri
  ks: 'kas_Arab',
  kashmiri: 'kas_Arab',
  
  // Konkani
  gom: 'gom_Deva',
  konkani: 'gom_Deva',
  
  // Maithili
  mai: 'mai_Deva',
  maithili: 'mai_Deva',
  
  // Nepali
  ne: 'npi_Deva',
  nepali: 'npi_Deva',
  
  // Sanskrit
  sa: 'san_Deva',
  sanskrit: 'san_Deva',
  
  // Santali
  sat: 'sat_Olck',
  santali: 'sat_Olck',
  
  // Sindhi
  sd: 'snd_Arab',
  sindhi: 'snd_Arab',
};

// Script ranges for language detection (expanded)
const SCRIPT_RANGES = {
  // Latin (English)
  eng_Latn: [[0x0041, 0x005A], [0x0061, 0x007A]],
  
  // Devanagari (Hindi, Marathi, Sanskrit, Nepali, etc.)
  hin_Deva: [[0x0900, 0x097F]], 
  mar_Deva: [[0x0900, 0x097F]],
  san_Deva: [[0x0900, 0x097F]],
  npi_Deva: [[0x0900, 0x097F]],
  mai_Deva: [[0x0900, 0x097F]],
  brx_Deva: [[0x0900, 0x097F]],
  doi_Deva: [[0x0900, 0x097F]],
  gom_Deva: [[0x0900, 0x097F]],
  
  // Bengali (Bengali, Assamese, Manipuri-Bengali)
  ben_Beng: [[0x0980, 0x09FF]],
  asm_Beng: [[0x0980, 0x09FF]],
  mni_Beng: [[0x0980, 0x09FF]],
  
  // Tamil
  tam_Taml: [[0x0B80, 0x0BFF]],
  
  // Telugu
  tel_Telu: [[0x0C00, 0x0C7F]],
  
  // Kannada
  kan_Knda: [[0x0C80, 0x0CFF]],
  
  // Malayalam
  mal_Mlym: [[0x0D00, 0x0D7F]],
  
  // Gujarati
  guj_Gujr: [[0x0A80, 0x0AFF]],
  
  // Gurmukhi (Punjabi)
  pan_Guru: [[0x0A00, 0x0A7F]],
  
  // Oriya
  ory_Orya: [[0x0B00, 0x0B7F]],
  
  // Arabic (Urdu, Kashmiri, Sindhi)
  urd_Arab: [[0x0600, 0x06FF], [0x0750, 0x077F]],
  kas_Arab: [[0x0600, 0x06FF], [0x0750, 0x077F]],
  snd_Arab: [[0x0600, 0x06FF], [0x0750, 0x077F]],
  
  // Meetei Mayek (Manipuri-Mtei)
  mni_Mtei: [[0xABC0, 0xABFF]],
  
  // Ol Chiki (Santali)
  sat_Olck: [[0x1C50, 0x1C7F]],
};

function detectLanguageByScript(text) {
  const scriptCounts = Object.fromEntries(
    Object.keys(SCRIPT_RANGES).map(script => [script, 0])
  );
  for (const char of text) {
    const charCode = char.charCodeAt(0);
    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [start, end] of ranges) {
        if (charCode >= start && charCode <= end) {
          scriptCounts[script]++;
          break;
        }
      }
    }
  }
  if (!Object.values(scriptCounts).some(count => count > 0)) {
    return 'eng_Latn';
  }
  let maxScript = 'eng_Latn';
  let maxCount = 0;
  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxScript = script;
      maxCount = count;
    }
  }
  return maxScript;
}

const translationCache = new Map();

export async function detectLanguage(text) {
  try {
    const detectedScript = detectLanguageByScript(text);
    console.log(`Detected script: ${detectedScript}`);
    
    // Return base language code based on script
    // For scripts used by multiple languages, we default to the most common one
    switch (detectedScript) {
      case 'eng_Latn': return 'en';
      
      // Devanagari - default to Hindi (most common)
      case 'hin_Deva':
      case 'mar_Deva':
      case 'san_Deva':
      case 'npi_Deva':
      case 'mai_Deva':
      case 'brx_Deva':
      case 'doi_Deva':
      case 'gom_Deva':
        return 'hi'; // Default to Hindi for Devanagari
      
      // Bengali script
      case 'ben_Beng': return 'bn';
      case 'asm_Beng': return 'as';
      case 'mni_Beng': return 'mni-Beng';
      
      // Other scripts
      case 'tam_Taml': return 'ta';
      case 'tel_Telu': return 'te';
      case 'kan_Knda': return 'kn';
      case 'mal_Mlym': return 'ml';
      case 'guj_Gujr': return 'gu';
      case 'pan_Guru': return 'pa';
      case 'ory_Orya': return 'or';
      case 'mni_Mtei': return 'mni-Mtei';
      case 'sat_Olck': return 'sat';
      
      // Arabic script - default to Urdu
      case 'urd_Arab':
      case 'kas_Arab':
      case 'snd_Arab':
        return 'ur'; // Default to Urdu for Arabic script
      
      default: return 'en';
    }
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

async function callIndicTransAPI({ text, sourceLang, targetLang, direction }) {
  // direction: 'en2indic' or 'indic2en'
  const url = direction === 'en2indic'
    ? 'https://indictrans-translate-289528240346.us-central1.run.app/translate'
    : 'https://indictrans-indic-translate-289528240346.us-central1.run.app/translate';
  
  try {
    console.log(`Calling IndicTrans API: ${direction} | ${sourceLang} -> ${targetLang} | Text: "${text}"`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`IndicTrans API error: ${response.status} ${errText}`);
      throw new Error(`IndicTrans API error: ${response.status} ${errText}`);
    }
    
    const data = await response.json();
    console.log(`IndicTrans API response:`, data);
    
    // API returns { "translation": "..." } or { "text": "..." }
    return data.translation || data.text || text;
  } catch (error) {
    console.error('IndicTrans translation error:', error);
    return text;
  }
}

// Function to split text into chunks while preserving sentence boundaries
function splitTextIntoChunks(text, maxChunkSize = 500) {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  const sentences = text.split(/(?<=[.!?।॥])\s+/); // Split by sentence endings (including Devanagari)
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length > maxChunkSize) {
      // If we have content in current chunk, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Single sentence is too long, split by words
        const words = sentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk.length + word.length > maxChunkSize) {
            if (wordChunk.trim()) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              // Single word is too long, force split
              chunks.push(word);
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        
        if (wordChunk.trim()) {
          currentChunk = wordChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

export async function translateText(text, sourceLang, targetLang) {
  // Skip translation if source and target are the same
  if (sourceLang === targetLang) {
    console.log(`Source and target languages are the same (${sourceLang}), skipping translation`);
    return text;
  }

  const cacheKey = `${text}_${sourceLang}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    console.log(`Using cached translation for: ${text.substring(0, 50)}...`);
    return translationCache.get(cacheKey);
  }

  // Map to NLLB/IndicTrans2 codes
  const nllbSource = LANGUAGE_MAPPING[sourceLang] || sourceLang;
  const nllbTarget = LANGUAGE_MAPPING[targetLang] || targetLang;

  console.log(`Translation request: ${sourceLang} (${nllbSource}) -> ${targetLang} (${nllbTarget})`);
  console.log(`Text length: ${text.length} characters`);

  // Decide which API to use based on the target language
  let direction;
  if (nllbTarget === 'eng_Latn') {
    // Translating TO English (indic2en)
    direction = 'indic2en';
  } else if (nllbSource === 'eng_Latn') {
    // Translating FROM English (en2indic)
    direction = 'en2indic';
  } else {
    // Indic to Indic translation not directly supported
    console.log('Indic to Indic translation not supported, fallback to original text');
    translationCache.set(cacheKey, text);
    return text;
  }

  // Split text into chunks if it's too long
  const chunks = splitTextIntoChunks(text, 400); // Conservative limit
  console.log(`Split text into ${chunks.length} chunks`);

  if (chunks.length === 1) {
    // Single chunk - translate normally
    const translated = await callIndicTransAPI({
      text,
      sourceLang: nllbSource,
      targetLang: nllbTarget,
      direction,
    });
    
    console.log(`Translation result: "${text.substring(0, 50)}..." -> "${translated.substring(0, 50)}..."`);
    translationCache.set(cacheKey, translated);
    return translated;
  } else {
    // Multiple chunks - translate each and combine
    console.log(`Translating ${chunks.length} chunks...`);
    const translatedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Translating chunk ${i + 1}/${chunks.length}: "${chunks[i].substring(0, 30)}..."`);
      
      const translatedChunk = await callIndicTransAPI({
        text: chunks[i],
        sourceLang: nllbSource,
        targetLang: nllbTarget,
        direction,
      });
      
      translatedChunks.push(translatedChunk);
      
      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const finalTranslation = translatedChunks.join(' ');
    console.log(`Combined translation complete. Length: ${finalTranslation.length} characters`);
    
    translationCache.set(cacheKey, finalTranslation);
    return finalTranslation;
  }
}

export async function translateResponse(response, targetLang) {
  // If response has content and it's not in target language
  if (response?.content && targetLang !== 'en') {
    // Detect original language (should be English)
    const originalLang = await detectLanguage(response.content);
    
    // Only translate if it's not already in target language
    if (originalLang !== targetLang) {
      response.content = await translateText(response.content, originalLang, targetLang);
    }
  }
  return response;
}